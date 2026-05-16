/**
 * GET /api/admin/connectors/health
 * Devuelve el número de conectores con error o revocados (para el badge en nav).
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const rows = await query<{ status: string; count: number }>(
      `SELECT connection_status AS status, COUNT(*)::int AS count
       FROM external_connections
       WHERE provider = 'holded'
         AND connection_status IN ('error', 'revoked_api')
       GROUP BY connection_status`,
      []
    );
    const errors = rows.reduce((s, r) => s + r.count, 0);
    return NextResponse.json({ errors });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ errors: 0 });
  }
}
