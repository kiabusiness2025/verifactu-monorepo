import { requireTenantContext } from '@/lib/api/tenantAuth';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { quoteFindFirst, quoteUpdate } from '@/lib/quotes/repo';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const quote = await quoteFindFirst({
    where: { id, tenantId: auth.tenantId },
    include: { customer: true },
  });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  return NextResponse.json(quote);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const existing = await quoteFindFirst({ where: { id, tenantId: auth.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body?.number === 'string') data.number = body.number.trim();
  if (typeof body?.status === 'string') data.status = body.status.trim();
  if (typeof body?.issueDate === 'string') data.issueDate = new Date(body.issueDate);
  if (typeof body?.validUntil === 'string') data.validUntil = new Date(body.validUntil);
  if (body?.validUntil === null) data.validUntil = null;
  if (typeof body?.customerId === 'string') {
    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    data.customerId = body.customerId;
  }
  if (typeof body?.currency === 'string') data.currency = body.currency.trim().toUpperCase();
  if (typeof body?.notes === 'string') data.notes = body.notes;
  if (body?.notes === null) data.notes = null;
  if (typeof body?.source === 'string') data.source = body.source;
  if (body?.lines !== undefined) data.lines = body.lines;
  if (body?.totals !== undefined) data.totals = body.totals;

  const updated = await quoteUpdate({
    where: { id },
    data,
    include: { customer: true },
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'quote',
    entityId: updated.id,
    action: 'upsert',
    payload: {
      quoteId: updated.id,
      number: updated.number,
      status: updated.status,
      issueDate: updated.issueDate,
      validUntil: updated.validUntil,
      customerId: updated.customerId,
      currency: updated.currency,
      lines: updated.lines,
      totals: updated.totals,
      notes: updated.notes,
    },
  });

  return NextResponse.json(updated);
}
