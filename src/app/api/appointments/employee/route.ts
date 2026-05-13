import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Appointment } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Fetch appointments for today and future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({ 
      employeeId, 
      isDeleted: false,
      appointmentDate: { $gte: today }
    })
      .populate('clinicId')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    return NextResponse.json(appointments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
