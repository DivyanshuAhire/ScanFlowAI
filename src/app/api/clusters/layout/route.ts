import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Cluster } from '@/models';

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const { offsets } = await req.json(); // Map of clusterId -> angle

    if (!offsets || typeof offsets !== 'object') {
      return NextResponse.json({ error: 'Invalid offsets data' }, { status: 400 });
    }

    const updatePromises = Object.entries(offsets).map(([id, angle]) => 
      Cluster.findByIdAndUpdate(id, { visualAngle: angle })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, message: 'Layout saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
