import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { getSlotSuggestions } from '@/lib/engines/slotSuggestor';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { z } from 'zod';

const suggestSchema = z.object({
  clinicId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    const body = await req.json();

    const result = suggestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { clinicId, date } = result.data;

    const suggestions = await getSlotSuggestions(clinicId, date);

    return NextResponse.json({
      success: true,
      suggestions
    });
  } catch (error: any) {
    console.error('Slot Suggestion API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR']);
