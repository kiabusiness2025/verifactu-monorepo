/**
 * GET /api/admin/connectors/export
 *
 * Exporta todas las conexiones Holded a CSV (sin paginación).
 * Acepta los mismos filtros que /api/admin/connectors: channel, status, search.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ExportRow = {
  id: string;
  tenant_name: string | null;
  tenant_nif: string | null;
  channel_key: string | null;
  connection_status: string;
  connected_by_email: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  last_validated_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
};

function esc(v: string | null | undefined): string {
  if (v == null) return '';
  return `"${String(v).replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const sp = req.nextUrl.searchParams;
    const channel = sp.get('channel') ?? 'all';
    const status = sp.get('status') ?? 'all';
    const search = (sp.get('search') ?? '').trim();

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

    const rows = await query<ExportRow>(
      `
      SELECT
        ec.id,
        COALESCE(t.legal_name, t.name) AS tenant_name,
        t.nif AS tenant_nif,
        ec.channel_key,
        ec.connection_status,
        u.email AS connected_by_email,
        ec.connected_at::text AS connected_at,
        ec.last_sync_at::text AS last_sync_at,
        ec.last_validated_at::text AS last_validated_at,
        ec.revoked_at::text AS revoked_at,
        ec.last_error
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
        COALESCE(ec.last_sync_at, ec.last_validated_at, ec.connected_at) DESC NULLS LAST
      `,
      params
    );

    const header =
      'ID,Tenant,NIF,Canal,Estado,Conectado por,Fecha conexión,Última actividad,Última validación,Revocado,Último error\n';

    const body = rows
      .map((r) => {
        const lastActivity = r.last_sync_at ?? r.last_validated_at;
        return [
          esc(r.id),
          esc(r.tenant_name),
          esc(r.tenant_nif),
          esc(r.channel_key ?? 'dashboard'),
          esc(r.connection_status),
          esc(r.connected_by_email),
          esc(r.connected_at),
          esc(lastActivity),
          esc(r.last_validated_at),
          esc(r.revoked_at),
          esc(r.last_error),
        ].join(',');
      })
      .join('\n');

    const date = new Date().toISOString().split('T')[0];
    const csv = '﻿' + header + body;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="conectores-holded-${date}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][connectors/export] failed', error);
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
  }
}
