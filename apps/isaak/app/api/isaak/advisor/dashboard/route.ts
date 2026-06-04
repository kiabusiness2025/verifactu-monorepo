// V1.9.2 + V2.0.1 — Datos agregados para el dashboard del asesor.
//
// GET /api/isaak/advisor/dashboard
//
// Devuelve:
//   - totals: cuántos clientes hay, cuántos con Holded conectado.
//   - upcomingDeadlines: próximos plazos fiscales filtrados por la
//     UNIÓN de modelos que algún cliente tiene configurados. Si ningún
//     cliente tiene perfil fiscal definido aún, se devuelven todos
//     (compatibilidad hacia atrás con V1.9.2).
//   - recentClients: últimos 5 clientes editados (por updatedAt), cada
//     uno con su próximo vencimiento si tiene perfil fiscal.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { getUpcomingDeadlines } from '@/app/lib/fiscal-calendar';
import {
  filterDeadlinesByModelos,
  getAllClientFiscalProfiles,
} from '@/app/lib/isaak-advisor-fiscal';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [clients, profiles] = await Promise.all([
    prisma.advisorClient.findMany({
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
    }),
    getAllClientFiscalProfiles(session.tenantId),
  ]);

  const withHolded = clients.filter((c) => !!c.holdedKeyMasked).length;
  const allUpcoming = getUpcomingDeadlines(45);

  // Modelos agregados (unión de todos los perfiles activos)
  const unionModelos = new Set<string>();
  for (const p of Object.values(profiles)) {
    for (const m of p.modelos) unionModelos.add(m);
  }

  const filteredUpcoming =
    unionModelos.size > 0
      ? filterDeadlinesByModelos(allUpcoming, [...unionModelos])
      : allUpcoming;

  const upcoming = filteredUpcoming.slice(0, 8).map((d) => ({
    id: d.id,
    title: d.title,
    modelo: d.modelo,
    date: d.date.toISOString().slice(0, 10),
    daysUntil: Math.max(0, Math.ceil((d.date.getTime() - Date.now()) / 86_400_000)),
    category: d.category,
  }));

  const recentClients = clients.slice(0, 5).map((c) => {
    const modelos = profiles[c.id]?.modelos ?? [];
    let nextDeadline: { modelo: string; daysUntil: number; date: string } | null = null;
    if (modelos.length > 0) {
      const clientDeadlines = filterDeadlinesByModelos(allUpcoming, modelos);
      const first = clientDeadlines[0];
      if (first) {
        nextDeadline = {
          modelo: first.modelo,
          daysUntil: Math.max(
            0,
            Math.ceil((first.date.getTime() - Date.now()) / 86_400_000),
          ),
          date: first.date.toISOString().slice(0, 10),
        };
      }
    }
    return {
      id: c.id,
      alias: c.alias,
      companyName: c.companyName,
      nif: c.nif,
      hasHolded: !!c.holdedKeyMasked,
      updatedAt: c.updatedAt.toISOString(),
      modelos,
      nextDeadline,
    };
  });

  return NextResponse.json({
    totals: {
      clients: clients.length,
      withHolded,
      withoutHolded: clients.length - withHolded,
    },
    upcomingDeadlines: upcoming,
    upcomingFilteredByProfiles: unionModelos.size > 0,
    recentClients,
  });
}
