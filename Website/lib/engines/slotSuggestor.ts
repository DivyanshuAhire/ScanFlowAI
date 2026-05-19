import { connectToDatabase } from '@/lib/db/mongoose';
import { Clinic } from '../db/models/Clinic';
import { Cluster } from '../db/models/Cluster';
import { Appointment } from '../db/models/Appointment';
import { Employee } from '../db/models/Employee';
import { Route } from '../db/models/Route';
import { getRoadRoute } from '../osrm/client';

export const ALL_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00'
];

export interface SlotSuggestion {
  slot: string;
  status: 'BEST' | 'AVAILABLE' | 'TAKEN';
  reason: string;
  suggestedEmployeeId: string | null;
  suggestedEmployeeName: string | null;
  score: number;
}

// Helpers for time operations
export function timeToMinutes(time: string): number {
  const [hrs, mins] = time.split(':').map(Number);
  return hrs * 60 + mins;
}

export function minutesToTime(mins: number): string {
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return `${hrs.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function getSlotSuggestions(
  clinicId: string,
  date: string
): Promise<SlotSuggestion[]> {
  await connectToDatabase();

  // 1. Get requested clinic and its cluster
  const newClinic = await Clinic.findById(clinicId).populate('clusterId');
  if (!newClinic) {
    throw new Error('Clinic not found');
  }

  const newCluster = newClinic.clusterId as any;
  if (!newCluster) {
    throw new Error('Clinic is not assigned to a cluster');
  }

  // Find the primary/parent cluster for Rule 0
  const mainClusterId = newCluster.parentCluster || newCluster._id;

  // Find all related clusters (parent + subclusters)
  const relatedClusters = await Cluster.find({
    $or: [{ _id: mainClusterId }, { parentCluster: mainClusterId }]
  });
  const relatedClusterIds = relatedClusters.map(c => c._id);

  // Find all clinics in these related clusters
  const clinicsInArea = await Clinic.find({ clusterId: { $in: relatedClusterIds } } as any);
  const clinicIdsInArea = clinicsInArea.map(c => c._id);

  // Load all appointments in this cluster area for the date (Rule 0)
  const areaAppointments = await Appointment.find({
    clinicId: { $in: clinicIdsInArea },
    date,
    status: { $ne: 'CANCELLED' }
  } as any);

  // Keep track of which slots are booked in this cluster area
  const takenSlots = new Set<string>();
  for (const appt of areaAppointments) {
    takenSlots.add(appt.slotTime);
  }

  // Find other bookings on the same route for other rules
  const routeIds = newCluster.routeIds;
  const sameRouteAppointments = await Appointment.find({
    date,
    status: { $ne: 'CANCELLED' }
  } as any).populate({
    path: 'clinicId',
    populate: { path: 'clusterId' }
  });

  // Filter to only those on the same route
  const sameRouteAppts = sameRouteAppointments.filter(appt => {
    const apptCluster = (appt.clinicId as any)?.clusterId;
    if (!apptCluster) return false;
    // Check if there is any shared routeId
    return apptCluster.routeIds.some((rId: any) => routeIds.some((nrId: any) => nrId.toString() === rId.toString()));
  });

  // Filter to other routes
  const otherRouteAppts = sameRouteAppointments.filter(appt => {
    const apptCluster = (appt.clinicId as any)?.clusterId;
    if (!apptCluster) return false;
    return !apptCluster.routeIds.some((rId: any) => routeIds.some((nrId: any) => nrId.toString() === rId.toString()));
  });

  // Setup initial slot suggestions
  const suggestions: Record<string, SlotSuggestion> = {};
  for (const slot of ALL_SLOTS) {
    suggestions[slot] = {
      slot,
      status: 'AVAILABLE',
      reason: 'Slot is open and available',
      suggestedEmployeeId: null,
      suggestedEmployeeName: null,
      score: 0
    };
  }

  // ----------------------------------------------------
  // RULE 0: Hard Block (TAKEN)
  // ----------------------------------------------------
  for (const slot of ALL_SLOTS) {
    if (takenSlots.has(slot)) {
      suggestions[slot] = {
        slot,
        status: 'TAKEN',
        reason: `Cluster area already has a booking at ${slot}`,
        suggestedEmployeeId: null,
        suggestedEmployeeName: null,
        score: 0
      };
    }
  }

  // Helper to safely apply suggestions
  const applyBest = (slot: string, score: number, reason: string, empId: string | null = null, empName: string | null = null) => {
    if (suggestions[slot].status === 'TAKEN') return;
    
    if (suggestions[slot].status === 'AVAILABLE' || (suggestions[slot].status === 'BEST' && score > suggestions[slot].score)) {
      suggestions[slot].status = 'BEST';
      suggestions[slot].score = score;
      suggestions[slot].reason = reason;
      suggestions[slot].suggestedEmployeeId = empId;
      suggestions[slot].suggestedEmployeeName = empName;
    }
  };

  // ----------------------------------------------------
  // RULE 1: Same Cluster Adjacency (BEST, Score: 90)
  // ----------------------------------------------------
  // If this cluster (or subclusters) has any bookings, suggest adjacent hours
  for (const appt of areaAppointments) {
    const apptMins = timeToMinutes(appt.slotTime);
    
    // T + 1 hour (60 mins)
    const plusOneStr = minutesToTime(apptMins + 60);
    if (ALL_SLOTS.includes(plusOneStr)) {
      applyBest(
        plusOneStr, 
        90, 
        `Adjacent to existing booking in ${newCluster.name} — keeps one technician in the area`
      );
    }

    // T - 1 hour (60 mins)
    const minusOneStr = minutesToTime(apptMins - 60);
    if (ALL_SLOTS.includes(minusOneStr) && apptMins - 60 >= timeToMinutes('09:00')) {
      applyBest(
        minusOneStr, 
        90, 
        `Adjacent to existing booking in ${newCluster.name} — keeps one technician in the area`
      );
    }
  }

  // ----------------------------------------------------
  // RULE 2: Distance >= 30km from HQ (BEST, Score: 85)
  // ----------------------------------------------------
  if ((newCluster.distanceFromHqKm || 0) >= 30) {
    applyBest(
      '10:00', 
      85, 
      `Cluster is ${newCluster.distanceFromHqKm?.toFixed(1)}km from HQ — morning slot ensures directional travel`
    );
    applyBest(
      '17:00', 
      85, 
      `Cluster is ${newCluster.distanceFromHqKm?.toFixed(1)}km from HQ — evening slot ensures directional travel`
    );
  }

  // ----------------------------------------------------
  // RULE 3: Same Route Travel Time (BEST, Score: 95)
  // ----------------------------------------------------
  for (const appt of sameRouteAppts) {
    const apptClinic = appt.clinicId as any;
    const apptCluster = apptClinic?.clusterId;
    if (!apptCluster) continue;

    try {
      // Get road distance between the two clusters
      const roadResult = await getRoadRoute(
        { lat: apptCluster.centroidLat, lng: apptCluster.centroidLng },
        { lat: newCluster.centroidLat, lng: newCluster.centroidLng }
      );

      const distKm = roadResult.distanceKm;
      const travelMins = Math.round(distKm * 3);
      
      const apptFreeMins = timeToMinutes(appt.slotTime) + appt.durationMins;
      const earliestArrivalMins = apptFreeMins + travelMins;
      const suggestFromMins = earliestArrivalMins + 10; // Grace period

      // Directional Flow Enforcement:
      // suggestion is ONLY valid if: newCluster.routeOrderIndex > apptCluster.routeOrderIndex
      // Exception: the first booking of the day has no constraint, but here we are evaluating based on an existing booking
      const newOrder = newCluster.routeOrderIndex || 0;
      const existingOrder = apptCluster.routeOrderIndex || 0;

      if (newOrder > existingOrder) {
        // Find slots that start at or after suggestFromMins
        for (const slot of ALL_SLOTS) {
          const slotMins = timeToMinutes(slot);
          if (slotMins >= suggestFromMins) {
            // Find employee name if assigned or suggested
            let empId: string | null = null;
            let empName: string | null = null;
            
            const empObjectId = appt.suggestedByEmployeeId || appt.assignedEmployeeId;
            if (empObjectId) {
              const emp = await Employee.findById(empObjectId);
              if (emp) {
                empId = emp._id.toString();
                empName = emp.name;
              }
            }

            applyBest(
              slot,
              95,
              `Tech ${empName || 'assigned'} at ${apptCluster.name} at ${appt.slotTime} can reach here by ${minutesToTime(earliestArrivalMins)}`,
              empId,
              empName
            );
          }
        }
      }
    } catch (err) {
      console.error('Error in Rule 3 slot calculations:', err);
    }
  }

  // ----------------------------------------------------
  // RULE 4: Cross-Route Proximity (BEST, Score: 75)
  // ----------------------------------------------------
  // Condition: No employees currently assigned/suggested for Route R on this date
  const hasEmployeesOnRoute = sameRouteAppts.some(
    appt => appt.suggestedByEmployeeId || appt.assignedEmployeeId
  );

  if (!hasEmployeesOnRoute) {
    for (const appt of otherRouteAppts) {
      const apptClinic = appt.clinicId as any;
      const apptCluster = apptClinic?.clusterId;
      if (!apptCluster) continue;

      try {
        const roadResult = await getRoadRoute(
          { lat: apptCluster.centroidLat, lng: apptCluster.centroidLng },
          { lat: newCluster.centroidLat, lng: newCluster.centroidLng }
        );

        const distKm = roadResult.distanceKm;

        if (distKm <= 5) {
          const techFreeMins = timeToMinutes(appt.slotTime) + appt.durationMins;
          const travelMins = Math.round(distKm * 3);
          const earliestArrivalMins = techFreeMins + travelMins + 10; // with grace

          // Round up to next slot boundary (nearest hour)
          const nextSlotMins = Math.ceil(earliestArrivalMins / 60) * 60;
          const adjacentSlotStr = minutesToTime(nextSlotMins);

          if (ALL_SLOTS.includes(adjacentSlotStr)) {
            let empId: string | null = null;
            let empName: string | null = null;

            const empObjectId = appt.suggestedByEmployeeId || appt.assignedEmployeeId;
            if (empObjectId) {
              const emp = await Employee.findById(empObjectId);
              if (emp) {
                empId = emp._id.toString();
                empName = emp.name;
              }
            }

            applyBest(
              adjacentSlotStr,
              75,
              `Tech ${empName || 'assigned'} on nearby Route can reach within ${distKm.toFixed(1)}km — no other tech on Route today`,
              empId,
              empName
            );
          }
        }
      } catch (err) {
        console.error('Error in Rule 4 calculations:', err);
      }
    }
  }

  // Sort and output
  return Object.values(suggestions);
}
