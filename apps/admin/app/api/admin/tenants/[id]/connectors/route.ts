/**
 * GET /api/admin/tenants/[id]/connectors
 *
 * F6.1 — endpoint admin que lista las ExternalConnection (provider='holded')
 * de un tenant. Devuelve para cada conexion: canal, estado, cuando se conecto,
 * cuando se uso por ultima vez, ultima validacion, ultimo error y datos del
 * usuario que conecto. La UI los pinta en /admin/tenants/[id]/connectors.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ConnectionRow = {
  id: string;
  provider: string;
  channel_key: string | null;
  origin_channel: string | null;
  connection_status: string;
  ownership_status: string | null;
  managed_by_third_party: boolean | null;
  client_admin_gap: boolean | null;
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
  connected_by_user_id: string | null;
  user_email: string | null;
  user_name: string | null;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    await requireAdmin(req);

    const rows = await query<ConnectionRow>(
      `
      SELECT
        ec.id,
        ec.provider,
        ec.channel_key,
        ec.origin_channel,
        ec.connection_status,
        ec.ownership_status::text AS ownership_status,
        ec.managed_by_third_party,
        ec.client_admin_gap,
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
        ec.connected_by_user_id,
        u.email AS user_email,
        u.name AS user_name
      FROM external_connections ec
      LEFT JOIN users u ON u.id = ec.connected_by_user_id
      WHERE ec.tenant_id = $1
        AND ec.provider = 'holded'
      ORDER BY
        CASE ec.connection_status
          WHEN 'connected' THEN 0
          WHEN 'error' THEN 1
          WHEN 'revoked_api' THEN 2
          WHEN 'disconnected' THEN 3
          ELSE 4
        END,
        ec.connected_at DESC NULLS LAST,
        ec.created_at DESC
      `,
      [tenantId]
    );

    return NextResponse.json({
      items: rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        channelKey: row.channel_key ?? 'dashboard',
        originChannel: row.origin_channel,
        status: row.connection_status,
        ownershipStatus: row.ownership_status,
        flags: {
          managedByThirdParty: row.managed_by_third_party === true,
          clientAdminGap: row.client_admin_gap === true,
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
        connectedBy: row.connected_by_user_id
          ? {
              userId: row.connected_by_user_id,
              email: row.user_email,
              name: row.user_name,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('[admin][tenants/:id/connectors] list query failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: 'Error al cargar conectores',
        details: 'TENANT_CONNECTORS_QUERY_FAILED',
      },
      { status: 500 }
    );
  }
}
