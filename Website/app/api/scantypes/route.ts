import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { ScanType } from '@/lib/db/models/ScanType';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { z } from 'zod';

const scanTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  durationMins: z.number().min(5, 'Duration must be at least 5 minutes')
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = scanTypeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, durationMins } = result.data;

    // Check if scan type exists
    const existing = await ScanType.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Scan type with this name already exists' }, { status: 400 });
    }

    const scanType = await ScanType.create({
      name,
      durationMins,
      isActive: true
    });

    return NextResponse.json({
      success: true,
      scanType
    });
  } catch (error) {
    console.error('Create Scan Type error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const scanTypes = await ScanType.find().sort({ name: 1 });

    return NextResponse.json({
      success: true,
      scanTypes
    });
  } catch (error) {
    console.error('Fetch Scan Types error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR']);
