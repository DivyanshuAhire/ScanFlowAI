import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Route } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const routes = await Route.find({ companyId, isDeleted: false }).sort({ name: 1 });
    return NextResponse.json(routes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const { Cluster } = await import('@/models');
    
    // 1. Create the Route
    const route = await Route.create(data);
    
    // 2. If clusterIds were provided, update those clusters
    if (data.clusterIds && Array.isArray(data.clusterIds)) {
      await Cluster.updateMany(
        { _id: { $in: data.clusterIds } },
        { $addToSet: { routeGroupIds: route._id } }
      );
    }
    
    return NextResponse.json(route, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
