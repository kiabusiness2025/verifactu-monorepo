// V1.6.2 — Acciones en lote sobre notificaciones AEAT.
//
// POST /api/isaak/sede/notifications/bulk
// body: { ids: string[], action: 'mark_read' | 'archive' | 'mark_pending' }
//
// Cambia estado de hasta 100 notificaciones por llamada. Devuelve cuántas
// se actualizaron, cuántas se saltaron (por no pertenecer al tenant o por
// no existir) y cuántas se intentaron.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

const ACTIONS = ['mark_read', 'archive', 'mark_pending'] as const;
type BulkAction = (typeof ACTIONS)[number];

const ACTION_TO_ESTADO: Record<BulkAction, string> = {
  mark_read: 'leida',
  archive: 'archivada',
  mark_pending: 'pendiente',
};

const MAX_IDS = 100;

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { ids?: unknown; action?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: 'invalid_ids', message: 'Pasa al menos un id en `ids`.' },
      { status: 400 },
    );
  }
  if (body.ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: 'too_many_ids', message: `Máx ${MAX_IDS} por llamada.` },
      { status: 400 },
    );
  }
  const ids = body.ids.filter((x): x is string => typeof x === 'string');
  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'invalid_ids', message: 'Los ids deben ser strings.' },
      { status: 400 },
    );
  }

  if (typeof body.action !== 'string' || !(ACTIONS as readonly string[]).includes(body.action)) {
    return NextResponse.json(
      { error: 'invalid_action', allowed: ACTIONS },
      { status: 400 },
    );
  }
  const action = body.action as BulkAction;
  const estado = ACTION_TO_ESTADO[action];

  try {
    const result = await prisma.isaakAeatNotification.updateMany({
      where: {
        id: { in: ids },
        tenantId: session.tenantId,
      },
      data: {
        estado,
        acknowledgedAt: estado === 'leida' ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      action,
      requested: ids.length,
      updated: result.count,
      skipped: ids.length - result.count,
    });
  } catch (err) {
    console.error('[sede/notifications/bulk] failed', err);
    return NextResponse.json(
      { error: 'update_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
