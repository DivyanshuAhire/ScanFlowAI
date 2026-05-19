import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { User } from '@/lib/db/models/User';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const refreshTokenCookie = req.cookies.get('refreshToken');
    const token = refreshTokenCookie?.value;

    if (!token) {
      return NextResponse.json({ error: 'Refresh token not found' }, { status: 401 });
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      phone: user.phone,
      name: user.name,
      clinicId: user.clinicId?.toString(),
      employeeId: user.employeeId?.toString(),
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken({ userId: user._id.toString() });

    const response = NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        clinicId: user.clinicId,
        employeeId: user.employeeId,
      }
    });

    // Set cookies
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
