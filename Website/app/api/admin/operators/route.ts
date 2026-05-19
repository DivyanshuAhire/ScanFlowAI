import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/mongoose';
import { User } from '@/lib/db/models/User';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

const createOperatorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = createOperatorSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password } = result.data;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const operator = await User.create({
      name,
      email,
      passwordHash,
      role: 'COMPANY_OPERATOR',
      isActive: true
    });

    return NextResponse.json({
      success: true,
      operator: {
        id: operator._id,
        name: operator.name,
        email: operator.email,
        role: operator.role
      }
    });
  } catch (error) {
    console.error('Create Operator error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN']);

export const GET = withAuth(async (req: NextRequest) => {
  try {
    await connectToDatabase();
    
    const operators = await User.find({ role: 'COMPANY_OPERATOR' })
      .select('-passwordHash')
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      operators
    });
  } catch (error) {
    console.error('Fetch Operators error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN']);
