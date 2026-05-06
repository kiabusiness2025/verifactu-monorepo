import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const movement = await prisma.seTransaction.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
    },
    select: {
      id: true,
      madeOn: true,
      amount: true,
      description: true,
      category: true,
      reconciledAt: true,
    },
  });

  if (!movement) {
    return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    description?: string;
    date?: string;
    category?: string;
    taxRate?: number;
  };

  const existingExpense = await prisma.expenseRecord.findFirst({
    where: {
      tenantId: auth.tenantId,
      reference: `bank:${id}`,
    },
  });

  if (existingExpense) {
    if (!movement.reconciledAt) {
      await prisma.seTransaction.update({
        where: { id },
        data: { reconciledAt: new Date() },
      });
    }

    return NextResponse.json({
      ok: true,
      movementId: id,
      expenseId: existingExpense.id,
      expense: existingExpense,
      reconciledAt: movement.reconciledAt ?? new Date(),
      deduplicated: true,
    });
  }

  const parsedAmount = Number(body.amount);
  const fallbackAmount = Math.abs(Number(movement.amount));
  const safeAmount = Number.isFinite(parsedAmount) ? Math.abs(parsedAmount) : fallbackAmount;
  const parsedTaxRate = Number(body.taxRate);

  const expense = await prisma.expenseRecord.create({
    data: {
      tenantId: auth.tenantId,
      status: 'received',
      date: body.date ? new Date(body.date) : new Date(movement.madeOn),
      description:
        typeof body.description === 'string' && body.description.trim().length > 0
          ? body.description.trim()
          : movement.description,
      category:
        typeof body.category === 'string' && body.category.trim().length > 0
          ? body.category.trim()
          : movement.category || 'Otros gastos',
      amount: safeAmount,
      taxRate: Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0,
      reference: `bank:${id}`,
      notes: 'Source:bank_movement | CreatedBy:api/banks/movements/[id]/create-expense',
    },
  });

  const updatedMovement = await prisma.seTransaction.update({
    where: { id },
    data: {
      reconciledAt: new Date(),
    },
    select: {
      id: true,
      reconciledAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    movementId: id,
    expenseId: expense.id,
    expense,
    reconciledAt: updatedMovement.reconciledAt,
  });
}
