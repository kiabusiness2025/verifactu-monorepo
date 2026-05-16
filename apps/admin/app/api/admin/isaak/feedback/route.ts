/**
 * POST /api/admin/isaak/feedback  — registra thumbs up/down de una respuesta Isaak
 * GET  /api/admin/isaak/feedback  — devuelve top-rated responses (para few-shot)
 */

import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CREATE_TABLE = `
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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const body = (await req.json()) as {
      module_key?: string;
      question?: string;
      response?: string;
      rating?: string;
      context?: Record<string, unknown>;
    };

    const { module_key = 'admin', question, response, rating, context } = body;

    if (!question || !response || !rating) {
      return NextResponse.json(
        { error: 'question, response y rating son requeridos' },
        { status: 400 }
      );
    }
    if (rating !== 'thumbs_up' && rating !== 'thumbs_down') {
      return NextResponse.json(
        { error: 'rating debe ser thumbs_up o thumbs_down' },
        { status: 400 }
      );
    }

    await query(CREATE_TABLE, []);
    await query(
      `INSERT INTO isaak_feedback (module_key, question, response, rating, context)
       VALUES ($1, $2, $3, $4, $5)`,
      [module_key, question, response, rating, context ? JSON.stringify(context) : null]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak/feedback POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    await query(CREATE_TABLE, []);

    const rows = await query<{
      question: string;
      response: string;
      rating: string;
      count: number;
    }>(
      `SELECT question, response, rating, COUNT(*)::int AS count
       FROM isaak_feedback
       WHERE rating = 'thumbs_up'
       GROUP BY question, response, rating
       ORDER BY count DESC
       LIMIT 10`,
      []
    ).catch(() => [] as { question: string; response: string; rating: string; count: number }[]);

    return NextResponse.json({ top_rated: rows });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak/feedback GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
