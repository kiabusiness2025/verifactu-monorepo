// DELETE /api/isaak/chift/disconnect

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function DELETE() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  await prisma.externalConnection.updateMany({
    where: {
      tenantId: session.tenantId,
      provider: 'chift',
      connectionStatus: { not: 'disconnected' },
    },
    data: {
      connectionStatus: 'disconnected',
      disconnectedAt: new Date(),
      apiKeyEnc: null,
      providerAccountId: null,
    },
  });

  return NextResponse.json({ ok: true });
}
