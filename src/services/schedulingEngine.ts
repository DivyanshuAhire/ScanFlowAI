import { Appointment, Clinic, Cluster, Employee } from '@/models';
import { spatialGraphService } from './spatialGraphService';
import { routeMomentumService } from './routeMomentumService';
import { parse, addMinutes, isBefore, isAfter, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

const EFFECTIVE_APPOINTMENT_DURATION = 35; // minutes

export class SchedulingEngineService {

  /**
   * Assesses which technician should be assigned an appointment at a specific clinic and time.
   */
  async assignTechnician(companyId: string, clinicId: string, appointmentDate: Date, timeSlot: string): Promise<string | null> {
    await spatialGraphService.buildGraph(companyId);

    const clinic = await Clinic.findById(clinicId).lean() as any;
    if (!clinic || !clinic.clusterId) return null;

    const targetCluster = await Cluster.findById(clinic.clusterId).lean() as any;
    if (!targetCluster) return null;

    const appointmentStartTime = parse(timeSlot, 'HH:mm', appointmentDate);

    // Get active technicians
    const technicians = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false }).lean() as any[];

    // Fetch appointments for today for these technicians
    const dayAppointments = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(appointmentDate), $lte: endOfDay(appointmentDate) },
      isDeleted: false
    }).populate('clinicId').lean() as any[];

    let bestTechnicianId: string | null = null;
    let lowestScore = Infinity;

    for (const tech of technicians) {
      const techAppointments = dayAppointments.filter(app => app.employeeId?.toString() === tech._id.toString())
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)); // Ensure sorted by time

      // Find previous and next appointments
      let previousApp = null;
      let nextApp = null;

      for (let i = 0; i < techAppointments.length; i++) {
        const appTime = parse(techAppointments[i].timeSlot, 'HH:mm', appointmentDate);
        if (isBefore(appTime, appointmentStartTime) || techAppointments[i].timeSlot === timeSlot) {
            // Cannot overlap exactly
            if (techAppointments[i].timeSlot === timeSlot) {
                previousApp = 'CONFLICT';
                break;
            }
            previousApp = techAppointments[i];
        } else if (isAfter(appTime, appointmentStartTime)) {
            nextApp = techAppointments[i];
            break;
        }
      }

      if (previousApp === 'CONFLICT') continue; // Hard conflict at same time

      // Calculate feasible insertion
      let previousClusterId = null;
      let previousClusterDistHQ = null;
      let previousEndTime = startOfDay(appointmentDate); // Assume available from start of day

      if (previousApp) {
        const prevClinic = previousApp.clinicId;
        previousClusterId = prevClinic.clusterId.toString();
        const prevClusterObj = await Cluster.findById(previousClusterId).lean() as any;
        previousClusterDistHQ = prevClusterObj?.distanceFromHQ || 0;
        const prevStartTime = parse(previousApp.timeSlot, 'HH:mm', appointmentDate);
        previousEndTime = addMinutes(prevStartTime, EFFECTIVE_APPOINTMENT_DURATION);
      }

      let travelTimeToTarget = 0;
      let distanceToTarget = 0;
      
      if (previousClusterId && previousClusterId !== targetCluster._id.toString()) {
         distanceToTarget = spatialGraphService.calculateDistance(previousClusterId, targetCluster._id.toString());
         travelTimeToTarget = spatialGraphService.calculateTravelTime(distanceToTarget);
      }

      const arrivalTime = addMinutes(previousEndTime, travelTimeToTarget);

      // Check feasibility: Can they arrive before the new appointment starts?
      if (isAfter(arrivalTime, appointmentStartTime)) {
          continue; // Infeasible
      }

      // Check feasibility against next appointment
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
          const nextStartTime = parse(nextApp.timeSlot, 'HH:mm', appointmentDate);

          if (isAfter(arrivalAtNext, nextStartTime)) {
              continue; // Infeasible
          }
      }

      // SCORING
      let score = 0;

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
              score -= 40; // Same Route Continuity
          }
      }

      if (routeSwitch && previousClusterId) {
          score += 70; // Route Switch Penalty
      }

      // Momentum
      if (previousClusterId && nextClusterId) {
          score += routeMomentumService.calculateMomentumScore(previousClusterDistHQ, targetCluster.distanceFromHQ, nextClusterDistHQ);
      } else if (previousClusterId) {
          // Just forward momentum from previous
           score += routeMomentumService.calculateMomentumScore(null, previousClusterDistHQ, targetCluster.distanceFromHQ);
      }

      if (score < lowestScore) {
          lowestScore = score;
          bestTechnicianId = tech._id.toString();
      }
    }

    return bestTechnicianId;
  }

  /**
   * Calculates available hourly slots for a company on a specific date.
   */
  static async getAvailableSlots(companyId: string, date: Date, clinicId?: string) {
    const slots: { time: string; available: boolean; remaining: number; reason?: string }[] = [];
    
    // Hourly slots from 09:00 to 17:00 (last booking at 5 PM)
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    // Get active technicians
    const technicians = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false }).lean();
    const totalTechs = technicians.length;

    // Get appointments for the day
    const dayAppointments = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
      isDeleted: false
    }).lean();

    for (const hour of hours) {
      const bookedTechs = dayAppointments.filter(app => app.timeSlot === hour);
      const bookedCount = bookedTechs.length;
      
      const available = bookedCount < totalTechs;
      
      slots.push({
        time: hour,
        available: available,
        remaining: Math.max(0, totalTechs - bookedCount),
        reason: !available ? 'Fully booked' : undefined
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
      console.log(`Auto-assigned technician ${techId} to appointment ${appointmentId}`);
    } else {
      console.log(`Could not find a feasible technician for appointment ${appointmentId}`);
    }
  }
}

export const schedulingEngineService = new SchedulingEngineService();
