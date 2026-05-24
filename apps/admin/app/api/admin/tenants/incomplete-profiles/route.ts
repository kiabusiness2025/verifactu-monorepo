/**
 * GET /api/admin/tenants/incomplete-profiles
 *
 * Returns paginated list of tenants with Holded connection and incomplete profile
 * (missing at least one of: email, phone, cnae, representative).
 *
 * Query params:
 *   page     (default 1)
 *   limit    (default 50, max 200)
 *   search   (optional, matches tenant name)
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TenantRow = {
  id: string;
  name: string;
  missing_fields: string[];
  last_reminder_at: string | null;
  holded_status: string;
};

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const search = searchParams.get('search') ?? '';
    const offset = (page - 1) * limit;

    const tableCheck = await query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profile_reminder_logs'
      ) AS exists`,
      []
    );
    const hasLogTable = tableCheck[0]?.exists ?? false;

    const searchFilter = search ? `AND t.name ILIKE $3` : '';
    const params: (string | number)[] = [limit, offset, ...(search ? [`%${search}%`] : [])];

    const rows = await query<TenantRow>(
      `SELECT
         t.id,
         t.name,
         ARRAY_REMOVE(ARRAY[
           CASE WHEN tp.email         IS NULL THEN 'email'         END,
           CASE WHEN tp.phone         IS NULL THEN 'teléfono'      END,
           CASE WHEN tp.cnae          IS NULL THEN 'CNAE'          END,
           CASE WHEN tp.representative IS NULL THEN 'representante' END
         ], NULL) AS missing_fields,
         ${hasLogTable ? `(SELECT MAX(sent_at)::text FROM profile_reminder_logs prl WHERE prl.tenant_id = t.id)` : `NULL`} AS last_reminder_at,
         ec.connection_status AS holded_status
       FROM tenants t
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
       JOIN external_connections ec ON ec.tenant_id = t.id AND ec.provider = 'holded'
       WHERE (
         tp.tenant_id IS NULL
         OR tp.email IS NULL
         OR tp.phone IS NULL
         OR tp.cnae IS NULL
         OR tp.representative IS NULL
       )
       ${searchFilter}
       ORDER BY t.name ASC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countParams: (string | number)[] = search ? [`%${search}%`] : [];
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(DISTINCT t.id)::int AS total
       FROM tenants t
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
       JOIN external_connections ec ON ec.tenant_id = t.id AND ec.provider = 'holded'
       WHERE (
         tp.tenant_id IS NULL
         OR tp.email IS NULL
         OR tp.phone IS NULL
         OR tp.cnae IS NULL
         OR tp.representative IS NULL
       )
       ${search ? 'AND t.name ILIKE $1' : ''}`,
      countParams
    );

    return NextResponse.json({
      tenants: rows,
      total: countResult[0]?.total ?? 0,
      page,
      limit,
      pages: Math.ceil((countResult[0]?.total ?? 0) / limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[incomplete-profiles]', error);
    return NextResponse.json({ error: 'Error al obtener perfiles incompletos' }, { status: 500 });
  }
}
