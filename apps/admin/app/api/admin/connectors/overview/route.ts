/**
 * GET /api/admin/connectors/overview
 *
 * F6.2b — datos para la pagina dedicada /admin/connectors/overview:
 *
 *   - timeline (30d): conexiones nuevas por dia y por canal
 *   - errors (24h): ultimos errores en external_connections
 *   - topTools: top tools llamadas via PAT (holded_mcp_pat_audit_logs.event='used')
 *   - recentEvents: ultimos eventos del audit_log mixto (sync + PAT)
 *
 * Ojo — la tabla MCP es `holded_mcp_pat_audit_logs` (no `holded_mcp_audit_log`
 * como decia un draft anterior del plan).
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TimelineRow = {
  bucket: string;
  channel_key: string | null;
  count: number;
};

type ErrorRow = {
  id: string;
  tenant_id: string;
  tenant_legal_name: string | null;
  channel_key: string | null;
  last_error: string | null;
  updated_at: string | null;
};

type TopToolRow = {
  tool_name: string;
  channel: string | null;
  calls: number;
  errors: number;
  last_used_at: string | null;
};

type RecentEventRow = {
  source: string;
  occurred_at: string;
  tenant_id: string;
  tenant_legal_name: string | null;
  action: string;
  channel: string | null;
  detail: string | null;
  status: string | null;
};

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    // 1) Timeline 30d (nuevas conexiones por dia y canal).
    const timelineRows = await query<TimelineRow>(
      `
      SELECT
        date_trunc('day', connected_at)::date::text AS bucket,
        COALESCE(channel_key, 'dashboard') AS channel_key,
        COUNT(*)::int AS count
      FROM external_connections
      WHERE provider = 'holded'
        AND connected_at IS NOT NULL
        AND connected_at >= now() - INTERVAL '30 days'
      GROUP BY 1, 2
      ORDER BY 1 ASC
      `
    );

    // 2) Errores 24h (sin agrupar - lista corta para mostrar en cards).
    const errorRows = await query<ErrorRow>(
      `
      SELECT
        ec.id,
        ec.tenant_id::text AS tenant_id,
        COALESCE(t.legal_name, t.name) AS tenant_legal_name,
        ec.channel_key,
        ec.last_error,
        COALESCE(ec.updated_at, ec.created_at)::text AS updated_at
      FROM external_connections ec
      LEFT JOIN tenants t ON t.id = ec.tenant_id
      WHERE ec.provider = 'holded'
        AND ec.connection_status = 'error'
        AND COALESCE(ec.updated_at, ec.created_at) > now() - INTERVAL '24 hours'
      ORDER BY COALESCE(ec.updated_at, ec.created_at) DESC
      LIMIT 25
      `
    );

    // 3) Top tools (ultimas 24h, agrupadas por tool_name).
    const topToolRows = await query<TopToolRow>(
      `
      SELECT
        COALESCE(tool_name, '<sin tool>') AS tool_name,
        channel,
        COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE status >= 400)::int AS errors,
        MAX(created_at)::text AS last_used_at
      FROM holded_mcp_pat_audit_logs
      WHERE event = 'used'
        AND created_at > now() - INTERVAL '24 hours'
      GROUP BY tool_name, channel
      ORDER BY calls DESC, last_used_at DESC NULLS LAST
      LIMIT 10
      `
    );

    // 4) Eventos recientes (mezcla de external_connection_audit_logs + PAT logs).
    const recentEventRows = await query<RecentEventRow>(
      `
      WITH ec_events AS (
        SELECT
          'connection'::text AS source,
          ecal.created_at::text AS occurred_at,
          ecal.tenant_id::text AS tenant_id,
          COALESCE(t.legal_name, t.name) AS tenant_legal_name,
          ecal.action AS action,
          ecal.channel_type AS channel,
          ecal.resource_type || COALESCE(' #' || ecal.resource_id, '') AS detail,
          ecal.status AS status,
          ecal.created_at AS sort_at
        FROM external_connection_audit_logs ecal
        LEFT JOIN tenants t ON t.id = ecal.tenant_id
        WHERE ecal.created_at > now() - INTERVAL '7 days'
      ),
      pat_events AS (
        SELECT
          'mcp'::text AS source,
          pal.created_at::text AS occurred_at,
          pal.tenant_id::text AS tenant_id,
          COALESCE(t.legal_name, t.name) AS tenant_legal_name,
          pal.event AS action,
          pal.channel AS channel,
          pal.tool_name AS detail,
          pal.status::text AS status,
          pal.created_at AS sort_at
        FROM holded_mcp_pat_audit_logs pal
        LEFT JOIN tenants t ON t.id = pal.tenant_id
        WHERE pal.created_at > now() - INTERVAL '7 days'
      )
      SELECT source, occurred_at, tenant_id, tenant_legal_name, action, channel, detail, status
      FROM (
        SELECT * FROM ec_events
        UNION ALL
        SELECT * FROM pat_events
      ) combined
      ORDER BY sort_at DESC
      LIMIT 50
      `
    );

    return NextResponse.json({
      timeline: timelineRows.map((row) => ({
        bucket: row.bucket,
        channelKey: row.channel_key ?? 'dashboard',
        count: Number(row.count || 0),
      })),
      errors24h: errorRows.map((row) => ({
        connectionId: row.id,
        tenantId: row.tenant_id,
        tenantLegalName: row.tenant_legal_name,
        channelKey: row.channel_key ?? 'dashboard',
        lastError: row.last_error,
        updatedAt: row.updated_at,
      })),
      topTools: topToolRows.map((row) => ({
        toolName: row.tool_name,
        channel: row.channel ?? null,
        calls: Number(row.calls || 0),
        errors: Number(row.errors || 0),
        lastUsedAt: row.last_used_at,
      })),
      recentEvents: recentEventRows.map((row) => ({
        source: row.source,
        occurredAt: row.occurred_at,
        tenantId: row.tenant_id,
        tenantLegalName: row.tenant_legal_name,
        action: row.action,
        channel: row.channel,
        detail: row.detail,
        status: row.status,
      })),
    });
  } catch (error) {
    console.error('[admin][connectors/overview] query failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: 'Error al cargar overview de conectores',
        details: 'CONNECTORS_OVERVIEW_QUERY_FAILED',
      },
      { status: 500 }
    );
  }
}
