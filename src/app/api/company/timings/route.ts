import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { OfficeTimings } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const timings = await OfficeTimings.findOne({ companyId });
    return NextResponse.json(timings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { companyId, ...data } = await req.json();
    
    const timings = await OfficeTimings.findOneAndUpdate(
      { companyId },
      { ...data, companyId },
      { upsert: true, new: true }
    );
    
    return NextResponse.json(timings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
