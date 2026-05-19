import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Appointment } from '@/lib/db/models/Appointment';
import { ScanType } from '@/lib/db/models/ScanType';
import { Clinic } from '@/lib/db/models/Clinic';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getSlotSuggestions, assignProvisionalEmployee } from '@/lib/engines/slotSuggestor';
import { z } from 'zod';

const createAppointmentSchema = z.object({
  clinicId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  scanTypeId: z.string(),
  notes: z.string().optional()
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = createAppointmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { clinicId, date, slotTime, scanTypeId, notes } = result.data;
    const user = req.user!;

    // Security check: CLINIC_OPERATOR can only book for their own clinic
    if (user.role === 'CLINIC_OPERATOR') {
      if (!user.clinicId || user.clinicId.toString() !== clinicId) {
        return NextResponse.json({ error: 'Forbidden. You can only book appointments for your own clinic.' }, { status: 403 });
      }
    }

    // 1. Fetch the Scan Type to get its duration
    const scanType = await ScanType.findById(scanTypeId);
    if (!scanType || !scanType.isActive) {
      return NextResponse.json({ error: 'Scan type not found or inactive' }, { status: 404 });
    }

    // 2. Fetch the clinic to verify existence
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // 3. Prevent double booking: check slot suggestions
    const suggestions = await getSlotSuggestions(clinicId, date);
    const chosenSlot = suggestions.find(s => s.slot === slotTime);

    if (!chosenSlot || chosenSlot.status === 'TAKEN') {
      return NextResponse.json({ error: 'This time slot is already taken' }, { status: 400 });
    }

    // 4. Create appointment with the suggested employee populated (Book-first, assign-later prediction)
    const appointment = await Appointment.create({
      clinicId: clinicId as any,
      date,
      slotTime,
      durationMins: scanType.durationMins,
      scanTypeId: scanTypeId as any,
      status: 'CONFIRMED', // Default status is CONFIRMED per schema spec
      suggestedByEmployeeId: chosenSlot.suggestedEmployeeId as any,
      notes: notes || ''
    } as any);

    // Call assignProvisionalEmployee immediately after confirmed booking is saved to DB
    await assignProvisionalEmployee(appointment._id.toString(), date);

    // Retrieve the updated appointment to return in response
    const updatedAppointment = await Appointment.findById(appointment._id);

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment || appointment
    });
  } catch (error: any) {
    console.error('Create Appointment error:', error);
    // Compound unique index conflict handling
    if (error.code === 11000) {
      return NextResponse.json({ error: 'This clinic already has a booking at this time slot' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR']);

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const clinicId = searchParams.get('clinicId');
    const status = searchParams.get('status');

    const user = req.user!;
    const filter: any = {};

    // Enforce clinic operator visibility rules
    if (user.role === 'CLINIC_OPERATOR') {
      filter.clinicId = user.clinicId;
    } else if (clinicId) {
      filter.clinicId = clinicId;
    }

    // Enforce employee visibility rules
    if (user.role === 'EMPLOYEE') {
      filter.assignedEmployeeId = user.employeeId;
    }

    if (date) {
      filter.date = date;
    }

    if (status) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('clinicId')
      .populate('scanTypeId')
      .populate('assignedEmployeeId')
      .sort({ date: 1, slotTime: 1 });

    return NextResponse.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Fetch Appointments error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR', 'EMPLOYEE']);
