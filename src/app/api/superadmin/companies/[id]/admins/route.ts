import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User, UserRole } from '@/models';
import bcrypt from 'bcryptjs';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const admins = await User.find({ 
      companyId: params.id, 
      role: UserRole.COMPANY_ADMIN,
      isDeleted: false 
    }).select('-password -otp -refreshToken');
    
    return NextResponse.json(admins);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { name, email, password, phoneNumber } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: UserRole.COMPANY_ADMIN,
      companyId: params.id,
      isVerified: true, // Superadmin created admins are verified by default
    });

    const { password: _, ...adminData } = newAdmin.toObject();
    return NextResponse.json(adminData, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
