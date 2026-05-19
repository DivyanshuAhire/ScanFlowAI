import { connectToDatabase } from '@/lib/db/mongoose';
import { Clinic } from '../db/models/Clinic';
import { Cluster } from '../db/models/Cluster';
import { Appointment } from '../db/models/Appointment';
import { Employee } from '../db/models/Employee';
import { Route } from '../db/models/Route';
import { getRoadDistance } from '../osrm/client';

export const ALL_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00"
];

export interface SlotSuggestion {
  slot: string;
  status: "BEST" | "AVAILABLE" | "TAKEN";
  score: number;
  reason: string;
  suggestedEmployeeId: string | null;
  suggestedEmployeeName: string | null;
  appliedRule: "RULE_0" | "RULE_1" | "RULE_2" | "RULE_3" | "RULE_4" | "NONE";
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

export function roundUpToNextSlot(mins: number): string | null {
  for (const slot of ALL_SLOTS) {
    if (timeToMinutes(slot) >= mins) {
      return slot;
    }
  }
  return null;
}

// Local helper to intersect route ids
function routeIdsIntersect(routeIds1: any[], routeIds2: any[]): boolean {
  if (!routeIds1 || !routeIds2) return false;
  const set1 = new Set(routeIds1.map(id => id.toString()));
  return routeIds2.some(id => set1.has(id.toString()));
}

// Local helper for getClusterFamily
export async function getClusterFamily(clusterId: string): Promise<string[]> {
  const currentCluster = await Cluster.findById(clusterId);
  if (!currentCluster) {
    return [clusterId];
  }

  const familyIds = new Set<string>();
  familyIds.add(currentCluster._id.toString());

  // All clusters where parentCluster === clusterId
  const subclusters = await Cluster.find({ parentCluster: currentCluster._id } as any);
  for (const sub of subclusters) {
    familyIds.add(sub._id.toString());
  }

  // If the cluster IS a subcluster (has parentCluster),
  // also return the parent and all siblings of that parent
  if (currentCluster.parentCluster) {
    const parentIdStr = currentCluster.parentCluster.toString();
    familyIds.add(parentIdStr);

    const siblings = await Cluster.find({ parentCluster: parentIdStr } as any);
    for (const sib of siblings) {
      familyIds.add(sib._id.toString());
    }
  }

  return Array.from(familyIds);
}

async function getClusterOrderIndex(cluster: any): Promise<number> {
  if (cluster.routeIds && cluster.routeIds.length > 0) {
    const primaryRouteId = cluster.routeIds[0];
    const route = await Route.findById(primaryRouteId);
    if (route) {
      const idx = route.clusterIds.findIndex(id => id.toString() === cluster._id.toString());
      if (idx !== -1) {
        return idx + 1; // 1-based index
      }
    }
  }
  return cluster.routeOrderIndex ?? 0;
}

export async function isDirectionForward(sourceCluster: any, targetCluster: any): Promise<boolean> {
  const sharedRouteIds = sourceCluster.routeIds.filter((rId: any) => 
    targetCluster.routeIds.some((nrId: any) => nrId.toString() === rId.toString())
  );

  if (sharedRouteIds.length > 0) {
    const sharedRoutes = await Route.find({ _id: { $in: sharedRouteIds } });
    for (const route of sharedRoutes) {
      const sourceIndex = route.clusterIds.findIndex(id => id.toString() === sourceCluster._id.toString());
      const targetIndex = route.clusterIds.findIndex(id => id.toString() === targetCluster._id.toString());
      if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex < targetIndex) {
        return true;
      }
    }
    return false;
  }

  // Fallback if no shared routes (e.g. cross-route)
  const sourceOrder = await getClusterOrderIndex(sourceCluster);
  const targetOrder = await getClusterOrderIndex(targetCluster);
  return sourceOrder < targetOrder;
}

// OSRM Road Distance Cache
const osrmCache = new Map<string, number>();

