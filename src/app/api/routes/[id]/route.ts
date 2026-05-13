import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Route, Cluster } from '@/models';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const data = await req.json();
    const { name, clusterIds } = data;

    // 1. Update the Route name
    const route = await Route.findByIdAndUpdate(id, { name }, { new: true });
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // 2. Handle Cluster associations
    if (clusterIds && Array.isArray(clusterIds)) {
      // First, remove this route from all clusters currently assigned to it
      await Cluster.updateMany(
        { routeGroupIds: id },
        { $pull: { routeGroupIds: id } }
      );

      // Then, assign this route to the new list of clusters
      await Cluster.updateMany(
        { _id: { $in: clusterIds } },
        { $addToSet: { routeGroupIds: id } }
      );
    }

    return NextResponse.json(route);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    // 1. Mark route as deleted
    await Route.findByIdAndUpdate(id, { isDeleted: true });
    
    // 2. Clear this route from all clusters
    await Cluster.updateMany(
      { routeGroupIds: id },
      { $pull: { routeGroupIds: id } }
    );

    return NextResponse.json({ message: 'Route deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
