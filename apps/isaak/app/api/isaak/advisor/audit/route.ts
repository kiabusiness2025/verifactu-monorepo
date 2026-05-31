// V2.0.4 — Lectura del audit log del asesor.
//
// GET /api/isaak/advisor/audit?limit=50
//
// Devuelve los últimos eventos auditados (creación/edición/borrado
// /switch de cliente, perfil fiscal, importación, cartas) del tenant
// actual.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { listAdvisorEvents } from '@/app/lib/isaak-advisor-audit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

  const events = await listAdvisorEvents(session.tenantId, limit);
  return NextResponse.json({ events });
}
