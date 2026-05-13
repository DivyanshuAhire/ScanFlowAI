import { NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/setup';

export async function GET() {
  try {
    const data = await seedInitialData();
    return NextResponse.json({
      success: true,
      platform: 'ScanFlow AI',
      message: 'Clean System Initialized. Only Master SuperAdmin created.',
      access: {
        super_admin: {
          login: 'superadmin@scanflow.com',
          pass: 'super123'
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