async function getCachedRoadDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<number> {
  const key = `${from.lat.toFixed(6)}:${from.lng.toFixed(6)}:${to.lat.toFixed(6)}:${to.lng.toFixed(6)}`;
  if (osrmCache.has(key)) {
    return osrmCache.get(key)!;
  }
  const dist = await getRoadDistance(from, to);
  osrmCache.set(key, dist);
  return dist;
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

  const newClinicCluster = newClinic.clusterId as any;
  if (!newClinicCluster) {
    throw new Error('Clinic has no cluster assigned');
  }

  // 2. Load all appointments on this date where status != CANCELLED
  const allAppointments = await Appointment.find({
    date,
    status: { $ne: 'CANCELLED' }
  }).populate({
    path: 'clinicId',
    populate: { path: 'clusterId' }
  });

  // 3. BEFORE applying any rule, build an employee busy map:
  const busyMap = new Map<string, Set<string>>();
  for (const appt of allAppointments) {
    const empIdObj = appt.assignedEmployeeId ?? appt.suggestedByEmployeeId ?? null;
    if (empIdObj) {
      const empId = empIdObj.toString();
      if (!busyMap.has(empId)) {
        busyMap.set(empId, new Set<string>());
      }
      busyMap.get(empId)!.add(appt.slotTime);
    }
  }

  // Helper to check if employee is busy at slot
  const isEmployeeBusy = (map: Map<string, Set<string>>, empId: string, slot: string): boolean => {
    return map.get(empId)?.has(slot) ?? false;
  };

  // Cache employee names to minimize queries
  const employeeCache = new Map<string, { name: string }>();
  const getEmployeeName = async (empId: string): Promise<string | null> => {
    if (employeeCache.has(empId)) {
      return employeeCache.get(empId)!.name;
    }
    const emp = await Employee.findById(empId);
    if (emp) {
      employeeCache.set(empId, { name: emp.name });
      return emp.name;
    }
    return null;
  };

  // Initialize all suggestions to AVAILABLE
  const suggestions: Record<string, SlotSuggestion> = {};
  for (const slot of ALL_SLOTS) {
    suggestions[slot] = {
      slot,
      status: "AVAILABLE",
      score: 0,
      reason: "No constraints — slot is open",
      suggestedEmployeeId: null,
      suggestedEmployeeName: null,
      appliedRule: "NONE"
    };
  }

  // ── RULE 0 (TAKEN, score 0) ──────────────────────────
  const familyIds = await getClusterFamily(newClinicCluster._id.toString());
  const takenSlots = new Set<string>();

  const rule0Appointments = allAppointments.filter(appt => {
    const apptClinic = appt.clinicId as any;
    const apptCluster = apptClinic?.clusterId;
    if (!apptCluster) return false;
    return familyIds.includes(apptCluster._id.toString());
  });

  for (const appt of rule0Appointments) {
    const T = appt.slotTime;
    if (ALL_SLOTS.includes(T)) {
      takenSlots.add(T);
      suggestions[T] = {
        slot: T,
        status: "TAKEN",
        score: 0,
        reason: `Cluster area already has a booking at ${T}`,
        suggestedEmployeeId: null,
        suggestedEmployeeName: null,
        appliedRule: "RULE_0"
      };
    }
  }

  // Helper to safely propose BEST suggestions and keep the highest score
  const proposeSuggestion = async ({
    slot,
    score,
    reason,
    suggestedEmployeeId,
    appliedRule
  }: {
    slot: string;
    score: number;
    reason: string;
    suggestedEmployeeId: string | null;
    appliedRule: "RULE_1" | "RULE_2" | "RULE_3" | "RULE_4";
  }) => {
    if (takenSlots.has(slot)) return;

    const existing = suggestions[slot];
    if (existing.status === "AVAILABLE" || score > existing.score) {
      const empName = suggestedEmployeeId ? await getEmployeeName(suggestedEmployeeId) : null;
      suggestions[slot] = {
        slot,
        status: "BEST",
        score,
        reason,
        suggestedEmployeeId,
        suggestedEmployeeName: empName,
        appliedRule
      };
    }
  };

  // ── RULE 1 (BEST, score 90) ──────────────────────────
  const rule1Appointments = allAppointments.filter(appt => {
    const apptClinic = appt.clinicId as any;
    const apptCluster = apptClinic?.clusterId;
    if (!apptCluster) return false;
    return apptCluster._id.toString() === newClinicCluster._id.toString();
  });

  for (const appt of rule1Appointments) {
    const slotMins = timeToMinutes(appt.slotTime);
    const adjacentSlots = [];

    const beforeSlot = minutesToTime(slotMins - 60);
    if (ALL_SLOTS.includes(beforeSlot) && !takenSlots.has(beforeSlot)) {
      adjacentSlots.push(beforeSlot);
    }

    const afterSlot = minutesToTime(slotMins + 60);
    if (ALL_SLOTS.includes(afterSlot) && !takenSlots.has(afterSlot)) {
      adjacentSlots.push(afterSlot);
    }

    for (const adjSlot of adjacentSlots) {
      const empIdObj = appt.assignedEmployeeId ?? appt.suggestedByEmployeeId ?? null;
      if (empIdObj) {
        const empId = empIdObj.toString();
        if (isEmployeeBusy(busyMap, empId, adjSlot)) {
          await proposeSuggestion({
            slot: adjSlot,
            score: 90,
            reason: "Adjacent to existing booking in this cluster (tech unavailable — conflict)",
            suggestedEmployeeId: null,
            appliedRule: "RULE_1"
          });
        } else {
          const empName = await getEmployeeName(empId);
          await proposeSuggestion({
            slot: adjSlot,
            score: 90,
            reason: `Adjacent to ${(appt.clinicId as any).name} booking at ${appt.slotTime} — tech ${empName || 'unknown'} already in this area`,
            suggestedEmployeeId: empId,
            appliedRule: "RULE_1"
          });
        }
      }
    }
  }

  // ── RULE 2 (BEST, score 85) ──────────────────────────
  const distHq = newClinicCluster.distanceFromHqKm ?? 0;
  if (distHq >= 30) {
    for (const slot of ["10:00", "17:00"]) {
      if (!takenSlots.has(slot)) {
        await proposeSuggestion({
          slot,
          score: 85,
          reason: `Cluster is ${distHq}km from HQ — 10am/5pm slots ensure directional travel, no backtracking`,
          suggestedEmployeeId: null,
          appliedRule: "RULE_2"
        });
      }
    }
  }

  // ── RULE 3 (BEST, score 95) ──────────────────────────
  const rule3Appointments = allAppointments.filter(appt => {
    const apptClinic = appt.clinicId as any;
    const apptCluster = apptClinic?.clusterId;
    if (!apptCluster) return false;

    // Intersects on routeIds
    return routeIdsIntersect(apptCluster.routeIds, newClinicCluster.routeIds);
  });

  for (const A of rule3Appointments) {
    const A_clinic = A.clinicId as any;
    const A_cluster = A_clinic.clusterId;

    // Rule 5 Direction enforcement
    const isForward = await isDirectionForward(A_cluster, newClinicCluster);
    if (!isForward) {
      continue;
    }

    const freeAtMins = timeToMinutes(A.slotTime) + A.durationMins;
    const distKm = await getCachedRoadDistance(
      { lat: A_cluster.centroidLat, lng: A_cluster.centroidLng },
      { lat: newClinicCluster.centroidLat, lng: newClinicCluster.centroidLng }
    );
    const travelMins = Math.round(distKm * 3);
    const arrivalMins = freeAtMins + travelMins + 10;
    const suggestedSlot = roundUpToNextSlot(arrivalMins);

    if (suggestedSlot !== null && !takenSlots.has(suggestedSlot)) {
      const empIdObj = A.assignedEmployeeId ?? A.suggestedByEmployeeId ?? null;
      if (empIdObj) {
        const empId = empIdObj.toString();
        if (isEmployeeBusy(busyMap, empId, suggestedSlot)) {
          continue;
        }

        const empName = await getEmployeeName(empId);
        const freeAtStr = minutesToTime(freeAtMins);
        const arrivalStr = minutesToTime(arrivalMins);

        await proposeSuggestion({
          slot: suggestedSlot,
          score: 95,
          reason: `Tech ${empName || 'unknown'} at ${A_cluster.name} at ${A.slotTime} finishes at ${freeAtStr}, travels ${distKm.toFixed(1)}km (~${travelMins}min), earliest arrival ${arrivalStr}`,
          suggestedEmployeeId: empId,
          appliedRule: "RULE_3"
        });
      }
    }
  }

  // ── RULE 4 (BEST, score 75) ──────────────────────────
  const hasTechOnRoute = allAppointments.some(appt => {
    const apptClinic = appt.clinicId as any;
    const apptCluster = apptClinic?.clusterId;
    if (!apptCluster) return false;
    return routeIdsIntersect(apptCluster.routeIds, newClinicCluster.routeIds);
  });

  if (!hasTechOnRoute) {
    const otherRouteAppointments = allAppointments.filter(appt => {
      const apptClinic = appt.clinicId as any;
      const apptCluster = apptClinic?.clusterId;
      if (!apptCluster) return false;
      return !routeIdsIntersect(apptCluster.routeIds, newClinicCluster.routeIds);
    });

    for (const B of otherRouteAppointments) {
      const B_clinic = B.clinicId as any;
      const B_cluster = B_clinic.clusterId;

      // Rule 5 Direction enforcement
      const isForward = await isDirectionForward(B_cluster, newClinicCluster);
      if (!isForward) {
        continue;
      }

      const distKm = await getCachedRoadDistance(
        { lat: B_cluster.centroidLat, lng: B_cluster.centroidLng },
        { lat: newClinicCluster.centroidLat, lng: newClinicCluster.centroidLng }
      );

      if (distKm <= 5) {
        const freeAtMins = timeToMinutes(B.slotTime) + B.durationMins;
        const adjacentSlot = roundUpToNextSlot(freeAtMins + 10);

        if (adjacentSlot !== null && !takenSlots.has(adjacentSlot)) {
          const empIdObj = B.assignedEmployeeId ?? B.suggestedByEmployeeId ?? null;
          if (empIdObj) {
            const empId = empIdObj.toString();
            if (isEmployeeBusy(busyMap, empId, adjacentSlot)) {
              continue;
            }

            const empName = await getEmployeeName(empId);
            const routeIdStr = (B_cluster.routeIds && B_cluster.routeIds.length > 0)
              ? B_cluster.routeIds[0].toString()
              : "unknown";

            await proposeSuggestion({
              slot: adjacentSlot,
              score: 75,
              reason: `Tech ${empName || 'unknown'} on Route ${routeIdStr} is ${distKm.toFixed(1)}km away and free after ${B.slotTime} — no other tech on this route today`,
              suggestedEmployeeId: empId,
              appliedRule: "RULE_4"
            });
          }
        }
      }
    }
  }

  // Return exactly 10 slots
  return ALL_SLOTS.map(slot => suggestions[slot]);
}

