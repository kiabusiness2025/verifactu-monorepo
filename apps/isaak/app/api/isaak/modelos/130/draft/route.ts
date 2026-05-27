// C-B2 — Borrador del modelo 130.
//
// POST /api/isaak/modelos/130/draft
//   { ejercicio, periodo, retencionesAcumuladas?, ingresosACuenta?, persist? }
//   → { ok, output, taxReturnId?, persistedAsDraft? }

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { compute130ForTenant } from '@/app/lib/isaak-modelo-130-repo';
import type { Trimestre } from '@/app/lib/fiscal-models';

export const runtime = 'nodejs';

const VALID_TRIMS = new Set(['1T', '2T', '3T', '4T']);

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    ejercicio?: number;
    periodo?: string;
    retencionesAcumuladas?: number;
    ingresosACuenta?: number;
    persist?: boolean;
  };
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

  const retencionesAcumuladas =
    typeof body.retencionesAcumuladas === 'number' && Number.isFinite(body.retencionesAcumuladas)
      ? body.retencionesAcumuladas
      : undefined;
  const ingresosACuenta =
    typeof body.ingresosACuenta === 'number' && Number.isFinite(body.ingresosACuenta)
      ? body.ingresosACuenta
      : undefined;

  try {
    const result = await compute130ForTenant({
      tenantId: session.tenantId,
      ejercicio,
      periodo: periodo as Trimestre,
      retencionesAcumuladas,
      ingresosACuenta,
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
