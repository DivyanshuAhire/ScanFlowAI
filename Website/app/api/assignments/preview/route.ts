import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { computeDailyAssignments } from '@/lib/engines/assignmentEngine';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Missing or invalid date query parameter (YYYY-MM-DD)' }, { status: 400 });
    }

    const preview = await computeDailyAssignments(date, false);

    return NextResponse.json({
      success: true,
      preview
    });
  } catch (error: any) {
    console.error('Assignment Preview API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);
