import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const amount = Number(body?.amount ?? invoice.amountGross);
  const method = typeof body?.method === 'string' ? body.method : 'bank_transfer';
  const reference = typeof body?.reference === 'string' ? body.reference : null;
  const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();

  const payment = await prisma.payment.create({
    data: {
      tenantId: auth.tenantId,
      invoiceId: invoice.id,
      amount: Number.isFinite(amount) ? amount : 0,
      method,
      reference,
      paidAt,
    },
  });

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'paid' },
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'payment',
    entityId: payment.id,
    action: 'upsert',
    payload: {
      paymentId: payment.id,
      invoiceId: invoice.id,
      amount: payment.amount,
      paidAt: payment.paidAt,
      method: payment.method,
    },
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'invoice',
    entityId: updated.id,
    action: 'upsert',
    payload: {
      eventType: 'invoice.paid',
      invoiceId: updated.id,
      number: updated.number,
      issueDate: updated.issueDate,
      amountGross: updated.amountGross,
      status: updated.status,
    },
  });

  return NextResponse.json({ ok: true, invoice: updated, payment });
}
