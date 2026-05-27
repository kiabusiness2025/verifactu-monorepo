// F12 — Inspector AEAT Capa 2 — endpoint para preguntas con citas BOE.
//
// POST /api/isaak/inspector/consult
//   { query: string, topK?: number }
//   → { ok, answer, citations[], profile, model, latencyMs }

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { consultInspector } from '@/app/lib/inspector-capa-2';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { query?: string; topK?: number };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const query = String(body.query ?? '').trim();
  if (!query) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'query es obligatorio' },
      { status: 400 },
    );
  }

  const topK = typeof body.topK === 'number' ? body.topK : undefined;

  const result = await consultInspector({
    tenantId: session.tenantId,
    query,
    topK,
  });

  if (!result.ok) {
    const httpStatus =
      result.error === 'invalid_input'
        ? 400
        : result.error === 'no_corpus_hits'
          ? 404
          : 500;
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: httpStatus },
    );
  }

  return NextResponse.json({
    ok: true,
    answer: result.answer,
    citations: result.citations,
    profile: result.profile,
    corpusHits: result.corpusHits,
    model: result.model,
    latencyMs: result.latencyMs,
  });
}
