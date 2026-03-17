import { requireTenantContext } from '@/lib/api/tenantAuth';
import { normalizeCanonicalExpense } from '@/lib/expenses/canonical';
import { classifyExpense } from '@/lib/expenses/classify';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const expense = await prisma.expenseRecord.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const suggestion = await classifyExpense(expense.description);
  if (!suggestion) {
    return NextResponse.json({ error: 'No se pudo generar sugerencia de Isaak' }, { status: 400 });
  }

  const taxCategory = suggestion.taxCategory;
  const docType = suggestion.docType;
  const canonical = normalizeCanonicalExpense({
    tenantId: auth.tenantId,
    issueDate: expense.date.toISOString(),
    description: expense.description,
    amount: Number(expense.amount),
    taxRate: Number(expense.taxRate),
    categoryName: suggestion.name,
    deductible: suggestion.is_deductible,
    docType,
    taxCategory,
    aeatConcept: suggestion.name,
    source: 'isaak',
  });

  const notes = [
    expense.notes || null,
    `DocType:${docType}`,
    `TaxCategory:${taxCategory}`,
    `AEATConcept:${suggestion.name}`,
    suggestion.signals.hasVat ? 'Signal:hasVat' : null,
    suggestion.signals.hasTaxId ? 'Signal:hasTaxId' : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const updateData = {
    category: suggestion.name,
    docType,
    taxCategory,
    aeatConcept: suggestion.name,
    canonicalStatus: 'suggested',
    warningsJson: canonical.warnings,
    confidenceJson: canonical.confidence,
    canonicalV2Json: canonical.canonicalV2,
    notes,
  };

  const updated = await prisma.expenseRecord.update({
    where: { id: expense.id },
    data: updateData as never,
  });

  return NextResponse.json({
    ok: true,
    expense: updated,
    suggestion: {
      category: suggestion.name,
      taxCategory,
      docType,
      deductible: suggestion.is_deductible,
      signals: suggestion.signals,
    },
  });
}
