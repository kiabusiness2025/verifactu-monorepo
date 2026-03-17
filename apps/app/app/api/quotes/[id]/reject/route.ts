import { requireTenantContext } from '@/lib/api/tenantAuth';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
import { quoteFindFirst, quoteUpdate } from '@/lib/quotes/repo';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const quote = await quoteFindFirst({ where: { id, tenantId: auth.tenantId } });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const updated = await quoteUpdate({
    where: { id: quote.id },
    data: { status: 'rejected' },
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'quote',
    entityId: updated.id,
    action: 'upsert',
    payload: { quoteId: updated.id, status: updated.status },
  });

  return NextResponse.json({ ok: true, quote: updated });
}
