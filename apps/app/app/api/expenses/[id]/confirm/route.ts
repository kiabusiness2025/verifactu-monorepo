import { requireTenantContext } from '@/lib/api/tenantAuth';
import { normalizeCanonicalExpense } from '@/lib/expenses/canonical';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
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

  const docType = typeof body?.docType === 'string' ? body.docType : expense.docType;
  const taxCategory = typeof body?.taxCategory === 'string' ? body.taxCategory : expense.taxCategory;
  const aeatConcept = typeof body?.aeatConcept === 'string' ? body.aeatConcept : expense.aeatConcept || expense.category;
  const aeatKey = typeof body?.aeatKey === 'string' ? body.aeatKey : expense.aeatKey || '';
  const canonical = normalizeCanonicalExpense({
    tenantId: auth.tenantId,
    issueDate: expense.date.toISOString(),
    description: expense.description,
    amount: Number(expense.amount),
    taxRate: Number(expense.taxRate),
    categoryName: expense.category,
    reference: expense.reference || undefined,
    docType,
    taxCategory,
    aeatConcept,
    aeatKey: aeatKey || null,
    source: 'isaak',
  });

  const notes = [
    expense.notes || null,
    `DocType:${canonical.docType}`,
    `TaxCategory:${canonical.taxCategory}`,
    `AEATConcept:${canonical.canonicalV2.aeatConcept || aeatConcept}`,
    aeatKey ? `AEATKey:${aeatKey}` : null,
    canonical.warnings.length ? `Warnings:${canonical.warnings.join(',')}` : null,
    'ConfirmedByUser:true',
  ]
    .filter(Boolean)
    .join(' | ');

  const updateData = {
    status: 'confirmed',
    canonicalStatus: 'confirmed',
    confirmedAt: new Date(),
    confirmedByUserId: auth.session.uid,
    docType: canonical.docType,
    taxCategory: canonical.taxCategory,
    aeatConcept: canonical.canonicalV2.aeatConcept || aeatConcept,
    aeatKey: canonical.canonicalV2.aeatKey || null,
    warningsJson: canonical.warnings,
    confidenceJson: canonical.confidence,
    canonicalV2Json: canonical.canonicalV2,
    lastConfirmedSnapshotJson: canonical.canonicalV2,
    notes,
  };

  const updated = await prisma.expenseRecord.update({
    where: { id: expense.id },
    data: updateData as never,
  });

  const updatedWithMeta = updated as typeof updated & { canonicalStatus?: string | null };

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
      canonicalStatus: updatedWithMeta.canonicalStatus || 'confirmed',
      docType: canonical.docType,
      taxCategory: canonical.taxCategory,
      aeatConcept: canonical.canonicalV2.aeatConcept || aeatConcept,
      aeatKey: canonical.canonicalV2.aeatKey || null,
      canonicalV2: canonical.canonicalV2,
      warnings: canonical.warnings,
    } as const,
  });

  return NextResponse.json({ ok: true, expense: updated });
}
