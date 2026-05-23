import { connectToDatabase } from '@/lib/db/mongoose';
import { Appointment, IAppointment } from '../db/models/Appointment';
import { Employee, IEmployee } from '../db/models/Employee';
import { Route } from '../db/models/Route';
import { Cluster } from '../db/models/Cluster';
import { Clinic } from '../db/models/Clinic';
import { Assignment } from '../db/models/Assignment';
import { getRoadRoute, getRoadDistance } from '../osrm/client';
import { timeToMinutes, minutesToTime } from './slotSuggestor';
import { haversineDistanceMeters } from './clusterEngine';

// Travel time calculation: distance in km * 3 (minutes per km, ~20 km/h average)
const MINUTES_PER_KM = 3;
const TRAVEL_FEASIBILITY_BUFFER = 15; // minutes grace period

export interface EmployeeSheetAppt {
  appointmentId: string;
  time: string;
  clinicName: string;
  clusterName: string;
  address: string;
  lat: number;
  lng: number;
  travelFromPrevious: string;
  idleGap: string | null;
}

export interface EmployeeSheet {
  employee: { id: string; name: string };
  route: { id: string; name: string; color: string } | null;
  appointments: EmployeeSheetAppt[];
  warnings: string[];
}

export interface AssignmentPreviewResult {
  date: string;
  employeeSheets: EmployeeSheet[];
  unassigned: { appointmentId: string; clinicName: string; slot: string }[];
  totalWarnings: number;
}

// Helper: Check if technician can travel from one cluster to another in time
async function canTravelBetweenClusters(
  fromCluster: any,
  toCluster: any,
  fromAppt: any,
  toApptSlotMins: number
): Promise<boolean> {
  // Allow zero travel time for sibling subclusters (share same parent)
  if (fromCluster.parentCluster && toCluster.parentCluster && fromCluster.parentCluster.toString() === toCluster.parentCluster.toString()) {
    return true;
  }
  let feasible = true;
  try {
    const distKm = haversineDistanceMeters(
      fromCluster.centroidLat, fromCluster.centroidLng,
      toCluster.centroidLat, toCluster.centroidLng
    ) / 1000; // convert to km

    const travelMins = Math.round(distKm * MINUTES_PER_KM);
    const fromApptEndMins = timeToMinutes(fromAppt.slotTime) + fromAppt.durationMins;
    const earliestArrivalMins = fromApptEndMins + travelMins;

    // Can arrive by target slot with buffer?
    feasible = earliestArrivalMins <= toApptSlotMins + TRAVEL_FEASIBILITY_BUFFER;
  } catch (e) {
    // If distance calc fails, assume feasible (error on side of permissiveness)
    feasible = true;
  }
  return feasible;
}

// Helper: Validate entire schedule for an employee is feasible (consecutive appointments reachable)
async function isScheduleFeasible(
  employeeAppointments: any[]
): Promise<boolean> {
  if (employeeAppointments.length <= 1) return true;

  const sorted = [...employeeAppointments].sort((a, b) => 
    timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime)
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevClinic = prev.clinicId as any;
    const currClinic = curr.clinicId as any;

    if (prevClinic?.clusterId && currClinic?.clusterId) {
      const canReach = await canTravelBetweenClusters(
        prevClinic.clusterId,
        currClinic.clusterId,
        prev,
        timeToMinutes(curr.slotTime)
      );
      if (!canReach) {
        return false;
      }
    }
  }
  return true;
}

