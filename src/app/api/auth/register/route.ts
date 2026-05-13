import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, phoneNumber, password, role, companyId, employeeId, clinicId } = await req.json();

    const existingUser = await User.findOne({ 
      $or: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : [])
      ]
    });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      companyId,
      employeeId,
      clinicId,
      isVerified: true // Auto-verifying internal accounts for now
    });

    return NextResponse.json({ 
      message: 'User registered successfully', 
      user: { id: user._id, email: user.email || user.phoneNumber } 
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
