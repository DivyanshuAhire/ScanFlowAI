import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Clinic } from '@/lib/db/models/Clinic';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { regenerateAllClustersAndRoutes } from '@/lib/engines/clusterEngine';

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const clinic = await Clinic.findById(id).populate('clusterId');
    
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, clinic });
  } catch (error) {
    console.error('Fetch Clinic details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR']);

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'phone', 'address', 'loginEnabled'];
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        (clinic as any)[key] = body[key];
      }
    }

    // If geographic coordinates changed, we need to regenerate
    let coordChanged = false;
    if (body.lat !== undefined && body.lat !== clinic.lat) {
      clinic.lat = body.lat;
      coordChanged = true;
    }
    if (body.lng !== undefined && body.lng !== clinic.lng) {
      clinic.lng = body.lng;
      coordChanged = true;
    }

    await clinic.save();

    if (coordChanged) {
      // Re-run the clustering algorithm
      await regenerateAllClustersAndRoutes();
    }

    return NextResponse.json({ success: true, clinic });
  } catch (error) {
    console.error('Update Clinic error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const clinic = await Clinic.findByIdAndDelete(id);
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Re-run the clustering algorithm because a clinic node was removed
    await regenerateAllClustersAndRoutes();

    return NextResponse.json({ success: true, message: 'Clinic deleted successfully' });
  } catch (error) {
    console.error('Delete Clinic error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);
