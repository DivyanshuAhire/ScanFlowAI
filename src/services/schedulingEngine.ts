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

      // Check if this slot is already booked for any clinic on the same route or cluster!
      const isOccupied = dayAppointments.some(app => {
        const appClinic = app.clinicId as any;
        if (!appClinic || !appClinic.cluster_id) return false;
        
        // Resolve cluster from pre-loaded allClusters list to safely get its route_id
        const appCluster = allClusters.find(c => c._id.toString() === appClinic.cluster_id.toString());
        if (!appCluster) return false;

        const sameRoute = targetCluster.route_id && 
                          appCluster.route_id?.toString() === targetCluster.route_id.toString();
        const sameCluster = appCluster._id.toString() === targetCluster._id.toString();
        return app.timeSlot === hour && (sameRoute || sameCluster);
      });

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

      if (isReachable && !causesBacktracking && !isOccupied) {
        closestHour = hour;
        break; // First reachable, non-backtrack, unoccupied slot is our Best Slot!
      }
    }

    // Fallback: if no slot satisfies backtrack check, pick first reachable, unoccupied slot
    if (!closestHour) {
      for (const hour of hours) {
        const [candH, candM] = hour.split(':').map(Number);
        const candidateMinutes = candH * 60 + candM;

        // Check occupancy
        const isOccupied = dayAppointments.some(app => {
          const appClinic = app.clinicId as any;
          if (!appClinic || !appClinic.cluster_id) return false;
          
          // Resolve cluster from pre-loaded allClusters list to safely get its route_id
          const appCluster = allClusters.find(c => c._id.toString() === appClinic.cluster_id.toString());
          if (!appCluster) return false;

          const sameRoute = targetCluster.route_id && 
                            appCluster.route_id?.toString() === targetCluster.route_id.toString();
          const sameCluster = appCluster._id.toString() === targetCluster._id.toString();
          return app.timeSlot === hour && (sameRoute || sameCluster);
        });

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

        if (candidateMinutes >= reachableMinutes && !isOccupied) {
          closestHour = hour;
          break;
        }
      }
    }

    // 4. Populate and return slots array
    for (const hour of hours) {
      const [candH] = hour.split(':').map(Number);
      const isBest = hour === closestHour;

      // Check occupancy for this slot to set final available state
      const isOccupied = dayAppointments.some(app => {
        const appClinic = app.clinicId as any;
        if (!appClinic || !appClinic.cluster_id) return false;
        
        // Resolve cluster from pre-loaded allClusters list to safely get its route_id
        const appCluster = allClusters.find(c => c._id.toString() === appClinic.cluster_id.toString());
        if (!appCluster) return false;

        const sameRoute = targetCluster.route_id && 
                          appCluster.route_id?.toString() === targetCluster.route_id.toString();
        const sameCluster = appCluster._id.toString() === targetCluster._id.toString();
        return app.timeSlot === hour && (sameRoute || sameCluster);
      });

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
        available: !isOccupied,
        remaining: isOccupied ? 0 : 1,
        type: isOccupied ? 'avoid' : type,
        label: isOccupied ? 'Occupied ❌' : label,
        explanation: isOccupied ? 'This time slot is already booked on this route.' : explanation
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

    // Load company for HQ coordinates (used as fallback for proximity checks)
    const { Company } = await import('@/models');
    const company = await Company.findById(companyId).lean() as any;
    
    let hqLat = 19.0760;
    let hqLng = 72.8777;
    if (company && company.hqLocation && company.hqLocation.lat) {
      hqLat = company.hqLocation.lat;
      hqLng = company.hqLocation.lng;
    }

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

    // Pre-populate already assigned technicians on this date to ensure they don't get double booked
    const alreadyAssigned = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
      employeeId: { $ne: null },
      isDeleted: false
    }).lean();

    const assignedTechIds = new Set<string>(
      alreadyAssigned.map(b => b.employeeId!.toString())
    );

    for (let i = 0; i < routeGroups.length; i++) {
      const groupBookings = routeGroups[i];
      
      // Proximity feasibility matching: find the first cluster of the route group
      const firstBooking = groupBookings[0];
      const firstClinic = firstBooking.clinicId as any;
      const firstCluster = firstClinic?.cluster_id as any;

      // Find available active technicians who are NOT yet assigned to any route today!
      const availableTechs = technicians.filter(t => !assignedTechIds.has(t._id.toString()));

      if (availableTechs.length === 0) {
        console.warn(`No available technicians left to assign to route group index ${i}. Leaving remaining bookings unassigned.`);
        continue;
      }

      // Sort available technicians by proximity to the first cluster in the route group!
      let tech = availableTechs[0];
      if (firstCluster) {
        availableTechs.sort((a, b) => {
          const latA = a.baseLocation?.lat || hqLat;
          const lngA = a.baseLocation?.lng || hqLng;
          const latB = b.baseLocation?.lat || hqLat;
          const lngB = b.baseLocation?.lng || hqLng;

          const distA = getDistance(latA, lngA, firstCluster.center_lat, firstCluster.center_lng);
          const distB = getDistance(latB, lngB, firstCluster.center_lat, firstCluster.center_lng);
          return distA - distB; // closest first
        });
        tech = availableTechs[0];
      }

      assignedTechIds.add(tech._id.toString());

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
