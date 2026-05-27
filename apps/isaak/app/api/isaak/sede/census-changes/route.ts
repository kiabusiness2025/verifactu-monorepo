// GET /api/isaak/sede/census-changes?days=90
//
// Lista los cambios censales (036/037) detectados por el cron C-A2
// para el tenant en la ventana indicada. Ordenado por fecha
// descendente. tenantId siempre desde sesión.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const daysParam = new URL(req.url).searchParams.get('days');
  const days = Math.max(
    1,
    Math.min(365, daysParam ? Number.parseInt(daysParam, 10) || 90 : 90),
  );
  const since = new Date(Date.now() - days * 86_400_000);
  try {
    const rows = await prisma.isaakAeatCensusChange.findMany({
      where: { tenantId: session.tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        field: true,
        changeType: true,
        oldValue: true,
        newValue: true,
        alertSent: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      changes: rows.map((r) => ({
        id: r.id,
        field: r.field,
        changeType: r.changeType,
        oldValue: r.oldValue,
        newValue: r.newValue,
        alertSent: r.alertSent,
        detectedAt: r.createdAt.toISOString(),
      })),
      windowDays: days,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'list_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
