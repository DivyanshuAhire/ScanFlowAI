import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Company, User, Clinic } from '@/models';

export async function GET() {
  try {
    await dbConnect();

    const [
      totalCompanies,
      totalUsers,
      totalClinics,
      recentCompanies
    ] = await Promise.all([
      Company.countDocuments(),
      User.countDocuments(),
      Clinic.countDocuments(),
      Company.find().sort({ createdAt: -1 }).limit(5)
    ]);

    return NextResponse.json({
      totalCompanies,
      totalUsers,
      totalClinics,
      recentCompanies
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
