import { requireTenantContext } from '@/lib/api/tenantAuth';
import { loadTenantCurrentSubscription } from '@/lib/billing/subscriptions';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'subscription-current' },
  });

  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const includeInvoices = searchParams.get('includeInvoices') === 'true';

  const subscription = await loadTenantCurrentSubscription({
    tenantId: auth.tenantId,
    includeInvoices,
  });

  return NextResponse.json({
    subscription,
    tenantId: auth.tenantId,
  });
}
