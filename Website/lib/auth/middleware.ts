import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, verifyAccessToken, TokenPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

export function getAuthenticatedUser(req: NextRequest): TokenPayload | null {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return verifyAccessToken(token);
}

export function withAuth(
  handler: (req: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse> | NextResponse,
  allowedRoles?: ('ADMIN' | 'COMPANY_OPERATOR' | 'CLINIC_OPERATOR' | 'EMPLOYEE')[]
) {
  return async (req: NextRequest, ...args: any[]) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Missing or invalid token.' }, { status: 401 });
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden. You do not have permission to access this resource.' }, { status: 403 });
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = user;

    return handler(authReq, ...args);
  };
}
