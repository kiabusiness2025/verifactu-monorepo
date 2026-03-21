import { getSessionPayload } from '@/lib/session';
import { ensureTenantAccess } from '@/src/server/workspace';
import { prisma } from '@verifactu/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ expenseId: string }> }) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { expenseId } = await ctx.params;

    const expense = await prisma.expenseRecord.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        tenantId: true,
        status: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    await ensureTenantAccess(session.uid, expense.tenantId);

    if (expense.status === 'paid') {
      return NextResponse.json({ ok: true, alreadyPaid: true }, { status: 200 });
    }

    const updated = await prisma.expenseRecord.update({
      where: { id: expense.id },
      data: { status: 'paid' },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, expense: updated }, { status: 200 });
  } catch (error) {
    console.error('Error marking expense as paid:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
