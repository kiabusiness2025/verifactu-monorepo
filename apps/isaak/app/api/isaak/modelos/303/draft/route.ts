// C-B1 — Borrador del modelo 303.
//
// POST /api/isaak/modelos/303/draft
//   { ejercicio: 2026, periodo: '2T', persist?: true }
//   → { ok, output, taxReturnId?, persistedAsDraft? }
//
// tenantId siempre desde sesión. persist=true guarda como
// IsaakTaxReturn con status='draft'.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { compute303ForTenant } from '@/app/lib/isaak-modelo-303-repo';
import type { Trimestre } from '@/app/lib/fiscal-models';

export const runtime = 'nodejs';

const VALID_TRIMS = new Set(['1T', '2T', '3T', '4T']);

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { ejercicio?: number; periodo?: string; persist?: boolean };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const ejercicio = typeof body.ejercicio === 'number' ? body.ejercicio : NaN;
  if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
    return NextResponse.json(
      { error: 'invalid_ejercicio', message: 'ejercicio debe ser un año entre 2020 y 2100' },
      { status: 400 },
    );
  }

  const periodo = String(body.periodo ?? '').toUpperCase();
  if (!VALID_TRIMS.has(periodo)) {
    return NextResponse.json(
      { error: 'invalid_periodo', allowed: ['1T', '2T', '3T', '4T'] },
      { status: 400 },
    );
  }

  try {
    const result = await compute303ForTenant({
      tenantId: session.tenantId,
      ejercicio,
      periodo: periodo as Trimestre,
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
