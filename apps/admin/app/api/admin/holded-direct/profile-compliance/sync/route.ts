import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { sendDueHoldedDirectProfileReminders } from '@/lib/holdedDirectAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const result = await sendDueHoldedDirectProfileReminders();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isForbidden = message.includes('FORBIDDEN');

    return NextResponse.json(
      {
        ok: false,
        error: isForbidden ? 'Forbidden' : 'Failed to sync profile reminders',
        ...(process.env.NODE_ENV !== 'production' ? { details: message } : {}),
      },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
