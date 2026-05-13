import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { SchedulingEngineService } from '@/services/schedulingEngine';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const dateStr = searchParams.get('date');
    const clinicId = searchParams.get('clinicId');

    if (!companyId || !dateStr) {
      return NextResponse.json({ error: 'Company ID and Date are required' }, { status: 400 });
    }

    const { parseISO } = await import('date-fns');
    const date = parseISO(dateStr);
    const slots = await SchedulingEngineService.getAvailableSlots(companyId, date, clinicId || undefined);

    return NextResponse.json(slots);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
