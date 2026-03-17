import { requireTenantContext } from '@/lib/api/tenantAuth';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { quoteCreate, quoteFindMany } from '@/lib/quotes/repo';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function buildQuoteNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `Q-${yyyy}${mm}${dd}-${rand}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const status = req.nextUrl.searchParams.get('status') || undefined;
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const where: Record<string, unknown> = { tenantId: auth.tenantId };
  if (status) where.status = status;
  if (from || to) {
    where.issueDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const quotes = await quoteFindMany({
    where,
    include: { customer: true },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ items: quotes });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = typeof body?.customerId === 'string' ? body.customerId : '';
  const number = typeof body?.number === 'string' && body.number.trim() ? body.number.trim() : buildQuoteNumber();
  const issueDateRaw = typeof body?.issueDate === 'string' ? body.issueDate : '';
  const validUntilRaw = typeof body?.validUntil === 'string' ? body.validUntil : '';
  const currency = typeof body?.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : 'EUR';
  const status = typeof body?.status === 'string' && body.status.trim() ? body.status.trim() : 'draft';
  const notes = typeof body?.notes === 'string' ? body.notes : null;
  const source = typeof body?.source === 'string' ? body.source : 'local';
  const lines = body?.lines ?? [];
  const totals = body?.totals ?? {};

  if (!customerId) {
    return NextResponse.json({ error: 'customerId es obligatorio' }, { status: 400 });
  }
  if (!issueDateRaw) {
    return NextResponse.json({ error: 'issueDate es obligatorio' }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const quote = await quoteCreate({
    data: {
      tenantId: auth.tenantId,
      customerId,
      number,
      issueDate: new Date(issueDateRaw),
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
      currency,
      status,
      lines,
      totals,
      notes,
      source,
    },
    include: { customer: true },
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'quote',
    entityId: quote.id,
    action: 'upsert',
    payload: {
      quoteId: quote.id,
      number: quote.number,
      status: quote.status,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      customerId: quote.customerId,
      currency: quote.currency,
      lines: quote.lines,
      totals: quote.totals,
      notes: quote.notes,
    },
  });

  return NextResponse.json(quote, { status: 201 });
}
