/**
 * GET /api/cron/webhook-retry
 *
 * Retries failed outbound webhook deliveries (status='failed') whose
 * next_retry_at is in the past. Runs every 5 minutes. Processes up to
 * 50 deliveries per run to stay within Vercel's 60s maxDuration.
 *
 * Auth: Bearer CRON_SECRET.
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { retryPendingWebhooks } from '@/app/lib/isaak-webhook-emitter';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await retryPendingWebhooks();
    return NextResponse.json({ ...result, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error('[webhook-retry] cron failed', err);
    return NextResponse.json(
      { error: 'retry_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
