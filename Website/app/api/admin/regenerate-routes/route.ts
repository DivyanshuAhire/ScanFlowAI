import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { withAuth } from '@/lib/auth/middleware';
import { regenerateAllClustersAndRoutes } from '@/lib/engines/clusterEngine';

export const POST = withAuth(async (req: NextRequest) => {
  try {
    await connectToDatabase();
    
    await regenerateAllClustersAndRoutes();

    return NextResponse.json({
      success: true,
      message: 'Routes and clusters regenerated successfully'
    });
  } catch (error: any) {
    console.error('Regenerate Routes error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN']);
