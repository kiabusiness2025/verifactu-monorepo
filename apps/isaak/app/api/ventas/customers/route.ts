import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    where: { tenantId: session.tenantId, isActive: true },
    select: { id: true, name: true, nif: true },
    orderBy: { name: 'asc' },
    take: 200,
  });

  return NextResponse.json({ ok: true, customers });
}
