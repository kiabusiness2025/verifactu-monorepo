import { requireTenantContext } from '@/lib/api/tenantAuth';
import { disconnectAccountingIntegration } from '@/lib/integrations/accountingStore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const updated = await disconnectAccountingIntegration(auth.tenantId);
  return NextResponse.json({
    ok: true,
    provider: 'accounting_api',
    status: updated?.status ?? 'disconnected',
  });
}
