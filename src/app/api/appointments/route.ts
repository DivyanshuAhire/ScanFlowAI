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
    
    const { Clinic, Employee, AppointmentStatus } = await import('@/models');
    
    // 1. Create the appointment record
    const appointment = await Appointment.create(data);
    
    // 2. Fetch Clinic details to get location/cluster context
    const clinic = await Clinic.findById(data.clinicId);
    
    if (clinic) {
      // 3. Find an available employee
      // Logic: Pick an ACTIVE employee who doesn't have an appointment at this time
      const availableEmployee = await Employee.findOne({
        companyId: data.companyId,
        status: 'ACTIVE',
        isDeleted: false
      });

      if (availableEmployee) {
        // Check for conflicts
        const conflict = await Appointment.findOne({
          employeeId: availableEmployee._id,
          appointmentDate: data.appointmentDate,
          timeSlot: data.timeSlot,
          status: { $ne: AppointmentStatus.CANCELLED }
        });

        if (!conflict) {
          appointment.employeeId = availableEmployee._id;
          appointment.status = AppointmentStatus.ASSIGNED;
          await appointment.save();
        }
      }
    }
    
    return NextResponse.json(appointment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
