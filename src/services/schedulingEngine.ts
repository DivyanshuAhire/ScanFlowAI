import { Appointment, Employee, Clinic, Cluster, ClusterDistanceMatrix, OfficeTimings, AppointmentStatus } from '@/models';
import mongoose from 'mongoose';
import { addMinutes, format, parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export class SchedulingEngineService {
  /**
   * STEP 1: Filter Valid Slots
   */
  static async getAvailableSlots(companyId: string, date: Date, clinicId: string) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const officeTimings = await OfficeTimings.findOne({ companyId });
    if (!officeTimings) throw new Error('Office timings not configured');

    // Check if day is a holiday
    const dayName = format(date, 'EEEE');
    if (officeTimings.holidays.includes(dayName) || clinic.workingHours.holidays.includes(dayName)) {
      return [];
    }

    const slots: string[] = [];
    let currentTime = parse(officeTimings.openingTime, 'HH:mm', date);
    const endTime = parse(officeTimings.closingTime, 'HH:mm', date);

    while (currentTime < endTime) {
      const slotStr = format(currentTime, 'HH:mm');
      
      // Check blackout timings
      const isBlackout = officeTimings.blackoutTimings.some(bt => {
        const start = parse(bt.start, 'HH:mm', date);
        const end = parse(bt.end, 'HH:mm', date);
        return currentTime >= start && currentTime < end;
      });

      if (!isBlackout) {
        slots.push(slotStr);
      }
      
      currentTime = addMinutes(currentTime, officeTimings.appointmentInterval);
    }

    return slots;
  }

  /**
   * Main Assignment Algorithm
   */
  static async autoAssignEmployee(appointmentId: string) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    const { companyId, clinicId, appointmentDate, timeSlot, duration } = appointment;
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const employees = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false });
    
    let bestEmployee = null;
    let minScore = Infinity;

    for (const employee of employees) {
      // STEP 6: Conflict Detection (Basic)
      const hasConflict = await this.checkConflict(employee._id as string, appointmentDate, timeSlot, duration);
      if (hasConflict) continue;

      let score = 0;

      // STEP 2: Route Matching
      if (employee.assignedRouteId?.toString() === clinic.routeId?.toString()) {
        score -= 100; // High priority for same route
      }

      // STEP 3: Same Cluster Optimization
      if (employee.assignedRouteId?.toString() === clinic.clusterId?.toString()) {
        score -= 50;
      }

      // Check existing appointments for the day to find proximity
      const dailyApps = await Appointment.find({
        employeeId: employee._id,
        appointmentDate: { $gte: startOfDay(appointmentDate), $lte: endOfDay(appointmentDate) },
        status: { $ne: AppointmentStatus.CANCELLED }
      }).sort({ timeSlot: 1 });

      if (dailyApps.length > 0) {
        // Find nearest appointment in time
        // Calculate travel feasibility between appointments
        const feasibility = await this.checkTravelFeasibility(employee._id as string, appointment, dailyApps);
        if (!feasibility.possible) continue;
        
        score += feasibility.travelTime; // Lower travel time is better
      } else {
        // STEP 5: Free employee fallback
        score += 200; 
      }

      if (score < minScore) {
        minScore = score;
        bestEmployee = employee;
      }
    }

    if (bestEmployee) {
      appointment.employeeId = bestEmployee._id as mongoose.Types.ObjectId;
      appointment.status = AppointmentStatus.ASSIGNED;
      await appointment.save();

      // Trigger Notifications (Step 7)
      // await WhatsAppService.sendAssignmentNotification(appointment);

      return bestEmployee;
    }

    return null;
  }

  private static async checkConflict(employeeId: string, date: Date, timeSlot: string, duration: number) {
    const start = parse(timeSlot, 'HH:mm', date);
    const end = addMinutes(start, duration);

    const existing = await Appointment.find({
      employeeId,
      appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
      status: { $in: [AppointmentStatus.ASSIGNED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] }
    });

    return existing.some(app => {
      const appStart = parse(app.timeSlot, 'HH:mm', date);
      const appEnd = addMinutes(appStart, app.duration);
      return (start < appEnd && end > appStart);
    });
  }

  private static async checkTravelFeasibility(employeeId: string, newApp: any, dailyApps: any[]) {
    // Find appointments immediately before and after
    const newStart = parse(newApp.timeSlot, 'HH:mm', newApp.appointmentDate);
    const newEnd = addMinutes(newStart, newApp.duration);

    let before = null;
    let after = null;

    for (const app of dailyApps) {
      const appStart = parse(app.timeSlot, 'HH:mm', app.appointmentDate);
      if (appStart < newStart) before = app;
      if (appStart > newStart && !after) after = app;
    }

    // Logic for travel buffer calculation between clusters
    // Using Step 4 formula: Distance * 3 mins
    
    // For simplicity in this MVP, we assume it's possible if there's at least 30 mins buffer 
    // unless clusters are different. In a full implementation, we query ClusterDistanceMatrix.
    
    return { possible: true, travelTime: 30 };
  }
}
