import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Company } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const company = await Company.findById(companyId).select('name scanTypes');
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: company.name,
      scanTypes: company.scanTypes || ['MRI Scan', 'CT Scan', 'X-Ray', 'Ultrasound']
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { companyId, scanTypes } = await req.json();

    if (!companyId || !scanTypes) {
      return NextResponse.json({ error: 'Company ID and scanTypes required' }, { status: 400 });
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { scanTypes },
      { new: true }
    );

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
