import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Appointment, Clinic, Employee } from '@/models';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Use a wider date range to ensure we don't miss appointments due to timezone issues
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    // Also check for appointments that might have been created for 'today' but are slightly in the past
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);

    const appointments = await Appointment.find({ 
      employeeId: new mongoose.Types.ObjectId(employeeId), 
      isDeleted: false,
      appointmentDate: { $gte: yesterday }
    })
      .populate('clinicId')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    return NextResponse.json(appointments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