// Main function to run the End-of-Day Assignment Engine
export async function computeDailyAssignments(
  date: string,
  persist: boolean = false
): Promise<AssignmentPreviewResult> {
  await connectToDatabase();

  // Step 1: Load and Group Data
  const appointments = await Appointment.find({
    date,
    status: { $in: ['CONFIRMED', 'ASSIGNED'] }
  }).populate({
    path: 'clinicId',
    populate: { path: 'clusterId' }
  }).populate('scanTypeId');

  const activeEmployees = await Employee.find({ isActive: true });
  if (activeEmployees.length === 0) {
    throw new Error('No active employees found to assign.');
  }

  // Initialize employee assignments
  const employeeAssignments: Record<string, any[]> = {};
  const employeeRoutes: Record<string, string> = {};
  for (const emp of activeEmployees) {
    employeeAssignments[emp._id.toString()] = [];
  }

  // Step 2: Group appointments by route, then by cluster
  const routeGroups: Record<string, any[]> = {};
  const unroutedAppointments: any[] = [];

  for (const appt of appointments) {
    const clinic = appt.clinicId as any;
    const cluster = clinic?.clusterId;
    
    if (cluster && cluster.routeIds && cluster.routeIds.length > 0) {
      const rId = cluster.routeIds[0].toString();
      if (!routeGroups[rId]) {
        routeGroups[rId] = [];
      }
      routeGroups[rId].push(appt);
    } else {
      unroutedAppointments.push(appt);
    }
  }

  // Sort appointments within each route by time
  for (const rId of Object.keys(routeGroups)) {
    routeGroups[rId].sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));
  }

  // Step 3: Detect dense clusters (3+ consecutive bookings) and assign dedicated employees
  const denseClustersAppts = new Set<string>();
  const dedicatedEmployeeForCluster: Record<string, string> = {};

  const allClusters = await Cluster.find();
  for (const route of Object.values(routeGroups)) {
    // Group route appointments by cluster
    const clusterGroups: Record<string, any[]> = {};
    for (const appt of route) {
      const clinic = appt.clinicId as any;
      const cluster = clinic?.clusterId;
      const clusterId = cluster?._id?.toString();
      
      if (clusterId) {
        if (!clusterGroups[clusterId]) {
          clusterGroups[clusterId] = [];
        }
        clusterGroups[clusterId].push(appt);
      }
    }

    // Detect consecutive bookings in each cluster
    for (const clusterId of Object.keys(clusterGroups)) {
      const clusterAppts = clusterGroups[clusterId];
      clusterAppts.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));

      // Find consecutive blocks (1-hour gaps = consecutive)
      let currentBlock: any[] = [];
      for (let i = 0; i < clusterAppts.length; i++) {
        if (currentBlock.length === 0) {
          currentBlock.push(clusterAppts[i]);
        } else {
          const prevMins = timeToMinutes(currentBlock[currentBlock.length - 1].slotTime);
          const currMins = timeToMinutes(clusterAppts[i].slotTime);

          if (currMins - prevMins === 60) {
            currentBlock.push(clusterAppts[i]);
          } else {
            // End of consecutive block
            if (currentBlock.length >= 3) {
              // Found dense cluster! Mark all appointments in this block
              for (const appt of currentBlock) {
                denseClustersAppts.add(appt._id.toString());
              }

              // Assign dedicated employee (pick least loaded one)
              const leastLoaded = Object.keys(employeeAssignments).reduce((empA, empB) =>
                employeeAssignments[empA].length <= employeeAssignments[empB].length ? empA : empB
              );
              dedicatedEmployeeForCluster[clusterId] = leastLoaded;
            }
            currentBlock = [clusterAppts[i]];
          }
        }
      }

      // Check last block
      if (currentBlock.length >= 3) {
        for (const appt of currentBlock) {
          denseClustersAppts.add(appt._id.toString());
        }
        const leastLoaded = Object.keys(employeeAssignments).reduce((empA, empB) =>
          employeeAssignments[empA].length <= employeeAssignments[empB].length ? empA : empB
        );
        dedicatedEmployeeForCluster[clusterId] = leastLoaded;
      }
    }
  }

  // Step 4: Assign dense cluster appointments to dedicated employees
  for (const apptId of denseClustersAppts) {
    const appt = appointments.find(a => a._id.toString() === apptId);
    if (appt) {
      const cluster = (appt.clinicId as any)?.clusterId;
      const clusterId = cluster?._id?.toString();
      const dedicatedEmpId = dedicatedEmployeeForCluster[clusterId!];

      if (dedicatedEmpId) {
        employeeAssignments[dedicatedEmpId].push(appt);
        // Set primary route for this employee if not already set
        if (!employeeRoutes[dedicatedEmpId] && cluster?.routeIds?.length > 0) {
          employeeRoutes[dedicatedEmpId] = cluster.routeIds[0].toString();
        }
      }
    }
  }

  // Step 5: Assign remaining appointments to route-flow employees
  for (const rId of Object.keys(routeGroups)) {
    const routeAppts = routeGroups[rId].filter(appt => !denseClustersAppts.has(appt._id.toString()));

    if (routeAppts.length === 0) continue;

    // Sort by time
    routeAppts.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));

    // Find best employee for this route
    // Prefer employees not already assigned to a different route, but allow reassignment if feasible
    const sortedEmployees = [...activeEmployees]
      .sort((a, b) => {
        const routeA = employeeRoutes[a._id.toString()];
        const routeB = employeeRoutes[b._id.toString()];
        // Employees without a route are preferred
        if (!routeA && routeB) return -1;
        if (routeA && !routeB) return 1;
        // If both have routes, prefer same route as current rId
        if (routeA === rId && routeB !== rId) return -1;
        if (routeB === rId && routeA !== rId) return 1;
        // Otherwise, prefer the less loaded employee
        const countA = employeeAssignments[a._id.toString()]?.length || 0;
        const countB = employeeAssignments[b._id.toString()]?.length || 0;
        return countA - countB;
      });

    // Determine parent cluster ID of target route appointments (assume all share same parent)
    const targetParentId = routeAppts[0]?.clinicId?.clusterId?.parentCluster?.toString() || null;

    let assignedEmpId: string | null = null;
    // First try employees who already have an appointment in the same parent cluster
    for (const emp of sortedEmployees) {
      const empIdStr = emp._id.toString();
      const hasParent = employeeAssignments[empIdStr].some(appt => {
        const cl = (appt.clinicId as any)?.clusterId;
        return cl?.parentCluster?.toString() === targetParentId;
      });
      if (hasParent) {
        const candidate = [...employeeAssignments[empIdStr], ...routeAppts];
        if (await isScheduleFeasible(candidate)) {
          assignedEmpId = empIdStr;
          break;
        }
      }
    }
    // Fallback to regular sorted order if no same-parent tech works
    if (!assignedEmpId && sortedEmployees.length > 0) {
      for (const emp of sortedEmployees) {
        const empIdStr = emp._id.toString();
        const candidate = [...employeeAssignments[empIdStr], ...routeAppts];
        if (await isScheduleFeasible(candidate)) {
          assignedEmpId = empIdStr;
          break;
        }
      }
    }

    if (assignedEmpId) {
      employeeRoutes[assignedEmpId] = rId;
      for (const appt of routeAppts) {
        employeeAssignments[assignedEmpId].push(appt);
      }
    }
  }

  // Step 6: Handle unrouted appointments
  for (const appt of unroutedAppointments) {
    let assigned = false;

    // Try to find a free employee with feasible schedule
    for (const empId of Object.keys(employeeAssignments)) {
      const candidateList = [...employeeAssignments[empId], appt];
      const isFeasible = await isScheduleFeasible(candidateList);

      if (isFeasible) {
        employeeAssignments[empId].push(appt);
        assigned = true;
        break;
      }
    }

    // If not assigned, will be in unassigned list later
  }

  // Step 7: Validate assignments and collect warnings
  const warningsList: string[] = [];

  for (const empIdStr of Object.keys(employeeAssignments)) {
    const list = employeeAssignments[empIdStr];
    if (list.length === 0) continue;

    list.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));

    // Check for backward jumps and travel feasibility
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const curr = list[i];
      const prevCluster = (prev.clinicId as any)?.clusterId;
      const currCluster = (curr.clinicId as any)?.clusterId;

      if (prevCluster && currCluster) {
        // Check backward jump
        const prevOrder = prevCluster.routeOrderIndex || 0;
        const currOrder = currCluster.routeOrderIndex || 0;

        if (currOrder < prevOrder) {
          const emp = activeEmployees.find(e => e._id.toString() === empIdStr);
          warningsList.push(
            `Backward jump for ${emp?.name}: slot ${curr.slotTime} (cluster order ${currOrder} < ${prevOrder})`
          );
        }

        // Check travel feasibility
        try {
          const distKm = haversineDistanceMeters(
            prevCluster.centroidLat, prevCluster.centroidLng,
            currCluster.centroidLat, currCluster.centroidLng
          ) / 1000;

          const travelMins = Math.round(distKm * MINUTES_PER_KM);
          const prevEndMins = timeToMinutes(prev.slotTime) + prev.durationMins;
          const currStartMins = timeToMinutes(curr.slotTime);
          const earliestArrival = prevEndMins + travelMins;

          if (earliestArrival > currStartMins + TRAVEL_FEASIBILITY_BUFFER) {
            const emp = activeEmployees.find(e => e._id.toString() === empIdStr);
            const prevEnd = minutesToTime(prevEndMins);
            const arrival = minutesToTime(earliestArrival);
            warningsList.push(
              `Travel conflict for ${emp?.name}: Cannot reach stop ${i+1} by ${curr.slotTime}. Ends ${prevEnd}, arrives ~${arrival} (${distKm.toFixed(1)}km)`
            );
          }
        } catch (e) {
          console.error('Error calculating travel feasibility:', e);
        }
      }
    }
  }

  // Step 8: Build employee sheets and collect unassigned
  const employeeSheets: EmployeeSheet[] = [];
  const allAssignedIds = new Set<string>();

  for (const emp of activeEmployees) {
    const empIdStr = emp._id.toString();
    const list = employeeAssignments[empIdStr];
    list.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));

    const sheetAppts: EmployeeSheetAppt[] = [];
    const warnings: string[] = [];
    let hasIdleGapWarning = false;

    const routeId = employeeRoutes[empIdStr] || null;
    let routeObj = null;
    if (routeId) {
      const dbRoute = await Route.findById(routeId);
      if (dbRoute) {
        routeObj = {
          id: dbRoute._id.toString(),
          name: dbRoute.name,
          color: dbRoute.color
        };
      }
    }

    for (let i = 0; i < list.length; i++) {
      const curr = list[i];
      const clinic = curr.clinicId as any;
      const cluster = clinic?.clusterId as any;

      let travelFromPrevious = 'N/A';
      let idleGap: string | null = null;

      if (i > 0) {
        const prev = list[i - 1];
        const prevClinic = prev.clinicId as any;
        const prevCluster = prevClinic?.clusterId;

        if (prevCluster && cluster) {
          try {
            const roadResult = await getRoadRoute(
              { lat: prevCluster.centroidLat, lng: prevCluster.centroidLng },
              { lat: cluster.centroidLat, lng: cluster.centroidLng }
            );

            const distKm = roadResult.distanceKm;
            const travelMins = Math.round(distKm * MINUTES_PER_KM);
            travelFromPrevious = `~${travelMins} min (${distKm.toFixed(1)}km)`;

            const prevEndMins = timeToMinutes(prev.slotTime) + prev.durationMins;
            const currStartMins = timeToMinutes(curr.slotTime);
            const gapMins = currStartMins - (prevEndMins + travelMins);

            if (gapMins > 0) {
              const gapHrs = Math.floor(gapMins / 60);
              const gapRemainingMins = gapMins % 60;
              idleGap = `${gapHrs}h ${gapRemainingMins}m idle`;

              if (gapMins > 180) {
                hasIdleGapWarning = true;
                warnings.push(`Idle gap between stop ${i} and ${i+1} exceeds 3 hours (${idleGap})`);
              }
            }
          } catch (e) {
            console.error('Error calculating path:', e);
          }
        }
      }

      allAssignedIds.add(curr._id.toString());
      sheetAppts.push({
        appointmentId: curr._id.toString(),
        time: curr.slotTime,
        clinicName: clinic?.name || 'Clinic',
        clusterName: cluster?.name || 'Cluster',
        address: clinic?.address || '',
        lat: clinic?.lat || 0,
        lng: clinic?.lng || 0,
        travelFromPrevious,
        idleGap
      });
    }

    // Persist if requested
    if (persist && list.length > 0) {
      await Assignment.findOneAndUpdate(
        { employeeId: emp._id, date } as any,
        {
          employeeId: emp._id,
          date,
          routeId: routeId as any,
          appointmentIds: list.map(a => a._id),
          isConfirmed: true,
          idleGapWarning: hasIdleGapWarning
        },
        { upsert: true }
      );

      for (const appt of list) {
        await Appointment.findByIdAndUpdate(appt._id, {
          status: 'ASSIGNED',
          assignedEmployeeId: emp._id
        });
      }
    }

    employeeSheets.push({
      employee: {
        id: emp._id.toString(),
        name: emp.name
      },
      route: routeObj,
      appointments: sheetAppts,
      warnings
    });
  }

  // Step 9: Collect unassigned
  const unassignedList: { appointmentId: string; clinicName: string; slot: string }[] = [];
  for (const appt of appointments) {
    if (!allAssignedIds.has(appt._id.toString())) {
      const clinic = appt.clinicId as any;
      unassignedList.push({
        appointmentId: appt._id.toString(),
        clinicName: clinic?.name || 'Unknown Clinic',
        slot: appt.slotTime
      });
    }
  }

  const totalWarnings = warningsList.length + employeeSheets.reduce((sum, s) => sum + s.warnings.length, 0);

  return {
    date,
    employeeSheets,
    unassigned: unassignedList,
    totalWarnings
  };
}
