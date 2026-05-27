// POST /api/isaak/sede/sync — sincroniza manualmente la sede AEAT del
// tenant (notificaciones DEH + censo). Mismo flujo que el cron pero
// disparado on-demand por la UI o el sub-agente fiscal.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { syncAeatSedeForTenant } from '@/app/lib/aeat-sede-sync';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await syncAeatSedeForTenant(session.tenantId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'sync_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
