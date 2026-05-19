import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Appointment } from '@/lib/db/models/Appointment';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const user = req.user!;

    const appointment = await Appointment.findById(id)
      .populate('clinicId')
      .populate('scanTypeId')
      .populate('assignedEmployeeId');

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Role-based visibility check
    if (user.role === 'CLINIC_OPERATOR' && appointment.clinicId.toString() !== user.clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role === 'EMPLOYEE' && appointment.assignedEmployeeId?.toString() !== user.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error('Fetch Appointment detail error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR', 'EMPLOYEE']);

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const user = req.user!;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Role-based authorization and logic
    if (user.role === 'CLINIC_OPERATOR') {
      if (appointment.clinicId.toString() !== user.clinicId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Clinic operator can only update notes
      if (body.notes !== undefined) {
        appointment.notes = body.notes;
      }
    } else if (user.role === 'EMPLOYEE') {
      if (appointment.assignedEmployeeId?.toString() !== user.employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Employee can update notes or status to COMPLETED
      if (body.notes !== undefined) {
        appointment.notes = body.notes;
      }
      if (body.status === 'COMPLETED') {
        appointment.status = 'COMPLETED';
      }
    } else {
      // Admin or Operator can update anything
      const allowedKeys = ['status', 'notes', 'slotTime', 'date', 'assignedEmployeeId'];
      for (const key of allowedKeys) {
        if (body[key] !== undefined) {
          (appointment as any)[key] = body[key];
        }
      }
    }

    await appointment.save();

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error('Update Appointment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR', 'EMPLOYEE']);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const user = req.user!;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Security rule check:
    // "Lock: once confirmed, appointments cannot be cancelled without ADMIN role"
    // "DELETE /api/appointments/:id (ADMIN only if ASSIGNED)"
    if (appointment.status === 'ASSIGNED' && user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden. Once assigned, appointments can only be deleted/cancelled by an Admin.' 
      }, { status: 403 });
    }

    // Clinic operator can only delete their own
    if (user.role === 'CLINIC_OPERATOR') {
      if (appointment.clinicId.toString() !== user.clinicId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await Appointment.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete Appointment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR']);
