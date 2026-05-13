import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { signToken } from '@/lib/jwt';
import { generateOTP, sendOTPEmail } from '@/lib/otp';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { identifier, password } = await req.json();

    const user = await User.findOne({ 
      $or: [{ email: identifier }, { phoneNumber: identifier }], 
      isDeleted: false 
    });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Skip OTP verification for employees
    if (!user.isVerified && user.role !== 'EMPLOYEE') {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      if (user.email) {
        await sendOTPEmail(user.email, otp);
      }

      return NextResponse.json({ 
        message: user.email ? 'Email verification required. OTP sent.' : 'Verification required. Please contact admin.', 
        requiresVerification: !!user.email,
        email: user.email || user.phoneNumber 
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
        email: user.email || user.phoneNumber, 
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
