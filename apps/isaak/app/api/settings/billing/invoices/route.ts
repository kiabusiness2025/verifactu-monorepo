import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadBillingInvoices, toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

export async function GET() {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invoices = await loadBillingInvoices(session.tenantId);
  return NextResponse.json({ ok: true, data: invoices });
}
