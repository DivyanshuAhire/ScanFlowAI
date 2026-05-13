import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { signToken } from '@/lib/jwt';
import { generateOTP, sendOTPEmail } from '@/lib/otp';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      await sendOTPEmail(user.email, otp);

      return NextResponse.json({ 
        message: 'Email verification required. OTP sent.', 
        requiresVerification: true,
        email: user.email 
      }, { status: 200 });
    }

    const token = signToken({ 
      id: user._id, 
      role: user.role, 
      companyId: user.companyId,
      clinicId: user.clinicId,
      employeeId: user.employeeId 
    });

    // In a real app, you might use cookies
    return NextResponse.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
