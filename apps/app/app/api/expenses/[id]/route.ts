import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';

/**
 * GET /api/expenses/[id]
 * Get expense details
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expense = await prisma.expenseRecord.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { supplier: true, tenant: { select: { name: true } } },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('GET /api/expenses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/expenses/[id]
 * Update expense
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user?.id || !session?.tenant?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.expenseRecord.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const body = await request.json();
    const { date, description, category, amount, taxRate, supplierId, accountCode, reference, notes } = body;

    // Verify supplier ownership if provided
    if (supplierId && supplierId !== existing.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, tenantId: session.tenantId },
      });
      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
      }
    }

    const expense = await prisma.expenseRecord.update({
      where: { id: params.id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(description && { description }),
        ...(category && { category }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
        ...(supplierId !== undefined && { supplierId }),
        ...(accountCode !== undefined && { accountCode }),
        ...(reference !== undefined && { reference }),
        ...(notes !== undefined && { notes }),
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('PATCH /api/expenses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/expenses/[id]
 * Delete expense
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.expenseRecord.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.expenseRecord.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/expenses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
