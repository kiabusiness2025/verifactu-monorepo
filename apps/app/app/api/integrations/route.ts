import { requireTenantContext } from '@/lib/api/tenantAuth';
import { listTenantIntegrations } from '@/lib/integrations/holdedStore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const integrations = await listTenantIntegrations(auth.tenantId);
  return NextResponse.json({
    items: integrations.map((row) => ({
      provider: row.provider,
      status: row.status,
      lastSyncAt: row.last_sync_at,
      lastError: row.last_error,
    })),
  });
}
