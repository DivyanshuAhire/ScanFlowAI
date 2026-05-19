import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Cluster } from '@/lib/db/models/Cluster';
import { withAuth } from '@/lib/auth/middleware';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    await connectToDatabase();
    
    // Fetch all clusters, populated with parentCluster info
    const clusters = await Cluster.find()
      .populate('parentCluster')
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      clusters
    });
  } catch (error) {
    console.error('Fetch Clusters error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR', 'EMPLOYEE']);
