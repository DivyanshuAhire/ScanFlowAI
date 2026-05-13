import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Appointment, Employee, Clinic, AppointmentStatus } from '@/models';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    // In a real app, get companyId from session/JWT
    // For now, we'll take it from query or assume first company for testing
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const totalAppointments = await Appointment.countDocuments({ companyId, isDeleted: false });
    const activeEmployees = await Employee.countDocuments({ companyId, status: 'ACTIVE', isDeleted: false });
    const pendingConfirmations = await Appointment.countDocuments({ 
      companyId, 
      status: AppointmentStatus.REQUESTED, 
      isDeleted: false 
    });

    // Calculate weekly success rate (simplified)
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const weeklyApps = await Appointment.countDocuments({
      companyId,
      appointmentDate: { $gte: weekStart, $lte: weekEnd },
      isDeleted: false
    });
    const completedApps = await Appointment.countDocuments({
      companyId,
      appointmentDate: { $gte: weekStart, $lte: weekEnd },
      status: AppointmentStatus.COMPLETED,
      isDeleted: false
    });

    const successRate = weeklyApps > 0 ? (completedApps / weeklyApps) * 100 : 0;

    return NextResponse.json({
      totalAppointments,
      activeEmployees,
      pendingConfirmations,
      successRate: successRate.toFixed(1),
      routeEfficiency: 94.2, // Placeholder for complex calc
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
