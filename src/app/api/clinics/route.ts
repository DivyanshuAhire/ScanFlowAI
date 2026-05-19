import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Clinic } from '@/models';
import { autoClusterEngine } from '@/services/autoClusterEngine';
import { routeGraphEngine } from '@/services/routeGraphEngine';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const clinics = await Clinic.find({ companyId, isDeleted: false })
      .populate('cluster_id', 'name')
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

    // 2. Trigger Auto Spatial Intelligence Engines
    await autoClusterEngine.processNewClinic(clinic._id.toString(), clinic.companyId.toString());
    await routeGraphEngine.regenerateGraph(clinic.companyId.toString());

    // 3. Create Clinic User Account
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

    // Refresh clinic data to get cluster_id
    const updatedClinic = await Clinic.findById(clinic._id);

    return NextResponse.json(updatedClinic, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
