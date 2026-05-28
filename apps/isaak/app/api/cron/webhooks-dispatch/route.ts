/**
 * GET /api/cron/webhooks-dispatch
 *
 * Runs every minute (configured in apps/isaak/vercel.json). Drains the
 * outbound webhook queue: signs pending deliveries with HMAC-SHA256 and
 * POSTs them to the customer endpoint registered via IsaakWebhookEndpoint.
 *
 * Auth: Bearer CRON_SECRET, compared in constant time. If CRON_SECRET is
 * not configured the endpoint is closed (401) — never run unauthenticated.
 *
 * See `apps/isaak/app/lib/webhooks/dispatch.ts` for the retry policy.
 */
import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchPendingDeliveries } from '@/app/lib/webhooks';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await dispatchPendingDeliveries({ batchSize: 50 });
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
