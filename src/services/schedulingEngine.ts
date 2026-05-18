import { Appointment, Clinic, Cluster, Employee, RouteDay } from '@/models';
import RouteNode from '@/models/RouteNode';
import ClusterEdge from '@/models/ClusterEdge';
import { parse, addMinutes, isBefore, isAfter, startOfDay, endOfDay, format } from 'date-fns';

const EFFECTIVE_APPOINTMENT_DURATION = 35; // minutes

// Helper to calculate exact direct geographic distance using coordinates
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export class SchedulingEngineService {
  async assignTechnician(companyId: string, clinicId: string, appointmentDate: Date, timeSlot: string): Promise<string | null> {
    // Legacy support: manual fallback assignment
    const clinic = await Clinic.findById(clinicId).lean() as any;
    if (!clinic || !clinic.cluster_id) return null;

    const targetCluster = await Cluster.findById(clinic.cluster_id).lean() as any;
    if (!targetCluster) return null;

    const technicians = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false }).lean() as any[];
    if (technicians.length === 0) return null;

    return technicians[0]._id.toString();
  }

  async isTechnicianFeasible(tech: any, targetCluster: any, date: Date, timeSlot: string, dayAppointments: any[]) {
    return { feasible: true, details: { distanceToTarget: 0, previousClusterId: null } };
  }

  static async getAvailableSlots(companyId: string, date: Date, clinicId?: string) {
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const slots: any[] = [];

    if (!clinicId) {
      return hours.map(h => ({
        time: h,
        available: true,
        remaining: 1,
        type: 'acceptable',
        label: 'Normal Slot',
        explanation: 'Available slot for bookings.'
      }));
    }

    const clinic = await Clinic.findById(clinicId).lean() as any;
    if (!clinic || !clinic.cluster_id) {
      return hours.map(h => ({
        time: h,
        available: true,
        remaining: 1,
        type: 'acceptable',
        label: 'Normal Slot',
        explanation: 'Available slot for bookings.'
      }));
    }

    const targetCluster = await Cluster.findById(clinic.cluster_id).lean() as any;
    if (!targetCluster) {
      return hours.map(h => ({
        time: h,
        available: true,
        remaining: 1,
        type: 'acceptable',
        label: 'Normal Slot',
        explanation: 'Available slot for bookings.'
      }));
    }

    // Load company for HQ coordinates
    const { Company } = await import('@/models');
    const company = await Company.findById(companyId).lean() as any;
    
    let hqLat = 19.0760;
    let hqLng = 72.8777;
    if (company && company.hqLocation && company.hqLocation.lat) {
      hqLat = company.hqLocation.lat;
      hqLng = company.hqLocation.lng;
    }

    // 1. Calculate direct distances to all active clusters to establish min/max scale
    const allClusters = await Cluster.find({ companyId, isDeleted: false }).lean();
    let maxDistance = 5;
    const distancesMap = new Map<string, number>();

    for (const c of allClusters) {
      const dist = getDistance(hqLat, hqLng, c.center_lat, c.center_lng);
      distancesMap.set(c._id.toString(), dist);
      if (dist > maxDistance) {
        maxDistance = dist;
      }
    }

    const clusterDistance = distancesMap.get(targetCluster._id.toString()) || getDistance(hqLat, hqLng, targetCluster.center_lat, targetCluster.center_lng);

    // 2. Fetch or create RouteDay to resolve direction
    let routeDay = await RouteDay.findOne({
      date: { $gte: startOfDay(date), $lte: endOfDay(date) },
      companyId
    });

    if (!routeDay) {
      const dayAppointments = await Appointment.find({
        companyId,
        appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
        isDeleted: false
      }).populate('clinicId').lean() as any[];

      let direction: 'OUTWARD' | 'INWARD' = 'OUTWARD';
      const outerCount = dayAppointments.filter(app => {
        const appClinic = app.clinicId as any;
        return appClinic?.cluster_id?.sequenceIndex > 4;
      }).length;

      if (dayAppointments.length > 0 && outerCount > dayAppointments.length / 2) {
        direction = 'INWARD';
      }

      routeDay = await RouteDay.create({
        date: startOfDay(date),
        companyId,
        routeDirection: direction,
        slotMap: new Map()
      });
    }

    const direction = routeDay.routeDirection || 'OUTWARD';

    // 3. Smart Transit-Aware Reachability Calculation
    // We check existing bookings on the day. For each candidate hour, we find the closest earlier booking.
    // Travel time is computed as 3 mins per km. If there are no earlier bookings, we travel from HQ.
    const dayAppointments = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
      isDeleted: false
    }).populate('clinicId').lean() as any[];

    // Load active route clusters to do backtrack sequence check
    let routeClusters: any[] = [];
    if (targetCluster.route_id) {
      routeClusters = await Cluster.find({
        companyId,
        route_id: targetCluster.route_id,
        isDeleted: false
      }).sort({ sequenceIndex: 1 }).lean();
    } else {
      routeClusters = [targetCluster];
    }

    let closestHour = '';
    
    for (const hour of hours) {
      const [candH, candM] = hour.split(':').map(Number);
      const candidateMinutes = candH * 60 + candM;

      // Find existing appointments that occur before this slot
      const earlierAppointments = dayAppointments.filter(app => {
        const appHour = parseInt(app.timeSlot.split(':')[0], 10);
        return appHour < candH;
      });

      let distance = 0;
      let startMinutes = 9 * 60; // technician starts work at 9:00 AM

      if (earlierAppointments.length > 0) {
        // Sort to get the latest earlier appointment
        earlierAppointments.sort((a, b) => b.timeSlot.localeCompare(a.timeSlot));
        const lastApp = earlierAppointments[0];
        const lastClinic = lastApp.clinicId as any;
        const startLat = lastClinic?.lat || targetCluster.center_lat || hqLat;
        const startLng = lastClinic?.lng || targetCluster.center_lng || hqLng;

        distance = getDistance(startLat, startLng, clinic.lat || targetCluster.center_lat, clinic.lng || targetCluster.center_lng);
        const [lastH, lastM] = lastApp.timeSlot.split(':').map(Number);
        startMinutes = (lastH * 60 + lastM) + EFFECTIVE_APPOINTMENT_DURATION;
      } else {
        // From HQ
        distance = getDistance(hqLat, hqLng, clinic.lat || targetCluster.center_lat, clinic.lng || targetCluster.center_lng);
      }

      const travelTimeMinutes = distance * 3;
      const reachableMinutes = startMinutes + travelTimeMinutes;
      const isReachable = candidateMinutes >= reachableMinutes;

      // Verify backtrack compliance
      let causesBacktracking = false;
      for (const app of dayAppointments) {
        const appClinic = app.clinicId as any;
        if (!appClinic || !appClinic.cluster_id) continue;

        const appCluster = routeClusters.find(c => c._id.toString() === appClinic.cluster_id.toString());
        if (!appCluster) continue;

        const appHour = parseInt(app.timeSlot.split(':')[0], 10);

        if (direction === 'OUTWARD') {
          if (candH > appHour && targetCluster.sequenceIndex < appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
          if (candH < appHour && targetCluster.sequenceIndex > appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
        } else {
          // INWARD
          if (candH > appHour && targetCluster.sequenceIndex > appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
          if (candH < appHour && targetCluster.sequenceIndex < appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
        }
      }

      if (isReachable && !causesBacktracking) {
        closestHour = hour;
        break; // First reachable, non-backtrack slot is our Best Slot!
      }
    }

    // Fallback: if no slot satisfies backtrack check, pick first reachable slot
    if (!closestHour) {
      for (const hour of hours) {
        const [candH, candM] = hour.split(':').map(Number);
        const candidateMinutes = candH * 60 + candM;

        const earlierAppointments = dayAppointments.filter(app => {
          const appHour = parseInt(app.timeSlot.split(':')[0], 10);
          return appHour < candH;
        });

        let distance = 0;
        let startMinutes = 9 * 60;

        if (earlierAppointments.length > 0) {
          earlierAppointments.sort((a, b) => b.timeSlot.localeCompare(a.timeSlot));
          const lastApp = earlierAppointments[0];
          const lastClinic = lastApp.clinicId as any;
          const startLat = lastClinic?.lat || targetCluster.center_lat || hqLat;
          const startLng = lastClinic?.lng || targetCluster.center_lng || hqLng;
          distance = getDistance(startLat, startLng, clinic.lat || targetCluster.center_lat, clinic.lng || targetCluster.center_lng);
          const [lastH, lastM] = lastApp.timeSlot.split(':').map(Number);
          startMinutes = (lastH * 60 + lastM) + EFFECTIVE_APPOINTMENT_DURATION;
        } else {
          distance = getDistance(hqLat, hqLng, clinic.lat || targetCluster.center_lat, clinic.lng || targetCluster.center_lng);
        }

        const travelTimeMinutes = distance * 3;
        const reachableMinutes = startMinutes + travelTimeMinutes;

        if (candidateMinutes >= reachableMinutes) {
          closestHour = hour;
          break;
        }
      }
    }

    // 4. Populate and return slots array
    for (const hour of hours) {
      const [candH] = hour.split(':').map(Number);
      const isBest = hour === closestHour;

      // Check backtracking to provide rich error tooltip if needed
      let causesBacktracking = false;
      for (const app of dayAppointments) {
        const appClinic = app.clinicId as any;
        if (!appClinic || !appClinic.cluster_id) continue;

        const appCluster = routeClusters.find(c => c._id.toString() === appClinic.cluster_id.toString());
        if (!appCluster) continue;

        const appHour = parseInt(app.timeSlot.split(':')[0], 10);

        if (direction === 'OUTWARD') {
          if (candH > appHour && targetCluster.sequenceIndex < appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
          if (candH < appHour && targetCluster.sequenceIndex > appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
        } else {
          // INWARD
          if (candH > appHour && targetCluster.sequenceIndex > appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
          if (candH < appHour && targetCluster.sequenceIndex < appCluster.sequenceIndex) {
            causesBacktracking = true;
          }
        }
      }

      let type: 'preferred' | 'acceptable' | 'avoid' = 'acceptable';
      let label = 'Normal Slot';
      let explanation = 'Available slot.';

      if (causesBacktracking) {
        type = 'avoid';
        label = 'Avoid Route Conflict ⚠';
        explanation = 'Avoid: causes backtracking along active route.';
      } else if (isBest) {
        type = 'preferred';
        label = 'Best Slot';
        explanation = 'Best reachable slot matching transit progression.';
      }

      slots.push({
        time: hour,
        available: true,
        remaining: 1,
        type,
        label,
        explanation
      });
    }

    return slots;
  }

  async autoAssignEmployee(appointmentId: string): Promise<void> {
    // No-op under Route-First Smart Allocator. Assignments are made during End-of-Day Optimize.
    return;
  }

  async optimizeScheduleForDate(companyId: string, date: Date): Promise<number> {
    // STEP 1: Load all unassigned bookings
    const bookings = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
      employeeId: null,
      isDeleted: false
    }).populate({
      path: 'clinicId',
      populate: { path: 'cluster_id' }
    });

    if (bookings.length === 0) return 0;

    // Load active technicians
    const technicians = await Employee.find({
      companyId,
      status: 'ACTIVE',
      isDeleted: false
    }).lean();

    if (technicians.length === 0) return 0;

    // Resolve direction
    let routeDay = await RouteDay.findOne({
      date: { $gte: startOfDay(date), $lte: endOfDay(date) },
      companyId
    });
    const direction = routeDay?.routeDirection || 'OUTWARD';

    // Group bookings by Route ID (or fallback to Cluster ID if no Route is assigned)
    const routeGroupsMap = new Map<string, any[]>();

    for (const booking of bookings) {
      const clinic = booking.clinicId as any;
      const cluster = clinic?.cluster_id as any;
      
      let routeId = 'unrouted';
      let seqIndex = 0;
      let clusterId: any = null;

      if (cluster) {
        routeId = cluster.route_id?.toString() || ('unrouted_' + cluster._id.toString());
        seqIndex = cluster.sequenceIndex || 0;
        clusterId = cluster._id;
      }

      booking.routeDirection = direction;
      booking.routeSequencePosition = seqIndex;
      booking.clusterId = clusterId;

      if (!routeGroupsMap.has(routeId)) {
        routeGroupsMap.set(routeId, []);
      }
      routeGroupsMap.get(routeId)!.push(booking);
    }

    let assignedCount = 0;
    const routeGroups = Array.from(routeGroupsMap.values());

    for (let i = 0; i < routeGroups.length; i++) {
      const groupBookings = routeGroups[i];
      const tech = technicians[i % technicians.length];

      // Sort bookings chronologically inside the route to form a continuous progression
      groupBookings.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

      for (let orderIndex = 0; orderIndex < groupBookings.length; orderIndex++) {
        const booking = groupBookings[orderIndex];
        booking.employeeId = tech._id;
        booking.status = 'ASSIGNED' as any;
        booking.optimizationStatus = 'OPTIMIZED';
        booking.routeOrder = orderIndex + 1; // set continuous chronological ordering within route
        await booking.save();
        assignedCount++;
      }
    }

    return assignedCount;
  }
}

export const schedulingEngineService = new SchedulingEngineService();
