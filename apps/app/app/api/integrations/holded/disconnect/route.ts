import { requireTenantContext } from '@/lib/api/tenantAuth';
import { disconnectHoldedIntegration } from '@/lib/integrations/holdedStore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const updated = await disconnectHoldedIntegration(auth.tenantId);
  return NextResponse.json({
    ok: true,
    provider: 'holded',
    status: updated?.status ?? 'disconnected',
  });
}
