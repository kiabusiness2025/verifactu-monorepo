import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  createBillingCheckoutUrl,
  getSettingsReturnUrl,
  loadBillingData,
  mapStripeErrorMessage,
  toSettingsSession,
} from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function POST() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const billing = await loadBillingData({ tenantId: session.tenantId, includeInvoices: false });
  if (!billing.checkoutAvailable) {
    return NextResponse.json(
      {
        ok: false,
        error: 'El checkout todavia no esta disponible para este plan. Usa soporte para activarlo.',
      },
      { status: 409 }
    );
  }

  try {
    const url = await createBillingCheckoutUrl({
      customerId: billing.customerId,
      customerEmail: session.email,
      successUrl: getSettingsReturnUrl('billing'),
      cancelUrl: getSettingsReturnUrl('billing'),
    });

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No hemos podido preparar el checkout de Stripe para este espacio.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: mapStripeErrorMessage(error, 'No hemos podido abrir Stripe Checkout.'),
      },
      { status: 500 }
    );
  }
}
