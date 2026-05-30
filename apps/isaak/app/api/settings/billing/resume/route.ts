// V1.7.3 — Reanuda una suscripción Pro pausada.
//
// POST /api/settings/billing/resume

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  loadBillingData,
  mapStripeErrorMessage,
  resumeSubscription,
  toSettingsSession,
} from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function POST() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const billing = await loadBillingData({
    tenantId: session.tenantId,
    includeInvoices: false,
  });
  if (!billing.subscriptionId) {
    return NextResponse.json(
      { ok: false, error: 'No hay suscripción que reanudar.' },
      { status: 409 },
    );
  }

  try {
    await resumeSubscription(billing.subscriptionId);
    const next = await loadBillingData({
      tenantId: session.tenantId,
      includeInvoices: false,
    });
    return NextResponse.json({ ok: true, data: next });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: mapStripeErrorMessage(error, 'No hemos podido reanudar la suscripción.'),
      },
      { status: 500 },
    );
  }
}
