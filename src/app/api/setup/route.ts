import { NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/setup';

export async function GET() {
  try {
    const data = await seedInitialData();
    return NextResponse.json({
      message: 'Database seeded successfully!',
      credentials: {
        admin: 'admin@scanflow.com / admin123',
        clinic: 'clinic@scanflow.com / admin123',
        employee: 'employee@scanflow.com / admin123',
      },
      data
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
