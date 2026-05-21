import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function DELETE() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  await prisma.isaakMicrosoftToken
    .delete({
      where: { tenantId_userId: { tenantId: session.tenantId, userId: session.userId } },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
