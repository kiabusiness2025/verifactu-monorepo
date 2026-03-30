import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  cancelBillingAtPeriodEnd,
  loadBillingData,
  mapStripeErrorMessage,
  toSettingsSession,
} from '@/app/lib/settings';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function POST() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const billing = await loadBillingData({ tenantId: session.tenantId, includeInvoices: false });
  if (!billing.subscriptionId || !billing.cancelAvailable) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No hay una suscripcion activa cancelable en este momento.',
      },
      { status: 409 }
    );
  }

  try {
    const canceled = await cancelBillingAtPeriodEnd(billing.subscriptionId);

    await prisma.tenantSubscription.updateMany({
      where: {
        tenantId: session.tenantId,
        stripeSubscriptionId: billing.subscriptionId,
      },
      data: {
        cancelAtPeriodEnd: canceled.cancelAtPeriodEnd,
        stripeStatus: canceled.status,
        currentPeriodEnd: canceled.currentPeriodEnd || undefined,
      },
    });

    const next = await loadBillingData({ tenantId: session.tenantId, includeInvoices: false });
    return NextResponse.json({ ok: true, data: next });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: mapStripeErrorMessage(
          error,
          'No hemos podido marcar la suscripcion para cancelacion.'
        ),
      },
      { status: 500 }
    );
  }
}
