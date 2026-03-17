import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getTenantFeatureFlags } from '@/lib/billing/tenantPlan';
import { getAccountingIntegration } from '@/lib/integrations/accountingStore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const integration = await getAccountingIntegration(auth.tenantId);
  const flags = await getTenantFeatureFlags(auth.tenantId);

  return NextResponse.json({
    provider: 'accounting_api',
    status: integration?.status ?? 'disconnected',
    lastSyncAt: integration?.last_sync_at ?? null,
    lastError: integration?.last_error ?? null,
    connected: integration?.status === 'connected',
    plan: flags.planCode,
    canConnect: flags.canUseAccountingApiIntegration,
    canExportAeatBooks: flags.canExportAeatBooks,
    canUseAccountingApiIntegration: flags.canUseAccountingApiIntegration,
    canBidirectionalQuotes: flags.canBidirectionalQuotes,
  });
}
