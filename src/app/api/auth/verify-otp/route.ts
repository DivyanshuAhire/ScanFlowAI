import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { signToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, otp } = await req.json();

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.otp !== otp || (user.otpExpiry && user.otpExpiry < new Date())) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken({ 
      id: user._id, 
      role: user.role, 
      companyId: user.companyId,
      clinicId: user.clinicId,
      employeeId: user.employeeId 
    });

    return NextResponse.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        companyId: user.companyId,
        clinicId: user.clinicId,
        employeeId: user.employeeId
      } 
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
