import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { ScanType } from '@/lib/db/models/ScanType';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const scanType = await ScanType.findById(id);

    if (!scanType) {
      return NextResponse.json({ error: 'Scan type not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, scanType });
  } catch (error) {
    console.error('Fetch Scan Type details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const scanType = await ScanType.findById(id);
    if (!scanType) {
      return NextResponse.json({ error: 'Scan type not found' }, { status: 404 });
    }

    const allowedKeys = ['name', 'durationMins', 'isActive'];
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        (scanType as any)[key] = body[key];
      }
    }

    await scanType.save();

    return NextResponse.json({ success: true, scanType });
  } catch (error) {
    console.error('Update Scan Type error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;

    const scanType = await ScanType.findByIdAndDelete(id);
    if (!scanType) {
      return NextResponse.json({ error: 'Scan type not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Scan type deleted successfully' });
  } catch (error) {
    console.error('Delete Scan Type error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);
