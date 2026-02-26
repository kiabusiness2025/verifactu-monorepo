import { requireTenantContext } from '@/lib/api/tenantAuth';
import { listSyncLogs } from '@/lib/integrations/holdedStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cursor = request.nextUrl.searchParams.get('cursor');
  const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

  const rows = await listSyncLogs(auth.tenantId, limit, cursor);
  const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;

  return NextResponse.json({
    items: rows,
    nextCursor,
  });
}
