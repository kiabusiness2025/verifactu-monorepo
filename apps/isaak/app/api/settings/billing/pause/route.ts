// V1.7.3 — Pausa una suscripción Pro durante 1-3 meses sin cancelar.
//
// POST /api/settings/billing/pause
// body: { months: 1 | 3 | null }   (null = indefinido hasta resume manual)
//
// Stripe `pause_collection` con behavior 'mark_uncollectible'. La
// suscripción queda activa (sin perder datos ni Holded conectado), pero
// no se cobra el siguiente periodo.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  loadBillingData,
  mapStripeErrorMessage,
  pauseSubscription,
  toSettingsSession,
} from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { months?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* body opcional */
  }
  const monthsRaw = body.months;
  const months: number | null =
    monthsRaw === null
      ? null
      : monthsRaw === 1 || monthsRaw === '1'
        ? 1
        : monthsRaw === 3 || monthsRaw === '3'
          ? 3
          : 1; // default 1 mes

  const billing = await loadBillingData({
    tenantId: session.tenantId,
    includeInvoices: false,
  });
  if (!billing.subscriptionId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No hay una suscripción activa que pausar.',
      },
      { status: 409 },
    );
  }

  try {
    const paused = await pauseSubscription(billing.subscriptionId, months);
    const next = await loadBillingData({
      tenantId: session.tenantId,
      includeInvoices: false,
    });
    return NextResponse.json({
      ok: true,
      pausedUntil: paused.pausedUntil?.toISOString() ?? null,
      data: next,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: mapStripeErrorMessage(error, 'No hemos podido pausar la suscripción.'),
      },
      { status: 500 },
    );
  }
}
