import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Cluster, Clinic } from '@/models';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const data = await req.json();
    const cluster = await Cluster.findByIdAndUpdate(params.id, data, { new: true });
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }
    return NextResponse.json(cluster);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    // Check if clinics are attached
    const clinicsCount = await Clinic.countDocuments({ clusterId: params.id, isDeleted: false });
    if (clinicsCount > 0) {
      return NextResponse.json({ error: 'Cannot delete cluster with assigned clinics' }, { status: 400 });
    }

    const cluster = await Cluster.findByIdAndUpdate(params.id, { isDeleted: true }, { new: true });
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
