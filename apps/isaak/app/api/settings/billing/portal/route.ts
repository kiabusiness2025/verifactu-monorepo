import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  createBillingPortalUrl,
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
  if (!billing.customerId || !billing.portalAvailable) {
    return NextResponse.json(
      {
        ok: false,
        error: 'El portal de facturacion no esta disponible todavia para este espacio.',
      },
      { status: 409 }
    );
  }

  try {
    const url = await createBillingPortalUrl({
      customerId: billing.customerId,
      returnUrl: getSettingsReturnUrl('billing'),
    });

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: mapStripeErrorMessage(error, 'No hemos podido abrir el portal de facturacion.'),
      },
      { status: 500 }
    );
  }
}
