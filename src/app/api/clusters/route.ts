import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Cluster, Route } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    let clusters = await Cluster.find({ 
      companyId, 
      isDeleted: { $ne: true } 
    })
      .populate('routeGroupIds', 'name')
      .sort({ name: 1 });

    // Auto-repair: If any cluster still has the old singular field, fix it on the fly
    let needsReFetch = false;
    for (const cluster of clusters) {
      const raw = cluster.toObject() as any;
      if (raw.routeGroupId && (!raw.routeGroupIds || raw.routeGroupIds.length === 0)) {
        await Cluster.updateOne(
          { _id: cluster._id },
          { 
            $set: { routeGroupIds: [raw.routeGroupId] },
            $unset: { routeGroupId: 1 }
          }
        );
        needsReFetch = true;
      }
    }

    if (needsReFetch) {
      clusters = await Cluster.find({ 
        companyId, 
        isDeleted: { $ne: true } 
      })
        .populate('routeGroupIds', 'name')
        .sort({ name: 1 });
    }

    return NextResponse.json(clusters);
  } catch (error: any) {
    console.error('Clusters API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const cluster = await Cluster.create(data);
    return NextResponse.json(cluster, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
