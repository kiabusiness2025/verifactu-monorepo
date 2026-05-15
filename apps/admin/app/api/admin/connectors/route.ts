/**
 * GET /api/admin/connectors
 *
 * S1-A — Lista paginada global de todas las ExternalConnection (provider='holded').
 * Filtros: channel, status, search (tenant name / user email), page, limit.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type ConnectionListRow = {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  channel_key: string | null;
  connection_status: string;
  connected_at: string | null;
  last_validated_at: string | null;
  last_sync_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
  connected_by_email: string | null;
  connected_by_name: string | null;
  total: number;
};

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );
    const channel = sp.get('channel') ?? 'all';
    const status = sp.get('status') ?? 'all';
    const search = (sp.get('search') ?? '').trim();
    const offset = (page - 1) * limit;

    const conditions: string[] = ["ec.provider = 'holded'"];
    const params: unknown[] = [];
    let idx = 1;

    if (channel !== 'all') {
      conditions.push(`ec.channel_key = $${idx++}`);
      params.push(channel);
    }
    if (status !== 'all') {
      conditions.push(`ec.connection_status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(COALESCE(t.legal_name, t.name) ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    const rows = await query<ConnectionListRow>(
      `
      SELECT
        ec.id,
        ec.tenant_id,
        COALESCE(t.legal_name, t.name) AS tenant_name,
        ec.channel_key,
        ec.connection_status,
        ec.connected_at::text AS connected_at,
        ec.last_validated_at::text AS last_validated_at,
        ec.last_sync_at::text AS last_sync_at,
        ec.revoked_at::text AS revoked_at,
        ec.last_error,
        u.email AS connected_by_email,
        u.name AS connected_by_name,
        COUNT(*) OVER()::int AS total
      FROM external_connections ec
      LEFT JOIN tenants t ON t.id = ec.tenant_id
      LEFT JOIN users u ON u.id = ec.connected_by_user_id
      WHERE ${where}
      ORDER BY
        CASE ec.connection_status
          WHEN 'connected' THEN 0
          WHEN 'error' THEN 1
          WHEN 'revoked_api' THEN 2
          ELSE 3
        END,
        COALESCE(ec.last_sync_at, ec.last_validated_at, ec.connected_at) DESC NULLS LAST,
        ec.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
      `,
      [...params, limit, offset]
    );

    const total = rows[0]?.total ?? 0;

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        channelKey: r.channel_key ?? 'dashboard',
        status: r.connection_status,
        connectedAt: r.connected_at,
        lastActivity: r.last_sync_at ?? r.last_validated_at,
        revokedAt: r.revoked_at,
        lastError: r.last_error,
        connectedBy: r.connected_by_email
          ? { email: r.connected_by_email, name: r.connected_by_name }
          : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][connectors] list failed', error);
    return NextResponse.json({ error: 'Error al cargar conectores' }, { status: 500 });
  }
}
