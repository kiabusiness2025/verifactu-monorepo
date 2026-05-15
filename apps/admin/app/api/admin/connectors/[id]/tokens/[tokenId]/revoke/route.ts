/**
 * POST /api/admin/connectors/[id]/tokens/[tokenId]/revoke
 *
 * Revoca un PAT (Personal Access Token) de un conector Holded MCP.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { one, query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string; tokenId: string };

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const admin = await requireAdmin(req);
    const { id: connectionId, tokenId } = await params;

    const token = await one<{ id: string; revoked_at: string | null; tenant_id: string }>(
      `SELECT id, revoked_at, tenant_id
       FROM holded_mcp_personal_access_tokens
       WHERE id = $1 AND connection_id = $2`,
      [tokenId, connectionId]
    );

    if (!token) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 404 });
    }
    if (token.revoked_at) {
      return NextResponse.json({ error: 'Token ya revocado' }, { status: 400 });
    }

    await query(
      `UPDATE holded_mcp_personal_access_tokens
       SET revoked_at = now(), updated_at = now()
       WHERE id = $1`,
      [tokenId]
    );

    await query(
      `INSERT INTO external_connection_audit_logs
         (id, connection_id, tenant_id, event_type, actor_user_id, metadata_json, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, 'admin_token_revoked', NULL, $3::jsonb, now())`,
      [connectionId, token.tenant_id, JSON.stringify({ tokenId, adminEmail: admin.email })]
    );

    return NextResponse.json({ ok: true, tokenId, revokedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][connectors/:id/tokens/:tokenId/revoke] failed', error);
    return NextResponse.json({ error: 'Error al revocar token' }, { status: 500 });
  }
}
