/**
 * POST /api/admin/tenants/[id]/connectors/[connectionId]/revoke
 *
 * F6.1 — endpoint admin que revoca una ExternalConnection. Marca el estado
 * como `revoked_api`, limpia api_key_enc, y deja un audit_log de la accion.
 *
 * No envia emails desde aqui — el lifecycle email (al usuario y al admin
 * empresa) lo dispara el helper compartido `sendHoldedConnectionLifecycleEmails`
 * cuando la UI se asegure de que se llamo manualmente. En esta primera version
 * solo persistimos el estado para no acoplar la accion a Resend.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { one, query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; connectionId: string }>;
  }
) {
  try {
    const { id: tenantId, connectionId } = await params;
    const session = await requireAdmin(req);

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const reason =
      typeof body.reason === 'string' && body.reason.trim().length > 0
        ? body.reason.trim().slice(0, 200)
        : 'admin_manual_revoke';

    const existing = await one<{
      id: string;
      tenant_id: string;
      provider: string;
      channel_key: string | null;
      connection_status: string;
    }>(
      `
      SELECT id, tenant_id, provider, channel_key, connection_status
      FROM external_connections
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
      `,
      [connectionId, tenantId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Conexion no encontrada para este tenant' },
        { status: 404 }
      );
    }
    if (existing.provider !== 'holded') {
      return NextResponse.json(
        { error: 'Esta accion solo aplica a conexiones holded' },
        { status: 400 }
      );
    }
    if (existing.connection_status === 'revoked_api') {
      return NextResponse.json({
        ok: true,
        alreadyRevoked: true,
        connectionId: existing.id,
      });
    }

    const updated = await one<{
      id: string;
      tenant_id: string;
      connection_status: string;
      revoked_at: string;
      channel_key: string | null;
    }>(
      `
      UPDATE external_connections
      SET connection_status = 'revoked_api',
          api_key_enc = NULL,
          provider_account_id = NULL,
          connected_by_user_id = NULL,
          technical_operator_user_id = NULL,
          connected_at = NULL,
          last_validated_at = NULL,
          last_sync_at = NULL,
          disconnected_at = COALESCE(disconnected_at, now()),
          revoked_at = now(),
          governance_updated_at = now(),
          last_error = $3,
          updated_at = now()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, tenant_id, connection_status, revoked_at::text, channel_key
      `,
      [connectionId, tenantId, `Revoked by admin: ${reason}`]
    );

    if (!updated) {
      return NextResponse.json({ error: 'No se pudo revocar la conexion' }, { status: 500 });
    }

    // Audit log: usamos la tabla `external_connection_audit_log` si esta
    // disponible. Si no existe, dejamos el log en stdout (visible en Vercel).
    try {
      await query(
        `
        INSERT INTO external_connection_audit_log
          (connection_id, tenant_id, actor_user_id, action, detail, created_at)
        VALUES ($1, $2, $3, 'revoked_by_admin', $4, now())
        `,
        [
          connectionId,
          tenantId,
          (session as { uid?: string; userId?: string })?.uid ??
            (session as { uid?: string; userId?: string })?.userId ??
            null,
          JSON.stringify({ reason, channel: existing.channel_key }),
        ]
      );
    } catch (auditError) {
      console.warn('[admin][tenants/:id/connectors/:cid/revoke] audit log skipped', {
        message: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }

    return NextResponse.json({
      ok: true,
      connectionId: updated.id,
      status: updated.connection_status,
      revokedAt: updated.revoked_at,
      channelKey: updated.channel_key,
    });
  } catch (error) {
    console.error('[admin][tenants/:id/connectors/:cid/revoke] failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: 'Error revocando la conexion',
        details: 'TENANT_CONNECTOR_REVOKE_FAILED',
      },
      { status: 500 }
    );
  }
}
