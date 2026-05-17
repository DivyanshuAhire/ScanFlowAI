import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Cluster } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const clusters = await Cluster.find({ 
      companyId, 
      isDeleted: { $ne: true } 
    })
      .populate('route_id')
      .sort({ name: 1 });

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
