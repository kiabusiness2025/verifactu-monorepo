// GET /api/isaak/sede/pending-count — count de notificaciones AEAT
// pendientes (estado='pendiente' y acknowledgedAt=null) del tenant.
// Endpoint barato (un COUNT() filtrado por tenant_id), invocable por
// la UI cada N minutos para mantener el badge del sidebar al día.

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ pending: 0 });
  }
  try {
    const [pending, critical] = await Promise.all([
      prisma.isaakAeatNotification.count({
        where: {
          tenantId: session.tenantId,
          estado: 'pendiente',
          acknowledgedAt: null,
        },
      }),
      prisma.isaakAeatNotification.count({
        where: {
          tenantId: session.tenantId,
          estado: 'pendiente',
          acknowledgedAt: null,
          alertSent: true, // se mandó alerta = severity >= high
        },
      }),
    ]);
    return NextResponse.json({ pending, critical });
  } catch {
    // Fail-open: si Prisma falla, devolvemos 0 para que la UI no se rompa.
    return NextResponse.json({ pending: 0, critical: 0 });
  }
}
