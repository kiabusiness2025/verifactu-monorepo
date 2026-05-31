import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { setActiveAdvisorClientId, clearActiveAdvisorClientId } from '@/app/lib/advisor-session';
import { prisma } from '@/app/lib/prisma';
import { logAdvisorEvent } from '@/app/lib/isaak-advisor-audit';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// POST /api/isaak/advisor/clients/[id]/switch — activate this client for chat
// POST /api/isaak/advisor/clients/clear/switch — clear advisor mode (back to own account)
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;

  if (id === 'clear') {
    await clearActiveAdvisorClientId();
    return NextResponse.json({ active: null });
  }

  const client = await prisma.advisorClient.findUnique({ where: { id } });
  if (!client || client.advisorTenantId !== session.tenantId || !client.isActive) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  await setActiveAdvisorClientId(id);
  void logAdvisorEvent(session.tenantId, 'client_switched', {
    clientId: id,
    alias: client.alias,
  });
  return NextResponse.json({ active: id, alias: client.alias, companyName: client.companyName });
}
