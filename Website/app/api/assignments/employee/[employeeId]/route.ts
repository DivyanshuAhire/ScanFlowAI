import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Assignment } from '@/lib/db/models/Assignment';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ employeeId: string }> }) => {
  try {
    await connectToDatabase();
    const { employeeId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const user = req.user!;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Missing or invalid date query parameter (YYYY-MM-DD)' }, { status: 400 });
    }

    // Security check: Employee can only view their own route sheet
    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId || user.employeeId.toString() !== employeeId) {
        return NextResponse.json({ error: 'Forbidden. You can only view your own assignment sheets.' }, { status: 403 });
      }
    }

    const assignment = await Assignment.findOne({ employeeId, date } as any)
      .populate('employeeId')
      .populate('routeId')
      .populate({
        path: 'appointmentIds',
        populate: {
          path: 'clinicId',
          populate: { path: 'clusterId' }
        }
      });

    if (!assignment) {
      return NextResponse.json({
        success: true,
        assignment: null,
        message: 'No assignments found for this technician on the selected date.'
      });
    }

    return NextResponse.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Fetch Employee Assignment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'EMPLOYEE']);
