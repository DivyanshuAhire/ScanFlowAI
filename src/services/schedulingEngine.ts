import { Appointment, Clinic, Cluster, Employee } from '@/models';
import { spatialGraphService } from './spatialGraphService';
import { routeMomentumService } from './routeMomentumService';
import { parse, addMinutes, isBefore, isAfter, startOfDay, endOfDay, format } from 'date-fns';

const EFFECTIVE_APPOINTMENT_DURATION = 35; // minutes

export class SchedulingEngineService {

  /**
   * Assesses which technician should be assigned an appointment at a specific clinic and time.
   */
  async assignTechnician(companyId: string, clinicId: string, appointmentDate: Date, timeSlot: string): Promise<string | null> {
    await spatialGraphService.buildGraph(companyId);

    const clinic = await Clinic.findById(clinicId).lean() as any;
    if (!clinic) {
      console.warn(`[ENGINE DEBUG] Clinic ${clinicId} not found`);
      return null;
    }
    if (!clinic.clusterId) {
      console.warn(`[ENGINE DEBUG] Clinic ${clinicId} (${clinic.name}) has no clusterId assigned`);
      return null;
    }

    const targetCluster = await Cluster.findById(clinic.clusterId).lean() as any;
    if (!targetCluster) {
      console.warn(`[ENGINE DEBUG] Cluster ${clinic.clusterId} not found for clinic ${clinic.name}`);
      return null;
    }

    const appointmentStartTime = parse(timeSlot, 'HH:mm', appointmentDate);

    // Get active technicians
    let technicians = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false }).lean() as any[];
    if (technicians.length === 0) {
      // Fallback: try finding any non-deleted employee if none are marked 'ACTIVE'
      technicians = await Employee.find({ companyId, isDeleted: false }).lean() as any[];
      console.warn(`[ENGINE DEBUG] No 'ACTIVE' techs found, falling back to ${technicians.length} total employees`);
    }

    // Fetch appointments for today for these technicians
    const dayAppointments = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(appointmentDate), $lte: endOfDay(appointmentDate) },
      isDeleted: false
    }).populate('clinicId').lean() as any[];

    let bestTechnicianId: string | null = null;
    let lowestScore = Infinity;

    // Shuffle technicians to avoid alphabetical/ID bias for first appointments of the day
    const shuffledTechnicians = [...technicians].sort(() => Math.random() - 0.5);

    for (const tech of shuffledTechnicians) {
      const feasibility = await this.isTechnicianFeasible(tech, targetCluster, appointmentDate, timeSlot, dayAppointments);
      
      if (!feasibility.feasible) continue;

      // SCORING
      let score = 0;
      const { distanceToTarget, travelTimeToTarget, previousClusterId, nextClusterId, previousClusterDistHQ, nextClusterDistHQ, arrivalTime } = feasibility.details;

      // Distance and Time penalties
      score += (distanceToTarget * 5);
      score += (travelTimeToTarget * 3);

      // Same cluster bonus
      if (previousClusterId === targetCluster._id.toString()) {
          score -= 80;
      }

      // Route continuity and Momentum (simplified for brevity, assume shared route check)
      let routeSwitch = true;
      if (previousClusterId) {
          const prevCluster = await Cluster.findById(previousClusterId).lean() as any;
          const commonRoutes = prevCluster.routeGroupIds.filter((rId: any) => targetCluster.routeGroupIds.some((trId: any) => trId.toString() === rId.toString()));
          if (commonRoutes.length > 0) {
              routeSwitch = false;
              score -= 100; // Same Route Continuity (Increased for stickiness)
          }
      }

      if (routeSwitch && previousClusterId) {
          score += 70; // Route Switch Penalty
      }

      // Momentum
      if (previousClusterId && nextClusterId) {
          score += routeMomentumService.calculateMomentumScore(
            previousClusterDistHQ, 
            targetCluster.distanceFromHQ || 0, 
            nextClusterDistHQ || 0
          );
      } else if (previousClusterId) {
          // Just forward momentum from previous
           score += routeMomentumService.calculateMomentumScore(
             null, 
             previousClusterDistHQ, 
             targetCluster.distanceFromHQ || 0
           );
      }

      if (score < lowestScore) {
          lowestScore = score;
          bestTechnicianId = tech._id.toString();
      }
    }

    return bestTechnicianId;
  }

  /**
   * Internal helper to check if a specific technician can feasibly take an appointment.
   */
  async isTechnicianFeasible(tech: any, targetCluster: any, date: Date, timeSlot: string, dayAppointments: any[]) {
    const appointmentStartTime = parse(timeSlot, 'HH:mm', date);
    const techAppointments = dayAppointments.filter(app => app.employeeId?.toString() === tech._id.toString())
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

    let previousApp = null;
    let nextApp = null;

    for (let i = 0; i < techAppointments.length; i++) {
      const appTime = parse(techAppointments[i].timeSlot, 'HH:mm', date);
      
      // If they already have an appointment at this exact time, they are busy
      if (techAppointments[i].timeSlot === timeSlot) {
        return { feasible: false, reason: 'Technician already has an appointment at this time' };
      }

      if (isBefore(appTime, appointmentStartTime)) {
          previousApp = techAppointments[i];
      } else if (isAfter(appTime, appointmentStartTime)) {
          nextApp = techAppointments[i];
          break;
      }
    }

    let previousClusterId = null;
    let previousClusterDistHQ = null;
    let previousEndTime = startOfDay(date);

    if (previousApp) {
      const prevClinic = previousApp.clinicId;
      previousClusterId = prevClinic.clusterId.toString();
      const prevClusterObj = await Cluster.findById(previousClusterId).lean() as any;
      previousClusterDistHQ = prevClusterObj?.distanceFromHQ || 0;
      const prevStartTime = parse(previousApp.timeSlot, 'HH:mm', date);
      previousEndTime = addMinutes(prevStartTime, EFFECTIVE_APPOINTMENT_DURATION);
    }

    let travelTimeToTarget = 0;
    let distanceToTarget = 0;
    
    // Explicit Same-Cluster Bypass: If in same cluster, distance is 0
    const isSameCluster = previousClusterId && previousClusterId === targetCluster._id.toString();
    
    if (previousClusterId && !isSameCluster) {
       // DIJKSTRA PATHFINDING
       distanceToTarget = spatialGraphService.calculateDistance(previousClusterId, targetCluster._id.toString());
       travelTimeToTarget = spatialGraphService.calculateTravelTime(distanceToTarget);
    }

    const arrivalTime = addMinutes(previousEndTime, travelTimeToTarget);
    const lateThreshold = addMinutes(appointmentStartTime, 10);
    
    // Buffer check: arrivalTime must be <= appointmentStartTime + 10 mins grace
    if (isAfter(arrivalTime, lateThreshold)) {
      const reason = `Too late: Arrives ${format(arrivalTime, 'HH:mm')}, Max allowed (with grace): ${format(lateThreshold, 'HH:mm')}`;
      return { feasible: false, reason };
    }

    let nextClusterId = null;
    let nextClusterDistHQ = null;
    if (nextApp) {
        const nextClinic = nextApp.clinicId;
        nextClusterId = nextClinic.clusterId.toString();
        const nextClusterObj = await Cluster.findById(nextClusterId).lean() as any;
        nextClusterDistHQ = nextClusterObj?.distanceFromHQ || 0;
        
        let travelTimeFromTarget = 0;
        if (targetCluster._id.toString() !== nextClusterId) {
           const distFromTarget = spatialGraphService.calculateDistance(targetCluster._id.toString(), nextClusterId);
           travelTimeFromTarget = spatialGraphService.calculateTravelTime(distFromTarget);
        }

        const targetEndTime = addMinutes(appointmentStartTime, EFFECTIVE_APPOINTMENT_DURATION);
        const arrivalAtNext = addMinutes(targetEndTime, travelTimeFromTarget);
        const nextStartTime = parse(nextApp.timeSlot, 'HH:mm', date);

        if (isAfter(arrivalAtNext, nextStartTime)) {
          return { 
            feasible: false, 
            reason: `Cannot reach next appointment (${nextApp.timeSlot}) on time if this is accepted.` 
          };
        }
    }

    return { 
      feasible: true, 
      details: {
        distanceToTarget,
        travelTimeToTarget,
        previousClusterId,
        nextClusterId,
        previousClusterDistHQ,
        nextClusterDistHQ,
        arrivalTime
      } 
    };
  }

  /**
   * Calculates available hourly slots for a company on a specific date.
   */
  static async getAvailableSlots(companyId: string, date: Date, clinicId?: string) {
    const slots: { time: string; available: boolean; remaining: number; reason?: string }[] = [];
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const technicians = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false }).lean();
    const dayAppointments = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
      isDeleted: false
    }).populate('clinicId').lean();

    let targetCluster: any = null;
    if (clinicId) {
      const clinic = await Clinic.findById(clinicId).lean() as any;
      if (clinic?.clusterId) {
        targetCluster = await Cluster.findById(clinic.clusterId).lean();
      }
    }

    const engine = new SchedulingEngineService();
    if (clinicId) await spatialGraphService.buildGraph(companyId);

    for (const hour of hours) {
      let available = false;
      let remainingCount = 0;

      if (targetCluster) {
        // Smart availability: Check if AT LEAST ONE technician is feasible
        for (const tech of technicians) {
          const res = await engine.isTechnicianFeasible(tech, targetCluster, date, hour, dayAppointments);
          if (res.feasible) {
            available = true;
            remainingCount++;
          }
        }
      } else {
        // Simple fallback if no clinic selected
        const bookedCount = dayAppointments.filter(app => app.timeSlot === hour).length;
        available = bookedCount < technicians.length;
        remainingCount = Math.max(0, technicians.length - bookedCount);
      }
      
      slots.push({
        time: hour,
        available: available,
        remaining: remainingCount,
        reason: !available ? (targetCluster ? 'No technician can reach this location' : 'Fully booked') : undefined
      });
    }

    return slots;
  }

  /**
   * Helper method to auto-assign a technician to an appointment and save it.
   */
  async autoAssignEmployee(appointmentId: string): Promise<void> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment || appointment.employeeId) return;

    const techId = await this.assignTechnician(
      appointment.companyId.toString(),
      appointment.clinicId.toString(),
      appointment.appointmentDate,
      appointment.timeSlot
    );

    if (techId) {
      appointment.employeeId = techId as any;
      appointment.status = 'ASSIGNED' as any;
      await appointment.save();
      console.log(`✅ [ENGINE] Auto-assigned technician ${techId} to appointment ${appointmentId}`);
    } else {
      console.log(`❌ [ENGINE] No feasible technician found for appointment ${appointmentId} at ${appointment.timeSlot}`);
    }
  }
}

export const schedulingEngineService = new SchedulingEngineService();
