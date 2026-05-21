// GET /api/isaak/chift/status

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { isChiftConfigured } from '@/app/lib/chift-client';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const conn = await prisma.externalConnection
    .findFirst({
      where: {
        tenantId: session.tenantId,
        provider: 'chift',
        connectionStatus: { not: 'disconnected' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        connectionStatus: true,
        providerAccountId: true,
        companyIdentityJson: true,
        connectedAt: true,
        lastError: true,
      },
    })
    .catch(() => null);

  const identity = conn?.companyIdentityJson as Record<string, unknown> | null;

  return NextResponse.json({
    connected: conn?.connectionStatus === 'connected',
    status: conn?.connectionStatus ?? 'disconnected',
    connectionId: conn?.providerAccountId ?? null,
    companyName: identity?.name ?? null,
    companyVat: identity?.vat ?? null,
    currency: identity?.currency ?? null,
    connectedAt: conn?.connectedAt?.toISOString() ?? null,
    lastError: conn?.lastError ?? null,
    chiftConfigured: isChiftConfigured(),
  });
}
