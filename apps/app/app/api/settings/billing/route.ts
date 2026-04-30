import { loadBillingData } from '@/app/lib/settings';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId')?.trim();

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId query parameter is required' }, { status: 400 });
  }

  try {
    const data = await loadBillingData({ tenantId, includeInvoices: true });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[app billing endpoint] error:', error);
    return NextResponse.json({ error: 'Failed to load billing data' }, { status: 500 });
  }
}
