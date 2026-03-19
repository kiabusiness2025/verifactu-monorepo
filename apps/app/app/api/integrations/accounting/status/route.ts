import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { NextRequest, NextResponse } from 'next/server';
import { getAccountingIntegration } from '@/lib/integrations/accountingStore';

export const runtime = 'nodejs';

function getEntryChannel(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('channel')?.trim().toLowerCase();
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return query === 'chatgpt' || header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export async function GET(request: NextRequest) {
  const entryChannel = getEntryChannel(request);

  try {
    const auth = await requireTenantContext({
      channelType: entryChannel,
      metadata: { source: entryChannel === 'chatgpt' ? 'holded-first-onboarding' : 'requireTenantContext' },
    });
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const integration = await getAccountingIntegration(auth.tenantId);
    const access = await getAccountingIntegrationAccess({ tenantId: auth.tenantId, entryChannel });

    return NextResponse.json({
      provider: 'holded',
      status: integration?.status ?? 'disconnected',
      lastSyncAt: integration?.last_sync_at ?? null,
      lastError: integration?.last_error ?? null,
      connected: integration?.status === 'connected',
      plan: access.planCode,
      canConnect: access.canConnect,
      canExportAeatBooks: access.canExportAeatBooks,
      canUseAccountingApiIntegration: access.canConnect,
      canBidirectionalQuotes: access.canBidirectionalQuotes,
      connectionMode: access.connectionMode,
    });
  } catch (error) {
    console.error('[api/integrations/accounting/status] failed', {
      entryChannel,
      message: error instanceof Error ? error.message : String(error),
    });

    if (entryChannel === 'chatgpt') {
      return NextResponse.json({
        provider: 'holded',
        status: 'disconnected',
        lastSyncAt: null,
        lastError: null,
        connected: false,
        plan: null,
        canConnect: true,
        canExportAeatBooks: true,
        canUseAccountingApiIntegration: true,
        canBidirectionalQuotes: false,
        connectionMode: 'holded_first',
        degraded: true,
      });
    }

    return NextResponse.json({ error: 'No se pudo cargar el estado de Holded' }, { status: 500 });
  }
}
