// C-B8 — Confirmar borrador 190.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { submit190ForTenant } from '@/app/lib/isaak-modelo-190-repo';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session?.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: { ejercicio?: number };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }
  const ejercicio = typeof body.ejercicio === 'number' ? body.ejercicio : NaN;
  if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
    return NextResponse.json({ error: 'invalid_ejercicio' }, { status: 400 });
  }
  const result = await submit190ForTenant({
    tenantId: session.tenantId,
    ejercicio,
    submittedBy: session.userId,
  });
  if (!result.ok) {
    const httpStatus =
      result.error === 'no_draft' || result.error === 'compute_skipped'
        ? 404
        : result.error === 'duplicate_submission' || result.error === 'tax_return_not_in_draft'
          ? 409
          : 400;
    return NextResponse.json({ error: result.error, message: result.message }, { status: httpStatus });
  }
  return NextResponse.json({
    ok: true,
    submissionId: result.submissionId,
    taxReturnId: result.taxReturnId,
    payloadHash: result.payloadHash,
    ejercicio: result.result.ejercicio,
    perceptoresTrabajadores: result.result.perceptoresTrabajadores,
    perceptoresProfesionales: result.result.perceptoresProfesionales,
    totalRetenciones: result.result.totalRetenciones,
  });
}
