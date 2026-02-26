import { requireTenantContext } from '@/lib/api/tenantAuth';
import { createSyncOutbox } from '@/lib/integrations/holdedStore';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const expense = await prisma.expenseRecord.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const docType = typeof body?.docType === 'string' ? body.docType : 'invoice';
  const taxCategory = typeof body?.taxCategory === 'string' ? body.taxCategory : 'iva_deducible';
  const aeatConcept = typeof body?.aeatConcept === 'string' ? body.aeatConcept : expense.category;
  const aeatKey = typeof body?.aeatKey === 'string' ? body.aeatKey : '';

  const notes = [
    expense.notes || null,
    `DocType:${docType}`,
    `TaxCategory:${taxCategory}`,
    `AEATConcept:${aeatConcept}`,
    aeatKey ? `AEATKey:${aeatKey}` : null,
    'ConfirmedByUser:true',
  ]
    .filter(Boolean)
    .join(' | ');

  const updated = await prisma.expenseRecord.update({
    where: { id: expense.id },
    data: {
      status: 'confirmed',
      notes,
    },
  });

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'expense',
    entityId: updated.id,
    action: 'upsert',
    payload: {
      expenseId: updated.id,
      description: updated.description,
      amount: updated.amount,
      date: updated.date,
      category: updated.category,
      status: updated.status,
      docType,
      taxCategory,
      aeatConcept,
      aeatKey,
    },
  });

  return NextResponse.json({ ok: true, expense: updated });
}
