/**
 * GET /api/admin/connectors/summary
 *
 * F6.2a — KPIs agregados globales del provider Holded en `external_connections`,
 * usados por las mini-cards del index /admin/tenants y por la pagina dedicada
 * /admin/connectors/overview.
 *
 * Devuelve totales y desglose por canal (dashboard, chatgpt, mobile, claude).
 * Usa SQL directo via lib/db (`one`/`query`) para mantener consistencia con el
 * resto de endpoints admin.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { one, query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SummaryRow = {
  total: number;
  connected: number;
  errors: number;
  revoked: number;
  disconnected: number;
  errors_24h: number;
  active_last_24h: number;
  active_last_7d: number;
};

type ChannelRow = {
  channel_key: string | null;
  total: number;
  connected: number;
  errors: number;
  revoked: number;
};

const CHANNEL_KEYS = ['dashboard', 'chatgpt', 'mobile', 'claude'] as const;
type ChannelKey = (typeof CHANNEL_KEYS)[number];

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const summaryRow = await one<SummaryRow>(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE connection_status = 'connected')::int AS connected,
        COUNT(*) FILTER (WHERE connection_status = 'error')::int AS errors,
        COUNT(*) FILTER (WHERE connection_status = 'revoked_api')::int AS revoked,
        COUNT(*) FILTER (WHERE connection_status = 'disconnected')::int AS disconnected,
        COUNT(*) FILTER (
          WHERE connection_status = 'error'
            AND COALESCE(updated_at, created_at) > now() - INTERVAL '24 hours'
        )::int AS errors_24h,
        COUNT(*) FILTER (
          WHERE last_sync_at > now() - INTERVAL '24 hours'
             OR last_validated_at > now() - INTERVAL '24 hours'
        )::int AS active_last_24h,
        COUNT(*) FILTER (
          WHERE last_sync_at > now() - INTERVAL '7 days'
             OR last_validated_at > now() - INTERVAL '7 days'
        )::int AS active_last_7d
      FROM external_connections
      WHERE provider = 'holded'
      `
    );

    const channelRows = await query<ChannelRow>(
      `
      SELECT
        COALESCE(channel_key, 'dashboard') AS channel_key,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE connection_status = 'connected')::int AS connected,
        COUNT(*) FILTER (WHERE connection_status = 'error')::int AS errors,
        COUNT(*) FILTER (WHERE connection_status = 'revoked_api')::int AS revoked
      FROM external_connections
      WHERE provider = 'holded'
      GROUP BY COALESCE(channel_key, 'dashboard')
      `
    );

    const byChannel: Record<
      ChannelKey,
      { total: number; connected: number; errors: number; revoked: number }
    > = {
      dashboard: { total: 0, connected: 0, errors: 0, revoked: 0 },
      chatgpt: { total: 0, connected: 0, errors: 0, revoked: 0 },
      mobile: { total: 0, connected: 0, errors: 0, revoked: 0 },
      claude: { total: 0, connected: 0, errors: 0, revoked: 0 },
    };

    for (const row of channelRows) {
      const key = (row.channel_key ?? 'dashboard') as ChannelKey;
      if (!CHANNEL_KEYS.includes(key)) continue;
      byChannel[key] = {
        total: Number(row.total || 0),
        connected: Number(row.connected || 0),
        errors: Number(row.errors || 0),
        revoked: Number(row.revoked || 0),
      };
    }

    return NextResponse.json({
      totals: {
        total: Number(summaryRow?.total || 0),
        connected: Number(summaryRow?.connected || 0),
        errors: Number(summaryRow?.errors || 0),
        revoked: Number(summaryRow?.revoked || 0),
        disconnected: Number(summaryRow?.disconnected || 0),
        errors24h: Number(summaryRow?.errors_24h || 0),
        activeLast24h: Number(summaryRow?.active_last_24h || 0),
        activeLast7d: Number(summaryRow?.active_last_7d || 0),
      },
      byChannel,
    });
  } catch (error) {
    console.error('[admin][connectors/summary] query failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: 'Error al cargar metricas de conectores',
        details: 'CONNECTORS_SUMMARY_QUERY_FAILED',
      },
      { status: 500 }
    );
  }
}
