import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Employee } from '@/lib/db/models/Employee';
import { User } from '@/lib/db/models/User';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const employee = await Employee.findById(id);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Fetch Employee details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Update Employee details
    const allowedEmployeeKeys = ['name', 'phone', 'isActive'];
    for (const key of allowedEmployeeKeys) {
      if (body[key] !== undefined) {
        (employee as any)[key] = body[key];
      }
    }
    await employee.save();

    // Sync with corresponding User record
    if (employee.userId) {
      const user = await User.findById(employee.userId);
      if (user) {
        if (body.name !== undefined) user.name = body.name;
        if (body.phone !== undefined) user.phone = body.phone;
        if (body.isActive !== undefined) user.isActive = body.isActive;
        await user.save();
      }
    }

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Update Employee error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Delete corresponding User
    if (employee.userId) {
      await User.findByIdAndDelete(employee.userId);
    }

    await Employee.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete Employee error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);
