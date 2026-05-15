/**
 * GET /api/admin/users/export
 *
 * Exporta usuarios a CSV (sin paginación).
 * Acepta los mismos filtros que /api/admin/users: search, status.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ExportRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  empresas: string | null;
  roles: string | null;
  num_empresas: number;
  connected_channels: string | null;
};

function esc(v: string | number | boolean | null | undefined): string {
  if (v == null) return '';
  return `"${String(v).replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const sp = req.nextUrl.searchParams;
    const search = (sp.get('search') ?? '').trim();
    const status = sp.get('status') ?? 'all';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${idx} OR u.name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (status === 'blocked') {
      conditions.push(`u."isBlocked" = true`);
    } else if (status === 'connected') {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM external_connections ec
          JOIN memberships m ON m.tenant_id = ec.tenant_id
          WHERE m.user_id = u.id
            AND ec.provider = 'holded'
            AND ec.connection_status = 'connected'
        )`
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query<ExportRow>(
      `
      SELECT
        u.id,
        u.email,
        u.name,
        u.created_at::text AS created_at,
        u."isBlocked" AS is_blocked,
        u."blockedReason" AS blocked_reason,
        STRING_AGG(DISTINCT COALESCE(t.legal_name, t.name), '; ') AS empresas,
        STRING_AGG(DISTINCT m.role, '; ') AS roles,
        COUNT(DISTINCT m.tenant_id)::int AS num_empresas,
        STRING_AGG(DISTINCT ec.channel_key, '; ') AS connected_channels
      FROM users u
      LEFT JOIN memberships m ON m.user_id = u.id
      LEFT JOIN tenants t ON t.id = m.tenant_id
      LEFT JOIN external_connections ec
        ON ec.tenant_id = m.tenant_id
        AND ec.provider = 'holded'
        AND ec.connection_status = 'connected'
      ${where}
      GROUP BY u.id, u.email, u.name, u.created_at, u."isBlocked", u."blockedReason"
      ORDER BY u.created_at DESC
      `,
      params
    );

    const header =
      'ID,Email,Nombre,Fecha registro,Bloqueado,Motivo bloqueo,Nº empresas,Empresas,Roles,Canales Holded\n';

    const body = rows
      .map((r) =>
        [
          esc(r.id),
          esc(r.email),
          esc(r.name),
          esc(r.created_at),
          esc(r.is_blocked ? 'Sí' : 'No'),
          esc(r.blocked_reason),
          esc(r.num_empresas),
          esc(r.empresas),
          esc(r.roles),
          esc(r.connected_channels),
        ].join(',')
      )
      .join('\n');

    const date = new Date().toISOString().split('T')[0];
    const csv = '﻿' + header + body;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="usuarios-${date}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][users/export] failed', error);
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
  }
}
