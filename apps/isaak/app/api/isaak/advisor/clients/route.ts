import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { encryptHoldedSecret, maskSecret } from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';
import { getAllClientFiscalProfiles } from '@/app/lib/isaak-advisor-fiscal';
import { logAdvisorEvent } from '@/app/lib/isaak-advisor-audit';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const [clients, profiles] = await Promise.all([
    prisma.advisorClient.findMany({
      where: { advisorTenantId: session.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        alias: true,
        companyName: true,
        nif: true,
        holdedKeyMasked: true,
        notes: true,
        isActive: true,
        createdAt: true,
      },
    }),
    getAllClientFiscalProfiles(session.tenantId),
  ]);

  return NextResponse.json({
    clients: clients.map((c) => ({ ...c, modelos: profiles[c.id]?.modelos ?? [] })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.alias?.trim()) {
    return NextResponse.json({ error: 'El alias es obligatorio' }, { status: 400 });
  }

  const holdedApiKeyEnc = body.holdedApiKey?.trim()
    ? encryptHoldedSecret(body.holdedApiKey.trim())
    : null;
  const holdedKeyMasked = body.holdedApiKey?.trim() ? maskSecret(body.holdedApiKey.trim()) : null;

  const client = await prisma.advisorClient.create({
    data: {
      advisorTenantId: session.tenantId,
      alias: body.alias.trim(),
      companyName: body.companyName?.trim() || null,
      nif: body.nif?.trim() || null,
      holdedApiKeyEnc,
      holdedKeyMasked,
      notes: body.notes?.trim() || null,
    },
    select: {
      id: true,
      alias: true,
      companyName: true,
      nif: true,
      holdedKeyMasked: true,
      notes: true,
      isActive: true,
      createdAt: true,
    },
  });

  void logAdvisorEvent(session.tenantId, 'client_created', {
    clientId: client.id,
    alias: client.alias,
    hasHolded: !!client.holdedKeyMasked,
  });

  return NextResponse.json({ client }, { status: 201 });
}
