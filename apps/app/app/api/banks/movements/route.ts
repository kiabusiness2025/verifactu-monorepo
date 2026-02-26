import { requireTenantContext } from '@/lib/api/tenantAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');
  const status = request.nextUrl.searchParams.get('status') || 'unmatched';

  return NextResponse.json({
    items: [],
    source: 'holded',
    status,
    from,
    to,
    note: 'Sprint 3: pull real de movimientos desde Holded Treasury/Payments',
  });
}
