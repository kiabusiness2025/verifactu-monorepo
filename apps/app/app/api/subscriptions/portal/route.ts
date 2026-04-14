import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  createTenantBillingPortalUrl,
  loadTenantCurrentSubscription,
  mapBillingStripeError,
} from '@/lib/billing/subscriptions';
import { getAppUrl } from '@verifactu/utils';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'subscription-portal' },
  });

  if ('error' in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const subscription = await loadTenantCurrentSubscription({
    tenantId: auth.tenantId,
    includeInvoices: false,
  });

  if (!subscription.customerId || !subscription.portalAvailable) {
    return NextResponse.json(
      {
        ok: false,
        error: 'El portal de facturacion no esta disponible todavia para este tenant.',
      },
      { status: 409 }
    );
  }

  try {
    const url = await createTenantBillingPortalUrl({
      customerId: subscription.customerId,
      returnUrl: `${getAppUrl()}/dashboard/settings?tab=billing`,
    });

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: mapBillingStripeError(error, 'No hemos podido abrir el portal de facturacion.'),
      },
      { status: 500 }
    );
  }
}
