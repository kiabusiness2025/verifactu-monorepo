import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { createSyncOutbox } from '@/lib/integrations/holdedStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'sent' },
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'invoice',
    entityId: updated.id,
    action: 'upsert',
    payload: {
      invoiceId: updated.id,
      number: updated.number,
      issueDate: updated.issueDate,
      amountGross: updated.amountGross,
      status: updated.status,
    },
  });

  return NextResponse.json({ ok: true, invoice: updated });
}
