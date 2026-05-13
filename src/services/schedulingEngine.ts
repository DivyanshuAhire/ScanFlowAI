import { Appointment, Employee, Clinic, Cluster, ClusterDistanceMatrix, OfficeTimings, AppointmentStatus } from '@/models';
import mongoose from 'mongoose';
import { addMinutes, format, parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export class SchedulingEngineService {
  /**
   * STEP 1: Filter Valid Slots
   */
  static async getAvailableSlots(companyId: string, date: Date, clinicId?: string) {
    let officeTimings = await OfficeTimings.findOne({ companyId });
    
    // Fallback to defaults if not configured
    if (!officeTimings) {
      officeTimings = {
        openingTime: '09:00',
        closingTime: '18:00',
        appointmentInterval: 30,
        holidays: ['Sunday'],
        blackoutTimings: []
      } as any;
    }

    // Check if day is a holiday
    const dayName = format(date, 'EEEE');
    if (officeTimings.holidays.includes(dayName)) {
      return [];
    }

    const technicians = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false });
    const totalTechs = technicians.length;
    const isHoliday = officeTimings.holidays.includes(dayName);

    if (isHoliday) {
      return [];
    }

    const slots: { time: string; available: boolean; remaining: number; reason?: string }[] = [];
    let currentTime = parse(officeTimings.openingTime, 'HH:mm', date);
    const endTime = parse(officeTimings.closingTime, 'HH:mm', date);

    // Fetch all appointments for this day to check capacity
    const dayAppointments = await Appointment.find({
      companyId,
      appointmentDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
      status: { $in: [AppointmentStatus.ASSIGNED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] }
    });

    while (currentTime < endTime) {
      const slotStr = format(currentTime, 'HH:mm');
      
      // Check blackout timings
      const isBlackout = officeTimings.blackoutTimings.some(bt => {
        const start = parse(bt.start, 'HH:mm', date);
        const end = parse(bt.end, 'HH:mm', date);
        return currentTime >= start && currentTime < end;
      });

      if (!isBlackout) {
        // Capacity check: how many techs are booked during this time?
        const slotApps = dayAppointments.filter(app => {
          const appStart = parse(app.timeSlot, 'HH:mm', date);
          const appEnd = addMinutes(appStart, app.duration);
          return (currentTime >= appStart && currentTime < appEnd);
        });

        const bookedCount = slotApps.length;
        const clinicAlreadyBooked = clinicId && slotApps.some(app => app.clinicId?.toString() === clinicId);

        slots.push({
          time: slotStr,
          available: totalTechs > 0 && bookedCount < totalTechs && !clinicAlreadyBooked,
          remaining: Math.max(0, totalTechs - bookedCount),
          reason: clinicAlreadyBooked 
            ? 'Clinic already has a scan at this time' 
            : (totalTechs === 0 ? 'No active technicians' : (bookedCount >= totalTechs ? 'Fully booked' : undefined))
        });
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
    const clinic = await Clinic.findById(clinicId).populate('clusterId');
    if (!clinic) throw new Error('Clinic not found');

    const employees = await Employee.find({ companyId, status: 'ACTIVE', isDeleted: false });
    
    let bestEmployee = null;
    let minScore = Infinity;

    for (const employee of employees) {
      // STEP 6: Conflict Detection (Basic)
      const hasConflict = await this.checkConflict(employee._id as string, appointmentDate, timeSlot, duration);
      if (hasConflict) continue;

      let score = 0;

      // STEP 2: Route Matching (Direct)
      if (employee.assignedRouteId?.toString() === clinic.routeId?.toString()) {
        score -= 100; // High priority for same route
      }

      // STEP 3: Same Cluster Optimization (via Route Group)
      const cluster = clinic.clusterId as any;
      if (cluster && (cluster.routeGroupIds || []).some((rg: any) => rg.toString() === employee.assignedRouteId?.toString())) {
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
        // STEP 5: Free employee fallback - prioritize free employees slightly 
        // to distribute load if no route match found
        score += 50; 
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

    // In a real app, query ClusterDistanceMatrix
    // For now, calculate a rough travel time if clusters are different
    let travelTime = 15; // default 15 mins
    
    if (before && before.clinicId?.toString() !== newApp.clinicId?.toString()) {
      // If coming from a different clinic, add 15 mins travel
      travelTime = 30;
    }

    return { possible: true, travelTime };
  }
}
