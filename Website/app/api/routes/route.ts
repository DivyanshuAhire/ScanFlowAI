import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { Route } from '@/lib/db/models/Route';
import { withAuth } from '@/lib/auth/middleware';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    await connectToDatabase();
    
    // Fetch all routes, populated with their clusters
    const routes = await Route.find()
      .populate('clusterIds')
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      routes
    });
  } catch (error) {
    console.error('Fetch Routes error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR', 'EMPLOYEE']);
