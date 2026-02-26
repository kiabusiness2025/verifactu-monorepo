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

  const body = await request.json().catch(() => ({}));
  const amount = Number(body?.amount ?? 0);
  const description = typeof body?.description === 'string' ? body.description : `Movimiento ${id}`;

  const expense = await prisma.expenseRecord.create({
    data: {
      tenantId: auth.tenantId,
      status: 'received',
      date: body?.date ? new Date(body.date) : new Date(),
      description,
      category: body?.category || 'Otros gastos',
      amount: Number.isFinite(amount) ? amount : 0,
      taxRate: Number.isFinite(Number(body?.taxRate)) ? Number(body.taxRate) : 0,
      reference: `bank:${id}`,
      notes: 'Source:bank_movement | DocType:bank_fee | TaxCategory:iva_no_deducible',
    },
  });

  return NextResponse.json({ ok: true, movementId: id, expenseId: expense.id, expense });
}
