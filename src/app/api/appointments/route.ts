import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Appointment } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const appointments = await Appointment.find({ companyId, isDeleted: false })
      .populate('clinicId', 'name location')
      .populate('employeeId', 'name')
      .sort({ appointmentDate: -1, timeSlot: 1 })
      .limit(50);

    return NextResponse.json(appointments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    
    const appointment = await Appointment.create(data);
    
    // Note: In a full flow, this would trigger the SchedulingEngineService.autoAssignEmployee
    
    return NextResponse.json(appointment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