export async function assignProvisionalEmployee(
  appointmentId: string,
  date: string
): Promise<void> {
  await connectToDatabase();

  const appointment = await Appointment.findById(appointmentId).populate({
    path: 'clinicId',
    populate: { path: 'clusterId' }
  });
  if (!appointment) return;

  const otherAppointments = await Appointment.find({
    date,
    _id: { $ne: appointmentId },
    status: { $ne: 'CANCELLED' }
  }).populate({
    path: 'clinicId',
    populate: { path: 'clusterId' }
  });

  const busyMap = new Map<string, Set<string>>();
  for (const appt of otherAppointments) {
    const empIdObj = appt.assignedEmployeeId ?? appt.suggestedByEmployeeId ?? null;
    if (empIdObj) {
      const empId = empIdObj.toString();
      if (!busyMap.has(empId)) {
        busyMap.set(empId, new Set<string>());
      }
      busyMap.get(empId)!.add(appt.slotTime);
    }
  }

  const clinicObj = appointment.clinicId as any;
  const clusterObj = clinicObj?.clusterId;
  let provisionalEmpId: string | null = null;

  // STEP 1 — Check route continuity
  if (clusterObj && clusterObj.routeIds) {
    const routeIds = clusterObj.routeIds;
    const continuityAppt = otherAppointments.find(appt => {
      const apptClinic = appt.clinicId as any;
      const apptCluster = apptClinic?.clusterId;
      if (!apptCluster) return false;
      
      const intersects = routeIdsIntersect(apptCluster.routeIds, routeIds);
      const hasSuggestedEmp = appt.suggestedByEmployeeId !== undefined && appt.suggestedByEmployeeId !== null;
      return intersects && hasSuggestedEmp;
    });

    if (continuityAppt) {
      provisionalEmpId = continuityAppt.suggestedByEmployeeId!.toString();
    }
  }

  // STEP 4 — Conflict double-check for Step 1
  if (provisionalEmpId) {
    const isBusy = busyMap.get(provisionalEmpId)?.has(appointment.slotTime) ?? false;
    if (isBusy) {
      provisionalEmpId = null; // Discard and fall through to Step 2
    }
  }

  // STEP 2 — If no route employee exists yet, pick fresh
  if (provisionalEmpId === null) {
    const activeEmployees = await Employee.find({ isActive: true });
    const freeEmployees = activeEmployees.filter(emp => {
      const empId = emp._id.toString();
      const isBusy = busyMap.get(empId)?.has(appointment.slotTime) ?? false;
      return !isBusy;
    });

    if (freeEmployees.length > 0) {
      const allApptsForDate = await Appointment.find({ date });
      const countMap = new Map<string, number>();
      for (const emp of freeEmployees) {
        countMap.set(emp._id.toString(), 0);
      }

      for (const appt of allApptsForDate) {
        if (appt.suggestedByEmployeeId) {
          const empId = appt.suggestedByEmployeeId.toString();
          if (countMap.has(empId)) {
            countMap.set(empId, countMap.get(empId)! + 1);
          }
        }
      }

      freeEmployees.sort((a, b) => {
        const countA = countMap.get(a._id.toString()) ?? 0;
        const countB = countMap.get(b._id.toString()) ?? 0;
        return countA - countB;
      });

      provisionalEmpId = freeEmployees[0]._id.toString();
    }
  }

  // STEP 4 — Conflict double-check before saving (redundant but safe)
  if (provisionalEmpId) {
    const isBusy = busyMap.get(provisionalEmpId)?.has(appointment.slotTime) ?? false;
    if (isBusy) {
      provisionalEmpId = null;
    }
  }

  // STEP 3 — Save
  if (provisionalEmpId) {
    await Appointment.findByIdAndUpdate(appointmentId, {
      suggestedByEmployeeId: provisionalEmpId
    });
  }
}
