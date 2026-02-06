import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { normalizeCanonicalExpense } from '@/lib/expenses/canonical';
import { classifyExpense } from '@/lib/expenses/classify';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });

    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const body = await request.json();

    const matchedCategory = await classifyExpense(body?.description ?? '');
    if (!matchedCategory) {
      return NextResponse.json({ error: 'No se pudo clasificar el gasto' }, { status: 400 });
    }

    let canonical;
    try {
      canonical = normalizeCanonicalExpense({
        tenantId,
        date: body?.date,
        description: body?.description,
        amount: Number(body?.amount),
        taxRate: body?.taxRate ? Number(body?.taxRate) : undefined,
        categoryId: matchedCategory.id,
        categoryName: matchedCategory.name,
        deductible: matchedCategory.is_deductible,
        reference: body?.reference,
        notes: body?.notes,
        source: body?.source,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Falta información del gasto' },
        { status: 400 }
      );
    }

    const noteParts = [
      canonical.notes,
      `Deducible:${matchedCategory.is_deductible ? 'sí' : 'no'}`,
      `Origen:${canonical.source}`,
      body?.fileUrl ? `Documento:${body.fileUrl}` : null,
      body?.fileName ? `Archivo:${body.fileName}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const expense = await prisma.expenseRecord.create({
      data: {
        tenantId,
        status: 'received',
        date: new Date(canonical.date),
        description: canonical.description,
        category: canonical.categoryName || matchedCategory.name,
        amount: canonical.amount,
        taxRate: canonical.taxRate,
        reference: canonical.reference || null,
        notes: noteParts || null,
      },
    });

    return NextResponse.json({
      ok: true,
      expenseId: expense.id,
      category: matchedCategory.name,
      deductible: matchedCategory.is_deductible,
    });
  } catch (error) {
    console.error('POST /api/expenses/intake:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
