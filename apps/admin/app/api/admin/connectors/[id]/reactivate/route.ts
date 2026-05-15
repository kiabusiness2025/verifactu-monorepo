/**
 * POST /api/admin/connectors/[id]/reactivate
 *
 * Quita el estado revoked_api de una conexión, dejándola como
 * 'disconnected' para que el tenant pueda reconectarse.
 * No restaura la API key (fue borrada en el revoke).
 */

import { requireAdmin } from '@/lib/adminAuth';
import { one, query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    const row = await one<{ connection_status: string; tenant_id: string }>(
      `SELECT connection_status, tenant_id FROM external_connections WHERE id = $1 AND provider = 'holded'`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
    }
    if (row.connection_status !== 'revoked_api') {
      return NextResponse.json(
        {
          error: `Solo se puede reactivar una conexión en estado revoked_api (actual: ${row.connection_status})`,
        },
        { status: 400 }
      );
    }

    await query(
      `UPDATE external_connections
       SET connection_status = 'disconnected',
           revoked_at = NULL,
           last_error = NULL,
           updated_at = now()
       WHERE id = $1`,
      [id]
    );

    await query(
      `INSERT INTO external_connection_audit_logs
         (id, connection_id, tenant_id, event_type, actor_user_id, metadata_json, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, 'admin_reactivated', NULL, $3::jsonb, now())`,
      [
        id,
        row.tenant_id,
        JSON.stringify({ adminEmail: admin.email, note: 'reactivated via admin panel' }),
      ]
    );

    return NextResponse.json({ ok: true, connectionId: id, newStatus: 'disconnected' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][connectors/:id/reactivate] failed', error);
    return NextResponse.json({ error: 'Error al reactivar conexión' }, { status: 500 });
  }
}
