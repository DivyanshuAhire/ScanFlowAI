import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// We use jose instead of jsonwebtoken in Next.js Middleware because jsonwebtoken uses node:crypto which is not supported in Next Edge Runtime.
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_min_32_chars_long_for_security'
);

interface DecodedToken {
  role: 'ADMIN' | 'COMPANY_OPERATOR' | 'CLINIC_OPERATOR' | 'EMPLOYEE';
  userId: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that don't need authentication
  const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth');

  const accessTokenCookie = request.cookies.get('accessToken');
  const token = accessTokenCookie?.value;

  let decoded: DecodedToken | null = null;

  if (token) {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      decoded = payload as unknown as DecodedToken;
    } catch (error) {
      console.log('JWT Verification failed in Edge Middleware:', error);
    }
  }

  // 1. If trying to access a protected path without a valid token
  if (!isPublicPath && !decoded) {
    const loginUrl = new URL('/login', request.url);
    // Keep track of the original page to redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If logged in and trying to go to login
  if (pathname === '/login' && decoded) {
    return redirectBasedOnRole(decoded.role, request.url);
  }

  // 3. Role-based path access control
  if (decoded) {
    if (pathname.startsWith('/admin') && decoded.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(getDashboardForRole(decoded.role), request.url));
    }
    if (pathname.startsWith('/operator') && decoded.role !== 'COMPANY_OPERATOR') {
      return NextResponse.redirect(new URL(getDashboardForRole(decoded.role), request.url));
    }
    if (pathname.startsWith('/clinic') && decoded.role !== 'CLINIC_OPERATOR') {
      return NextResponse.redirect(new URL(getDashboardForRole(decoded.role), request.url));
    }
    if (pathname.startsWith('/employee') && decoded.role !== 'EMPLOYEE') {
      return NextResponse.redirect(new URL(getDashboardForRole(decoded.role), request.url));
    }
    // If accessing root "/", redirect to their dashboard
    if (pathname === '/') {
      return redirectBasedOnRole(decoded.role, request.url);
    }
  }

  return NextResponse.next();
}

function getDashboardForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'COMPANY_OPERATOR':
      return '/operator/dashboard';
    case 'CLINIC_OPERATOR':
      return '/clinic/book';
    case 'EMPLOYEE':
      return '/employee/route';
    default:
      return '/login';
  }
}

function redirectBasedOnRole(role: string, baseUrl: string) {
  const target = getDashboardForRole(role);
  return NextResponse.redirect(new URL(target, baseUrl));
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/ (handled inside API route handlers)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
};
