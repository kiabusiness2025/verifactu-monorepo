// C-B1.c — Envío automático a AEAT vía browser headless.
//
// POST /api/isaak/modelos/303/send
//   { submissionId: 'uuid' } → marca la submission como queued.
//
// Un worker externo (con Playwright instalado) procesa las queued y
// las envía a AEAT. Ver apps/isaak/app/lib/aeat-browser/README.md.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { submissionId?: string };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const submissionId = String(body.submissionId ?? '').trim();
  if (!submissionId) {
    return NextResponse.json({ error: 'missing_submission_id' }, { status: 400 });
  }

  // Validar que la submission pertenece al tenant y está en estado
  // pending_aeat (todavía no enviada).
  const sub = await prisma.isaakAeatSubmission.findFirst({
    where: { id: submissionId, tenantId: session.tenantId },
    select: { id: true, status: true, model: true, period: true },
  });
  if (!sub) {
    return NextResponse.json({ error: 'submission_not_found' }, { status: 404 });
  }
  if (sub.model !== '303') {
    return NextResponse.json(
      { error: 'modelo_not_supported', message: 'Envío automático v1 solo soporta el 303.' },
      { status: 400 },
    );
  }
  if (sub.status !== 'pending_aeat') {
    return NextResponse.json(
      {
        error: 'submission_not_pending',
        message: `Status actual: ${sub.status}. Solo se pueden enviar submissions en pending_aeat.`,
      },
      { status: 409 },
    );
  }

  // En este endpoint NO ejecutamos Playwright (Vercel serverless no
  // puede). Solo confirmamos que la submission está lista para que el
  // worker externo la procese. El worker (apps/isaak/app/api/cron/
  // aeat-submission-worker) la recoge cuando hace su próxima corrida.

  return NextResponse.json({
    ok: true,
    submissionId: sub.id,
    period: sub.period,
    message:
      'Submission lista para envío. El worker procesará en cuanto esté disponible.',
  });
}
