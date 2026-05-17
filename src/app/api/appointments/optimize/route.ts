import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { schedulingEngineService } from '@/services/schedulingEngine';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { companyId, date } = body;

    if (!companyId || !date) {
      return NextResponse.json({ error: 'companyId and date are required' }, { status: 400 });
    }

    const count = await schedulingEngineService.optimizeScheduleForDate(companyId, new Date(date));

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error('Failed to optimize schedule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
