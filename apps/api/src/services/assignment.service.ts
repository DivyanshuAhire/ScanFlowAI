import { prisma } from '@scanflow/db';
import { Appointment, Employee } from '@prisma/client';

export class AssignmentEngine {
  /**
   * Find the best suitable employee for an appointment
   */
  static async findBestEmployee(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { clinic: true },
    });

    if (!appointment) throw new Error('Appointment not found');

    // 1. Get all employees with matching specialization
    const eligibleEmployees = await prisma.employee.findMany({
      where: {
        specialization: {
          has: appointment.scanType,
        },
      },
      include: {
        user: true,
        appointments: {
          where: {
            date: appointment.date,
          },
        },
      },
    });

    const candidates = [];

    for (const employee of eligibleEmployees) {
      // 2. Check Availability (Simplified for MVP)
      if (!this.isAvailable(employee, appointment)) continue;

      // 3. Check for Time Conflicts
      if (this.hasConflict(employee, appointment)) continue;

      // 4. Calculate Score
      const score = await this.calculateScore(employee, appointment);
      candidates.push({ employee, score });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0]?.employee || null;
  }

  private static isAvailable(employee: Employee, appointment: Appointment): boolean {
    // Check structured JSON availability
    // For MVP: assume everyone is available unless they have a conflict
    return true;
  }

  private static hasConflict(employee: any, appointment: Appointment): boolean {
    return employee.appointments.some((existing: Appointment) => {
      const appStart = appointment.startTime.getTime();
      const appEnd = (appointment.endTime || new Date(appStart + 3600000)).getTime();
      const existingStart = existing.startTime.getTime();
      const existingEnd = (existing.endTime || new Date(existingStart + 3600000)).getTime();

      return (appStart < existingEnd && appEnd > existingStart);
    });
  }

  private static async calculateScore(employee: any, appointment: any): Promise<number> {
    let score = 100;

    // Workload penalty: more appointments = lower priority
    score -= employee.appointments.length * 10;

    // Proximity logic (Haversine for now)
    if (employee.currentLat && employee.currentLng && appointment.clinic.latitude && appointment.clinic.longitude) {
      const distance = this.getDistance(
        employee.currentLat,
        employee.currentLng,
        appointment.clinic.latitude,
        appointment.clinic.longitude
      );
      
      // Penalty based on distance (km)
      score -= Math.min(distance * 2, 50);
    }

    return score;
  }

  private static getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
