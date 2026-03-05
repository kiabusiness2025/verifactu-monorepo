import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

type SavedView = {
  id: string;
  name: string;
  path: string;
  description?: string;
};

const DEFAULT_SCOPE = 'dashboard';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_saved_views (
      user_id text NOT NULL,
      scope text NOT NULL DEFAULT 'dashboard',
      views jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, scope),
      CONSTRAINT admin_saved_views_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

function sanitizeViews(input: unknown): SavedView[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const output: SavedView[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const id = String(record.id || '').trim();
    const name = String(record.name || '').trim();
    const path = String(record.path || '').trim();
    const description = String(record.description || '').trim();

    if (!id || !name || !path || seen.has(id)) continue;
    seen.add(id);
    output.push({
      id,
      name,
      path,
      ...(description ? { description } : {}),
    });
  }

  return output.slice(0, 50);
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.userId) {
      return NextResponse.json({ ok: true, views: [], persisted: false });
    }

    await ensureTable();
    const scope = request.nextUrl.searchParams.get('scope') || DEFAULT_SCOPE;
    const rows = await query<{ views: unknown }>(
      `SELECT views
       FROM admin_saved_views
       WHERE user_id = $1 AND scope = $2
       LIMIT 1`,
      [admin.userId, scope]
    );

    return NextResponse.json({
      ok: true,
      views: sanitizeViews(rows[0]?.views),
      persisted: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: 'No se pudieron cargar las vistas' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.userId) {
      return NextResponse.json({ ok: false, error: 'No se pudo resolver usuario admin' }, { status: 400 });
    }

    await ensureTable();
    const body = await request.json().catch(() => ({}));
    const scope = String(body?.scope || DEFAULT_SCOPE).trim() || DEFAULT_SCOPE;
    const views = sanitizeViews(body?.views);

    await query(
      `INSERT INTO admin_saved_views (user_id, scope, views, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id, scope)
       DO UPDATE SET views = EXCLUDED.views, updated_at = NOW()`,
      [admin.userId, scope, JSON.stringify(views)]
    );

    return NextResponse.json({ ok: true, views, persisted: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: 'No se pudieron guardar las vistas' }, { status: 500 });
  }
}

