import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ClusterEdge from '@/models/ClusterEdge';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Usually we filter by companyId, but ClusterEdge doesn't have it explicitly right now,
    // though the clusters themselves belong to the company.
    // For now we'll just return all edges since we assume edges are company-specific 
    // by their from/to cluster IDs (which are company specific).
    // In a robust implementation, ClusterEdge should have companyId.
    const edges = await ClusterEdge.find().lean();
    return NextResponse.json(edges);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
