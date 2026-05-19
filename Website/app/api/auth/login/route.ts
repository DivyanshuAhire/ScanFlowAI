import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/mongoose';
import { User } from '@/lib/db/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided",
  path: ["email"]
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { email, phone, password } = result.data;

    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Prepare token payload
    const payload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      phone: user.phone,
      name: user.name,
      clinicId: user.clinicId?.toString(),
      employeeId: user.employeeId?.toString(),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        clinicId: user.clinicId,
        employeeId: user.employeeId,
      },
      accessToken
    });

    // Set refresh token in httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });

    // Set access token in cookie for Edge middleware route protection
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true, // Edge middleware can still read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 mins
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
