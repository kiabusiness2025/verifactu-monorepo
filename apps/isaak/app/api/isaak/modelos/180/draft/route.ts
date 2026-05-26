// C-B7 — Borrador modelo 180 (anual).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { compute180ForTenant } from '@/app/lib/isaak-modelo-180-repo';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: { ejercicio?: number; persist?: boolean };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }
  const ejercicio = typeof body.ejercicio === 'number' ? body.ejercicio : NaN;
  if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
    return NextResponse.json({ error: 'invalid_ejercicio' }, { status: 400 });
  }
  try {
    const result = await compute180ForTenant({
      tenantId: session.tenantId,
      ejercicio,
      persist: body.persist === true,
      createdBy: session.userId ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'compute_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
