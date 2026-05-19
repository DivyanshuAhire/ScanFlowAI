import { connectToDatabase } from '@/lib/db/mongoose';
import { Appointment, IAppointment } from '../db/models/Appointment';
import { Employee, IEmployee } from '../db/models/Employee';
import { Route } from '../db/models/Route';
import { Cluster } from '../db/models/Cluster';
import { Clinic } from '../db/models/Clinic';
import { Assignment } from '../db/models/Assignment';
import { getRoadRoute } from '../osrm/client';
import { timeToMinutes, minutesToTime } from './slotSuggestor';
import { haversineDistanceMeters } from './clusterEngine';

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

// Main function to run the End-of-Day Assignment Engine
export async function computeDailyAssignments(
  date: string,
  persist: boolean = false
): Promise<AssignmentPreviewResult> {
  await connectToDatabase();

  // Step 1: Load and Group Data
  // 1.1 Load all confirmed appointments for the date
  const appointments = await Appointment.find({
    date,
    status: { $in: ['CONFIRMED', 'ASSIGNED'] }
  }).populate({
    path: 'clinicId',
    populate: { path: 'clusterId' }
  }).populate('scanTypeId');

  // 1.2 Load all active employees
  const activeEmployees = await Employee.find({ isActive: true });
  if (activeEmployees.length === 0) {
    throw new Error('No active employees found to assign.');
  }

  // 1.3 Group appointments by Route
  const routeGroups: Record<string, any[]> = {};
  const unroutedAppointments: any[] = [];

  for (const appt of appointments) {
    const clinic = appt.clinicId as any;
    const cluster = clinic?.clusterId;
    
    if (cluster && cluster.routeIds && cluster.routeIds.length > 0) {
      // Use the first routeId
      const rId = cluster.routeIds[0].toString();
      if (!routeGroups[rId]) {
        routeGroups[rId] = [];
      }
      routeGroups[rId].push(appt);
    } else {
      unroutedAppointments.push(appt);
    }
  }

  // Sort within route groups by slotTime ASC
  for (const rId of Object.keys(routeGroups)) {
    routeGroups[rId].sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));
  }

  // Set up employee assignment maps
  // employeeId -> Array of appointments
  const employeeAssignments: Record<string, any[]> = {};
  for (const emp of activeEmployees) {
    employeeAssignments[emp._id.toString()] = [];
  }

  // Keep track of which employees are assigned to which route primarily
  const employeeRoutes: Record<string, string> = {}; // employeeId -> routeId

  // Step 2: Assign Primary Route Employee
  for (const rId of Object.keys(routeGroups)) {
    const groupAppts = routeGroups[rId];
    
    // Count suggested employee occurrences
    const suggestionCounts: Record<string, number> = {};
    for (const appt of groupAppts) {
      if (appt.suggestedByEmployeeId) {
        const empIdStr = appt.suggestedByEmployeeId.toString();
        suggestionCounts[empIdStr] = (suggestionCounts[empIdStr] || 0) + 1;
      }
    }

    // Pick employee with highest count
    let primaryEmpId: string | null = null;
    let maxCount = -1;

    for (const empIdStr of Object.keys(suggestionCounts)) {
      if (suggestionCounts[empIdStr] > maxCount) {
        maxCount = suggestionCounts[empIdStr];
        primaryEmpId = empIdStr;
      }
    }

    // Tie or all null: pick any available employee with least total appointments today
    if (!primaryEmpId) {
      // Find active employee not yet primarily assigned to a route, or the one with least assignments
      const sortedEmployees = [...activeEmployees].sort((a, b) => {
        const countA = employeeAssignments[a._id.toString()].length;
        const countB = employeeAssignments[b._id.toString()].length;
        return countA - countB;
      });
      primaryEmpId = sortedEmployees[0]?._id.toString() || null;
    }

    if (primaryEmpId) {
      employeeRoutes[primaryEmpId] = rId;
      // Tentatively assign this primary employee to all appointments in this route group
      for (const appt of groupAppts) {
        employeeAssignments[primaryEmpId].push(appt);
      }
    }
  }

  // Step 3: Handle Cluster Density (3+ consecutive bookings in a cluster)
  // Check each cluster's density
  const allClusters = await Cluster.find();
  const mainClusters = allClusters.filter(c => !c.parentCluster);

  for (const mainCluster of mainClusters) {
    // Find all clinics in this main cluster and its subclusters
    const relatedClusters = allClusters.filter(
      c => c._id.toString() === mainCluster._id.toString() || c.parentCluster?.toString() === mainCluster._id.toString()
    );
    const relatedClusterIds = relatedClusters.map(c => c._id.toString());

    // Filter appointments on this date in these clusters
    const clusterAppts = appointments.filter(appt => {
      const clinic = appt.clinicId as any;
      return clinic && relatedClusterIds.includes(clinic.clusterId?._id?.toString());
    });

    // Sort by time
    clusterAppts.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));

    // Detect blocks of 3+ consecutive slots
    // Slots are consecutive if gap is exactly 1 hour (60 mins)
    let consecutiveBlocks: any[][] = [];
    let currentBlock: any[] = [];

    for (let i = 0; i < clusterAppts.length; i++) {
      if (currentBlock.length === 0) {
        currentBlock.push(clusterAppts[i]);
      } else {
        const prevAppt = currentBlock[currentBlock.length - 1];
        const prevMins = timeToMinutes(prevAppt.slotTime);
        const currMins = timeToMinutes(clusterAppts[i].slotTime);

        if (currMins - prevMins === 60) {
          currentBlock.push(clusterAppts[i]);
        } else {
          if (currentBlock.length >= 3) {
            consecutiveBlocks.push(currentBlock);
          }
          currentBlock = [clusterAppts[i]];
        }
      }
    }
    if (currentBlock.length >= 3) {
      consecutiveBlocks.push(currentBlock);
    }

    // Dedicate a technician to the high-density blocks
    for (const block of consecutiveBlocks) {
      // Find the technician primarily assigned to this block (the one with the most pre-existing assignments in it)
      const empCounts: Record<string, number> = {};
      for (const appt of block) {
        for (const empIdStr of Object.keys(employeeAssignments)) {
          if (employeeAssignments[empIdStr].some(a => a._id.toString() === appt._id.toString())) {
            empCounts[empIdStr] = (empCounts[empIdStr] || 0) + 1;
          }
        }
      }

      let dedicatedEmpId = Object.keys(empCounts).sort((a, b) => empCounts[b] - empCounts[a])[0];

      if (!dedicatedEmpId) {
        // Pick any free employee
        dedicatedEmpId = activeEmployees[0]._id.toString();
      }

      // Re-assign all appointments in this dense block to the dedicated employee
      // Remove them from other employees' assignment lists
      for (const appt of block) {
        for (const empIdStr of Object.keys(employeeAssignments)) {
          employeeAssignments[empIdStr] = employeeAssignments[empIdStr].filter(
            a => a._id.toString() !== appt._id.toString()
          );
        }
        employeeAssignments[dedicatedEmpId].push(appt);
      }

      // Check for isolated bookings in the same cluster (gap > 3hrs from last consecutive)
      const consecutiveIds = block.map(a => a._id.toString());
      const isolatedAppts = clusterAppts.filter(a => !consecutiveIds.includes(a._id.toString()));

      for (const isolated of isolatedAppts) {
        const isoMins = timeToMinutes(isolated.slotTime);
        const firstBlockMins = timeToMinutes(block[0].slotTime);
        const lastBlockMins = timeToMinutes(block[block.length - 1].slotTime);

        const idleFromStart = firstBlockMins - isoMins;
        const idleFromEnd = isoMins - (lastBlockMins + block[block.length - 1].durationMins);

        // If the gap to the block is > 3 hours (180 mins)
        if (idleFromStart > 180 || idleFromEnd > 180) {
          // Do NOT assign the dedicated tech to this isolated one
          // Remove it from the dedicated tech's list
          employeeAssignments[dedicatedEmpId] = employeeAssignments[dedicatedEmpId].filter(
            a => a._id.toString() !== isolated._id.toString()
          );

          // Find alternative tech
          let altEmpId: string | null = null;

          // Search criteria 1: Any tech whose last assignment of the day is at a cluster BEFORE C on the route at a time <= 15:00
          for (const empIdStr of Object.keys(employeeAssignments)) {
            if (empIdStr === dedicatedEmpId) continue;
            
            const empList = employeeAssignments[empIdStr];
            if (empList.length > 0) {
              empList.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));
              const lastAppt = empList[empList.length - 1];
              const lastMins = timeToMinutes(lastAppt.slotTime);
              
              const lastCluster = (lastAppt.clinicId as any)?.clusterId;
              const isoCluster = (isolated.clinicId as any)?.clusterId;

              if (lastMins <= timeToMinutes('15:00') && lastCluster && isoCluster) {
                const lastOrder = lastCluster.routeOrderIndex || 0;
                const isoOrder = isoCluster.routeOrderIndex || 0;

                if (isoOrder > lastOrder) {
                  altEmpId = empIdStr;
                  break;
                }
              }
            }
          }

          // Search criteria 2: Any tech on a nearby cross-route cluster (<= 5km) who is free at this time
          if (!altEmpId) {
            for (const empIdStr of Object.keys(employeeAssignments)) {
              if (empIdStr === dedicatedEmpId) continue;

              const empList = employeeAssignments[empIdStr];
              const isFree = !empList.some(a => a.slotTime === isolated.slotTime);
              
              if (isFree && empList.length > 0) {
                // Check distance
                const lastAppt = empList[empList.length - 1];
                const lastCluster = (lastAppt.clinicId as any)?.clusterId;
                const isoCluster = (isolated.clinicId as any)?.clusterId;

                if (lastCluster && isoCluster) {
                  try {
                    const roadDist = haversineDistanceMeters(
                      lastCluster.centroidLat, lastCluster.centroidLng,
                      isoCluster.centroidLat, isoCluster.centroidLng
                    );
                    if (roadDist <= 5000) { // 5km in meters
                      altEmpId = empIdStr;
                      break;
                    }
                  } catch (e) {}
                }
              }
            }
          }

          // Assign alternative if found
          if (altEmpId) {
            // Remove from other employees
            for (const empIdStr of Object.keys(employeeAssignments)) {
              employeeAssignments[empIdStr] = employeeAssignments[empIdStr].filter(
                a => a._id.toString() !== isolated._id.toString()
              );
            }
            employeeAssignments[altEmpId].push(isolated);
          }
        }
      }
    }
  }

  // Step 4 & 5: Forward Direction Validation & Manual Re-routing + Fill Unassigned
  const warningsList: string[] = [];

  for (const empIdStr of Object.keys(employeeAssignments)) {
    const list = employeeAssignments[empIdStr];
    list.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));

    let hasBackwardJump = false;
    for (let i = 1; i < list.length; i++) {
      const prevCluster = (list[i-1].clinicId as any)?.clusterId;
      const currCluster = (list[i].clinicId as any)?.clusterId;

      if (prevCluster && currCluster) {
        const prevOrder = prevCluster.routeOrderIndex || 0;
        const currOrder = currCluster.routeOrderIndex || 0;

        if (currOrder < prevOrder) {
          hasBackwardJump = true;
          const emp = activeEmployees.find(e => e._id.toString() === empIdStr);
          warningsList.push(
            `Backward jump detected for ${emp?.name || 'Technician'} at slot ${list[i].slotTime} (moving from cluster index ${prevOrder} to ${currOrder})`
          );
        }
      }
    }
  }

  // Fill in any unassigned appointments
  const unassignedList: { appointmentId: string; clinicName: string; slot: string }[] = [];
  const allAssignedIds = new Set<string>();
  for (const empIdStr of Object.keys(employeeAssignments)) {
    for (const appt of employeeAssignments[empIdStr]) {
      allAssignedIds.add(appt._id.toString());
    }
  }

  for (const appt of appointments) {
    if (!allAssignedIds.has(appt._id.toString())) {
      // Find a technician who doesn't have a booking at this slot time
      let assigned = false;
      const slotMins = timeToMinutes(appt.slotTime);

      for (const empIdStr of Object.keys(employeeAssignments)) {
        const empList = employeeAssignments[empIdStr];
        const isFree = !empList.some(a => a.slotTime === appt.slotTime);

        if (isFree) {
          // Check directionality:
          // Prefer employees whose last assignment is on same route and order is less than this appt
          empList.sort((a, b) => timeToMinutes(a.slotTime) - timeToMinutes(b.slotTime));
          const lastAppt = empList[empList.length - 1];
          const lastCluster = lastAppt ? (lastAppt.clinicId as any)?.clusterId : null;
          const currCluster = (appt.clinicId as any)?.clusterId;

          if (!lastAppt || (lastCluster && currCluster && (currCluster.routeOrderIndex || 0) >= (lastCluster.routeOrderIndex || 0))) {
            employeeAssignments[empIdStr].push(appt);
            allAssignedIds.add(appt._id.toString());
            assigned = true;
            break;
          }
        }
      }

      if (!assigned) {
        const clinic = appt.clinicId as any;
        unassignedList.push({
          appointmentId: appt._id.toString(),
          clinicName: clinic?.name || 'Unknown Clinic',
          slot: appt.slotTime
        });
      }
    }
  }

  // Step 6: Build Route Sheets
  const employeeSheets: EmployeeSheet[] = [];

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
            // Synchronously wait / cache lookup for distance
            const roadResult = await getRoadRoute(
              { lat: prevCluster.centroidLat, lng: prevCluster.centroidLng },
              { lat: cluster.centroidLat, lng: cluster.centroidLng }
            );

            const distKm = roadResult.distanceKm;
            const travelMins = Math.round(distKm * 3);
            travelFromPrevious = `~${travelMins} min (${distKm.toFixed(1)}km)`;

            // Calculate Idle Gap
            const prevEndMins = timeToMinutes(prev.slotTime) + prev.durationMins;
            const currStartMins = timeToMinutes(curr.slotTime);
            
            const gapMins = currStartMins - (prevEndMins + travelMins);

            if (gapMins > 0) {
              const gapHrs = Math.floor(gapMins / 60);
              const gapRemainingMins = gapMins % 60;
              idleGap = `${gapHrs}h ${gapRemainingMins}m idle`;

              // Flag warning if gap > 3hrs
              if (gapMins > 180) {
                hasIdleGapWarning = true;
                warnings.push(`Idle gap between stop ${i} and ${i+1} exceeds 3 hours (${idleGap})`);
              }
            }
          } catch (e) {
            console.error('Error calculating path in sheet building:', e);
          }
        }
      }

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

    // Step 8: Persist to DB if Confirm
    if (persist && list.length > 0) {
      // Upsert Assignment document
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

      // Update each appointment status to ASSIGNED and lock employee
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

  // Count final warnings
  const totalWarnings = warningsList.length + employeeSheets.reduce((sum, s) => sum + s.warnings.length, 0);

  return {
    date,
    employeeSheets,
    unassigned: unassignedList,
    totalWarnings
  };
}
