import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getReconciliationMetrics } from '@/lib/banking/reconciliationAutomation';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function hasMonitorAccess(request: NextRequest) {
  const monitorToken = process.env.MONITOR_API_TOKEN?.trim();
  if (!monitorToken) return false;

  const headerToken = request.headers.get('x-monitor-token') ?? getBearerToken(request);
  return Boolean(headerToken && headerToken === monitorToken);
}

export async function GET(request: NextRequest) {
  if (hasMonitorAccess(request)) {
    const metrics = await getReconciliationMetrics();
    return NextResponse.json({ ok: true, scope: 'global', metrics });
  }

  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const metrics = await getReconciliationMetrics({ tenantId: auth.tenantId });
  return NextResponse.json({ ok: true, scope: 'tenant', tenantId: auth.tenantId, metrics });
}
