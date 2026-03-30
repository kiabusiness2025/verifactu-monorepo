import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadBillingData, toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function GET() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await loadBillingData({ tenantId: session.tenantId, includeInvoices: true });
  return NextResponse.json({ ok: true, data });
}
