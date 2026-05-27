// C-B2 — Confirmar borrador 130 como presentado.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { submit130ForTenant } from '@/app/lib/isaak-modelo-130-repo';
import type { Trimestre } from '@/app/lib/fiscal-models';

export const runtime = 'nodejs';

const VALID_TRIMS = new Set(['1T', '2T', '3T', '4T']);

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session?.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    ejercicio?: number;
    periodo?: string;
    retencionesAcumuladas?: number;
    ingresosACuenta?: number;
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

  const result = await submit130ForTenant({
    tenantId: session.tenantId,
    ejercicio,
    periodo: periodo as Trimestre,
    submittedBy: session.userId,
    retencionesAcumuladas:
      typeof body.retencionesAcumuladas === 'number' ? body.retencionesAcumuladas : undefined,
    ingresosACuenta:
      typeof body.ingresosACuenta === 'number' ? body.ingresosACuenta : undefined,
  });

  if (!result.ok) {
    const httpStatus =
      result.error === 'no_draft' || result.error === 'compute_skipped'
        ? 404
        : result.error === 'duplicate_submission' || result.error === 'tax_return_not_in_draft'
          ? 409
          : 400;
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: httpStatus },
    );
  }

  return NextResponse.json({
    ok: true,
    submissionId: result.submissionId,
    taxReturnId: result.taxReturnId,
    payloadHash: result.payloadHash,
    resultado: result.result.resultado,
    ejercicio: result.result.ejercicio,
    periodo: result.result.periodo,
  });
}
