import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Clinic } from '@/lib/db/models/Clinic';
import { Cluster } from '@/lib/db/models/Cluster';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { assignClinicToClusterAndRoute } from '@/lib/engines/clusterEngine';
import { z } from 'zod';

const clinicSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional()
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = clinicSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, phone, lat, lng, address } = result.data;

    // Trigger geographic auto-clustering and route assignment
    let assignment;
    try {
      assignment = await assignClinicToClusterAndRoute(name, lat, lng);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Geographical assignment failed. Did you set the HQ?' }, { status: 400 });
    }

    const { clusterId } = assignment;

    const clinic = await Clinic.create({
      name,
      phone,
      lat,
      lng,
      clusterId: clusterId as any,
      address: address || '',
      loginEnabled: false
    });

    return NextResponse.json({
      success: true,
      clinic
    });
  } catch (error: any) {
    console.error('Create Clinic error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR']);

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const clusterId = searchParams.get('clusterId');
    const routeId = searchParams.get('routeId');

    const filter: any = {};

    if (clusterId) {
      filter.clusterId = clusterId;
    } else if (routeId) {
      // Find all clusters belonging to this route
      const clusters = await Cluster.find({ routeIds: routeId } as any);
      const clusterIds = clusters.map(c => c._id);
      
      // Also get any subclusters of these clusters
      const subclusters = await Cluster.find({ parentCluster: { $in: clusterIds } } as any);
      const subclusterIds = subclusters.map(s => s._id);

      filter.clusterId = { $in: [...clusterIds, ...subclusterIds] };
    }

    const clinics = await Clinic.find(filter)
      .populate('clusterId')
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      clinics
    });
  } catch (error) {
    console.error('Fetch Clinics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR']);
