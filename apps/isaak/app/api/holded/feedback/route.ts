/**
 * POST /api/holded/feedback
 * Registra thumbs up/down de una respuesta Isaak para aprendizaje few-shot por tenant.
 */

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { toSettingsSession } from '@/app/lib/settings';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

const ENSURE_TABLE = `
  CREATE TABLE IF NOT EXISTS isaak_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key  TEXT NOT NULL DEFAULT 'admin',
    question    TEXT NOT NULL,
    response    TEXT NOT NULL,
    rating      TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
    context     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const ADD_TENANT_COLUMN = `
  ALTER TABLE isaak_feedback ADD COLUMN IF NOT EXISTS tenant_id UUID
`;

export async function POST(req: Request) {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    question?: string;
    response?: string;
    rating?: string;
    conversationId?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { question, response, rating, conversationId } = body;

  if (!question || !response || !rating) {
    return NextResponse.json(
      { error: 'question, response y rating son requeridos' },
      { status: 400 }
    );
  }
  if (rating !== 'thumbs_up' && rating !== 'thumbs_down') {
    return NextResponse.json({ error: 'rating debe ser thumbs_up o thumbs_down' }, { status: 400 });
  }

  try {
    await prisma.$executeRawUnsafe(ENSURE_TABLE);
    await prisma.$executeRawUnsafe(ADD_TENANT_COLUMN);

    await prisma.$executeRawUnsafe(
      `INSERT INTO isaak_feedback (module_key, question, response, rating, tenant_id, context)
       VALUES ('holded_chat', $1, $2, $3, $4::uuid, $5)`,
      question,
      response,
      rating,
      session.tenantId,
      conversationId ? JSON.stringify({ conversationId }) : null
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[holded/feedback POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
