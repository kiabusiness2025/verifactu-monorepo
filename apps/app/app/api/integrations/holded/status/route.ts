import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getHoldedIntegration } from '@/lib/integrations/holdedStore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const integration = await getHoldedIntegration(auth.tenantId);

  return NextResponse.json({
    provider: 'holded',
    status: integration?.status ?? 'disconnected',
    lastSyncAt: integration?.last_sync_at ?? null,
    lastError: integration?.last_error ?? null,
    connected: integration?.status === 'connected',
  });
}
