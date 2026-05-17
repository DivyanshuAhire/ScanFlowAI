import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Clinic, Company, Cluster } from '@/models';

export async function GET() {
  try {
    await dbConnect();
    const clinics = await Clinic.find()
      .populate('companyId', 'name email')
      .populate('cluster_id', 'name')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(clinics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
