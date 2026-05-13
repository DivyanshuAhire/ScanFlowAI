import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Company } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const companies = await Company.find().sort({ createdAt: -1 });
    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    // Basic validation
    if (!data.name || !data.email) {
      return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
    }

    const company = await Company.create({
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
      address: data.address,
      subscriptionPlan: data.subscriptionPlan || 'PREMIUM',
      hqLocation: data.hqLocation || { lat: 19.0760, lng: 72.8777 }
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
