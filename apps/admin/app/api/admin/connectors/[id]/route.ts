/**
 * GET /api/admin/connectors/[id]
 * Detalle completo de una ExternalConnection por su UUID.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { one, query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ConnectionDetailRow = {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_tax_id: string | null;
  channel_key: string | null;
  connection_status: string;
  api_key_enc: string | null;
  ownership_status: string | null;
  managed_by_third_party: boolean | null;
  high_governance_risk: boolean | null;
  under_claim_review: boolean | null;
  connected_at: string | null;
  last_validated_at: string | null;
  last_sync_at: string | null;
  disconnected_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
  legal_terms_accepted_at: string | null;
  legal_acceptance_version: string | null;
  created_at: string;
  connected_by_user_id: string | null;
  connected_by_email: string | null;
  connected_by_name: string | null;
};

type AuditRow = {
  id: string;
  event_type: string;
  actor_email: string | null;
  created_at: string;
  metadata_json: string | null;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    const row = await one<ConnectionDetailRow>(
      `
      SELECT
        ec.id,
        ec.tenant_id,
        COALESCE(t.legal_name, t.name) AS tenant_name,
        t.nif AS tenant_tax_id,
        ec.channel_key,
        ec.connection_status,
        ec.api_key_enc,
        ec.ownership_status::text AS ownership_status,
        ec.managed_by_third_party,
        ec.high_governance_risk,
        ec.under_claim_review,
        ec.connected_at::text AS connected_at,
        ec.last_validated_at::text AS last_validated_at,
        ec.last_sync_at::text AS last_sync_at,
        ec.disconnected_at::text AS disconnected_at,
        ec.revoked_at::text AS revoked_at,
        ec.last_error,
        ec.legal_terms_accepted_at::text AS legal_terms_accepted_at,
        ec.legal_acceptance_version,
        ec.created_at::text AS created_at,
        ec.connected_by_user_id,
        u.email AS connected_by_email,
        u.name AS connected_by_name
      FROM external_connections ec
      LEFT JOIN tenants t ON t.id = ec.tenant_id
      LEFT JOIN users u ON u.id = ec.connected_by_user_id
      WHERE ec.id = $1
        AND ec.provider = 'holded'
      `,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
    }

    const auditRows = await query<AuditRow>(
      `
      SELECT
        al.id,
        al.event_type,
        u.email AS actor_email,
        al.created_at::text AS created_at,
        al.metadata_json::text AS metadata_json
      FROM external_connection_audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE al.connection_id = $1
      ORDER BY al.created_at DESC
      LIMIT 20
      `,
      [id]
    );

    return NextResponse.json({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      tenantTaxId: row.tenant_tax_id,
      channelKey: row.channel_key ?? 'dashboard',
      status: row.connection_status,
      hasApiKey: Boolean(row.api_key_enc),
      flags: {
        managedByThirdParty: row.managed_by_third_party === true,
        highGovernanceRisk: row.high_governance_risk === true,
        underClaimReview: row.under_claim_review === true,
      },
      connectedAt: row.connected_at,
      lastValidatedAt: row.last_validated_at,
      lastSyncAt: row.last_sync_at,
      disconnectedAt: row.disconnected_at,
      revokedAt: row.revoked_at,
      lastError: row.last_error,
      legal: {
        termsAcceptedAt: row.legal_terms_accepted_at,
        version: row.legal_acceptance_version,
      },
      createdAt: row.created_at,
      connectedBy: row.connected_by_user_id
        ? {
            userId: row.connected_by_user_id,
            email: row.connected_by_email,
            name: row.connected_by_name,
          }
        : null,
      auditLog: auditRows.map((a) => ({
        id: a.id,
        eventType: a.event_type,
        actorEmail: a.actor_email,
        createdAt: a.created_at,
        meta: a.metadata_json ? JSON.parse(a.metadata_json) : null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][connectors/:id] detail failed', error);
    return NextResponse.json({ error: 'Error al cargar conexión' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(req);

    const row = await one<{ tenant_id: string; connection_status: string }>(
      `SELECT tenant_id, connection_status
       FROM external_connections
       WHERE id = $1 AND provider = 'holded'`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
    }

    // Hard delete: cascade removes related PATs and audit logs
    await query(`DELETE FROM external_connections WHERE id = $1`, [id]);

    console.info(
      `[admin][connectors] hard-deleted ${id} (tenant ${row.tenant_id}, status ${row.connection_status}) by ${admin.email}`
    );

    return NextResponse.json({ ok: true, deleted: id });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][connectors/:id] delete failed', error);
    return NextResponse.json({ error: 'Error al eliminar conexión' }, { status: 500 });
  }
}
