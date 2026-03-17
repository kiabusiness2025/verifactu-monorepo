import { requireTenantContext } from '@/lib/api/tenantAuth';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import type { Prisma } from '@verifactu/db';
import { quoteFindFirst } from '@/lib/quotes/repo';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function deriveTotals(totals: unknown) {
  const obj = totals && typeof totals === 'object' ? (totals as Record<string, unknown>) : {};
  const amountNet = toNumber(obj.amountNet ?? obj.base ?? obj.subtotal ?? 0);
  const amountTax = toNumber(obj.amountTax ?? obj.tax ?? obj.iva ?? 0);
  const amountGross = toNumber(obj.amountGross ?? obj.total ?? amountNet + amountTax);
  return { amountNet, amountTax, amountGross };
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!quote.customer) return NextResponse.json({ error: 'Quote customer not found' }, { status: 409 });
  const quoteCustomer = quote.customer;

  const totals = deriveTotals(quote.totals);
  const invoiceNumber = `F-${quote.number.replace(/^Q-?/, '')}`;

  const created = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        tenantId: quote.tenantId,
        customerId: quote.customerId,
        number: invoiceNumber,
        issueDate: new Date(),
        customerName: quoteCustomer.name,
        customerNif: quoteCustomer.nif || null,
        currency: quote.currency,
        amountNet: totals.amountNet,
        amountTax: totals.amountTax,
        amountGross: totals.amountGross,
        status: 'draft',
        notes: quote.notes || `Convertida desde presupuesto ${quote.number}`,
        createdBy: auth.session.uid || 'system',
      } satisfies Prisma.InvoiceUncheckedCreateInput,
    });

    await (
      tx as unknown as {
        quote: { update: (args: unknown) => Promise<unknown> };
      }
    ).quote.update({
      where: { id: quote.id },
      data: { status: 'accepted' },
    });

    return invoice;
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'invoice',
    entityId: created.id,
    action: 'upsert',
    payload: {
      invoiceId: created.id,
      number: created.number,
      issueDate: created.issueDate,
      amountGross: created.amountGross,
      status: created.status,
      sourceQuoteId: quote.id,
    },
  });

  return NextResponse.json({ ok: true, invoice: created, quoteId: quote.id });
}
