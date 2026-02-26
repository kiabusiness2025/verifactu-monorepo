import { requireTenantContext } from '@/lib/api/tenantAuth';
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

  const taxCategory = suggestion.is_deductible ? 'iva_deducible' : 'iva_no_deducible';
  const docType = 'invoice';

  const notes = [
    expense.notes || null,
    `DocType:${docType}`,
    `TaxCategory:${taxCategory}`,
    `AEATConcept:${suggestion.name}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const updated = await prisma.expenseRecord.update({
    where: { id: expense.id },
    data: {
      category: suggestion.name,
      notes,
    },
  });

  return NextResponse.json({
    ok: true,
    expense: updated,
    suggestion: {
      category: suggestion.name,
      taxCategory,
      docType,
      deductible: suggestion.is_deductible,
    },
  });
}
