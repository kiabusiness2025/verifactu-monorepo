// V1.9.2 — Datos agregados para el dashboard del asesor.
//
// GET /api/isaak/advisor/dashboard
//
// Devuelve:
//   - totals: cuántos clientes hay, cuántos con Holded conectado.
//   - upcomingDeadlines: próximos plazos fiscales AEAT (genéricos, no
//     per-cliente — el modelo actual no separa data por cliente).
//   - recentClients: últimos 5 clientes editados (por updatedAt).

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { getUpcomingDeadlines } from '@/app/lib/fiscal-calendar';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const clients = await prisma.advisorClient.findMany({
    where: { advisorTenantId: session.tenantId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      alias: true,
      companyName: true,
      nif: true,
      holdedKeyMasked: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const withHolded = clients.filter((c) => !!c.holdedKeyMasked).length;
  const upcoming = getUpcomingDeadlines(45).slice(0, 8).map((d) => ({
    id: d.id,
    title: d.title,
    modelo: d.modelo,
    date: d.date.toISOString().slice(0, 10),
    daysUntil: Math.max(
      0,
      Math.ceil((d.date.getTime() - Date.now()) / 86_400_000),
    ),
    category: d.category,
  }));

  return NextResponse.json({
    totals: {
      clients: clients.length,
      withHolded,
      withoutHolded: clients.length - withHolded,
    },
    upcomingDeadlines: upcoming,
    recentClients: clients.slice(0, 5).map((c) => ({
      id: c.id,
      alias: c.alias,
      companyName: c.companyName,
      nif: c.nif,
      hasHolded: !!c.holdedKeyMasked,
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}
