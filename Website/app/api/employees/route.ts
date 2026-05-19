import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Employee } from '@/lib/db/models/Employee';
import { User } from '@/lib/db/models/User';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = createEmployeeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, phone, password } = result.data;

    // Check if user already exists
    const existing = await User.findOne({ phone });
    if (existing) {
      return NextResponse.json({ error: 'User with this phone number already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create primary User record
    const user = (await User.create({
      phone,
      name,
      passwordHash,
      role: 'EMPLOYEE',
      isActive: true
    })) as any;

    // Create Employee record
    const employee = (await Employee.create({
      userId: user._id,
      name,
      phone,
      isActive: true
    })) as any;

    // Link user to employeeId
    user.employeeId = employee._id;
    await user.save();

    return NextResponse.json({
      success: true,
      employee
    });
  } catch (error) {
    console.error('Create Employee error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const employees = await Employee.find().sort({ name: 1 });

    return NextResponse.json({
      success: true,
      employees
    });
  } catch (error) {
    console.error('Fetch Employees error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);
