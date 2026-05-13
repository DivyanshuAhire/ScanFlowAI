import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Clinic } from '@/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const clinics = await Clinic.find({ companyId, isDeleted: false })
      .populate('clusterId', 'name')
      .sort({ name: 1 });

    return NextResponse.json(clinics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    // 1. Create Clinic
    const clinic = await Clinic.create(data);

    // 2. Create Clinic User Account
    const { User, UserRole } = await import('@/models');
    const bcrypt = await import('bcryptjs');
    
    const hashedPassword = await bcrypt.hash('admin123', 10); // Default password
    await User.create({
      name: `${clinic.name} Admin`,
      email: clinic.email,
      password: hashedPassword,
      role: UserRole.CLINIC_USER,
      companyId: clinic.companyId,
      clinicId: clinic._id,
      isVerified: true
    });

    return NextResponse.json(clinic, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
