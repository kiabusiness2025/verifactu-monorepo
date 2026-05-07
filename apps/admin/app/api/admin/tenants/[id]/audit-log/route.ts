/**
 * GET /api/admin/tenants/[id]/audit-log?action=&channel=&since=&limit=
 *
 * F6.4 — stream de eventos para un tenant. Mezcla:
 *   - external_connection_audit_logs (created/used/revoked/error sobre la
 *     conexion + payloads de sync)
 *   - holded_mcp_pat_audit_logs (created/used/revoked/rejected sobre PATs MCP
 *     con detalle de tool_name y status HTTP)
 *
 * Filtros:
 *   - action: substring sobre el campo action/event (case-insensitive)
 *   - channel: substring sobre channel/channel_type
 *   - since: ISO date — devuelve eventos desde esa fecha
 *   - limit: 1..200 (default 100)
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = {
  source: string;
  occurred_at: string;
  tenant_id: string;
  ref_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  channel: string | null;
  detail: string | null;
  status: string | null;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
};

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseSince(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    const url = new URL(req.url);
    const actionFilter = (url.searchParams.get('action') ?? '').trim();
    const channelFilter = (url.searchParams.get('channel') ?? '').trim();
    const since = parseSince(url.searchParams.get('since'));
    const limit = clampInt(url.searchParams.get('limit'), 100, 1, 200);

    const actionPattern = actionFilter ? `%${actionFilter}%` : null;
    const channelPattern = channelFilter ? `%${channelFilter}%` : null;

    const rows = await query<Row>(
      `
      WITH ec_events AS (
        SELECT
          'connection'::text AS source,
          ecal.created_at::text AS occurred_at,
          ecal.tenant_id::text AS tenant_id,
          ecal.connection_id::text AS ref_id,
          ecal.user_id AS user_id,
          u.email AS user_email,
          u.name AS user_name,
          ecal.action AS action,
          ecal.channel_type AS channel,
          (ecal.resource_type || COALESCE(' #' || ecal.resource_id, '')) AS detail,
          ecal.status::text AS status,
          NULL::text AS ip,
          NULL::text AS user_agent,
          ecal.request_payload AS meta,
          ecal.created_at AS sort_at
        FROM external_connection_audit_logs ecal
        LEFT JOIN "User" u ON u.id = ecal.user_id
        WHERE ecal.tenant_id = $1::uuid
      ),
      pat_events AS (
        SELECT
          'mcp'::text AS source,
          pal.created_at::text AS occurred_at,
          pal.tenant_id::text AS tenant_id,
          pal.pat_id::text AS ref_id,
          pat.created_by_user_id AS user_id,
          u.email AS user_email,
          u.name AS user_name,
          pal.event AS action,
          pal.channel AS channel,
          pal.tool_name AS detail,
          pal.status::text AS status,
          pal.ip AS ip,
          pal.user_agent AS user_agent,
          pal.meta AS meta,
          pal.created_at AS sort_at
        FROM holded_mcp_pat_audit_logs pal
        LEFT JOIN holded_mcp_personal_access_tokens pat ON pat.id = pal.pat_id
        LEFT JOIN "User" u ON u.id = pat.created_by_user_id
        WHERE pal.tenant_id = $1::uuid
      )
      SELECT
        source, occurred_at, tenant_id, ref_id, user_id, user_email, user_name,
        action, channel, detail, status, ip, user_agent, meta
      FROM (
        SELECT * FROM ec_events
        UNION ALL
        SELECT * FROM pat_events
      ) combined
      WHERE
        ($2::timestamptz IS NULL OR sort_at >= $2::timestamptz)
        AND ($3::text IS NULL OR action ILIKE $3)
        AND ($4::text IS NULL OR (channel IS NOT NULL AND channel ILIKE $4))
      ORDER BY sort_at DESC
      LIMIT $5
      `,
      [tenantId, since, actionPattern, channelPattern, limit]
    );

    return NextResponse.json({
      tenantId,
      filters: {
        action: actionFilter || null,
        channel: channelFilter || null,
        since,
        limit,
      },
      items: rows.map((row) => ({
        source: row.source,
        occurredAt: row.occurred_at,
        refId: row.ref_id,
        user: row.user_id
          ? {
              userId: row.user_id,
              email: row.user_email,
              name: row.user_name,
            }
          : null,
        action: row.action,
        channel: row.channel,
        detail: row.detail,
        status: row.status,
        ip: row.ip,
        userAgent: row.user_agent,
        meta: row.meta ?? null,
      })),
    });
  } catch (error) {
    console.error('[admin][tenants/:id/audit-log] query failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: 'Error al cargar audit log',
        details: 'TENANT_AUDIT_LOG_QUERY_FAILED',
      },
      { status: 500 }
    );
  }
}
