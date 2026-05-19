import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { CompanyHQ } from '@/lib/db/models/CompanyHQ';
import { withAuth } from '@/lib/auth/middleware';
import { regenerateAllClustersAndRoutes } from '@/lib/engines/clusterEngine';
import { z } from 'zod';

const hqSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = hqSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { lat, lng } = result.data;

    // Upsert the single CompanyHQ document
    const hq = await CompanyHQ.findOneAndUpdate(
      {},
      { lat, lng },
      { upsert: true, new: true }
    );

    // Try to auto-regenerate routes in background if there are existing clinics
    try {
      await regenerateAllClustersAndRoutes();
    } catch (e) {
      console.warn("HQ changed but route regeneration skipped/failed. This is normal if there are no clinics yet.");
    }

    return NextResponse.json({
      success: true,
      message: 'HQ set successfully',
      hq
    });
  } catch (error) {
    console.error('Set HQ error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN']);
