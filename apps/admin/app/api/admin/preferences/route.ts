import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const VALID_TONES = ['friendly', 'professional', 'minimal'] as const;
type IsaakTone = (typeof VALID_TONES)[number];

function isValidTone(value: unknown): value is IsaakTone {
  return typeof value === 'string' && VALID_TONES.includes(value as IsaakTone);
}

async function resolveCurrentUserId(request: NextRequest): Promise<string | null> {
  const admin = await requireAdmin(request);

  if (admin.userId && !admin.userId.startsWith('local-')) {
    return admin.userId;
  }

  if (!admin.email) return null;

  const userRows = await query<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [admin.email]
  );

  return userRows[0]?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ ok: true, isaak_tone: 'friendly', persisted: false });
    }

    const rows = await query<{ isaak_tone: string | null }>(
      'SELECT isaak_tone FROM user_preferences WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    const tone = rows[0]?.isaak_tone;
    return NextResponse.json({
      ok: true,
      isaak_tone: isValidTone(tone) ? tone : 'friendly',
      persisted: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar la preferencia' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await resolveCurrentUserId(request);
    const body = await request.json().catch(() => ({}));
    const nextTone = body?.isaak_tone;

    if (!isValidTone(nextTone)) {
      return NextResponse.json(
        { ok: false, error: 'isaak_tone debe ser friendly | professional | minimal' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ ok: true, isaak_tone: nextTone, persisted: false });
    }

    await query(
      `INSERT INTO user_preferences (user_id, isaak_tone, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET isaak_tone = EXCLUDED.isaak_tone, updated_at = NOW()`,
      [userId, nextTone]
    );

    return NextResponse.json({ ok: true, isaak_tone: nextTone, persisted: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar la preferencia' },
      { status: 500 }
    );
  }
}
