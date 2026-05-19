import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  // Clear cookies by setting maxAge to 0
  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });

  response.cookies.set('accessToken', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });

  return response;
}
