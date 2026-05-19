import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ClusterDistanceMatrix from '@/models/ClusterDistanceMatrix';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const distances = await ClusterDistanceMatrix.find({ companyId, isDeleted: false })
      .populate('fromClusterId', 'name')
      .populate('toClusterId', 'name');

    return NextResponse.json(distances);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const { companyId, fromClusterId, toClusterId, distance } = data;

    if (!companyId || !fromClusterId || !toClusterId || distance === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Travel time is roughly 3 mins per km as per current service logic
    const travelTime = distance * 3;

    // Upsert the distance (undirected logic: we store A->B and B->A or just one and handle in service)
    // To keep it simple for the service, we'll store both directions or ensure the service handles it.
    // The service handles undirected, so we just need one record or both.
    // Let's store both to make queries easier if needed, or just one with sorted IDs.
    
    const ids = [fromClusterId, toClusterId].sort();
    
    const matrix = await ClusterDistanceMatrix.findOneAndUpdate(
      { 
        companyId, 
        fromClusterId: ids[0], 
        toClusterId: ids[1] 
      },
      { 
        distance, 
        travelTime, 
        isDeleted: false 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(matrix);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await ClusterDistanceMatrix.findByIdAndUpdate(id, { isDeleted: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
