import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    reconciled?: boolean;
    reconciledAt?: string;
  };

  const movement = await prisma.seTransaction.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
    },
    select: {
      id: true,
      reconciledAt: true,
    },
  });

  if (!movement) {
    return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
  }

  const shouldReconcile = body.reconciled !== false;
  const targetDate = body.reconciledAt ? new Date(body.reconciledAt) : new Date();

  const updated = await prisma.seTransaction.update({
    where: { id },
    data: {
      reconciledAt: shouldReconcile ? targetDate : null,
    },
    select: {
      id: true,
      reconciledAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    movementId: id,
    tenantId: auth.tenantId,
    reconciled: Boolean(updated.reconciledAt),
    reconciledAt: updated.reconciledAt,
  });
}
