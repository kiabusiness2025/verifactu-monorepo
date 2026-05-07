/**
 * GET /api/admin/connectors/search?q=...
 *
 * F6.3 — busqueda admin por nombre de usuario o nombre de empresa, con email
 * y NIF/CIF como filtros adicionales.
 *
 * Devuelve dos colecciones:
 *   - tenants: filas de `tenants` con resumen de conexiones Holded
 *   - users: filas de `User` con sus tenants y estado de conexion
 *
 * El query se aplica con ILIKE para que sea case-insensitive y tolerante a
 * acentos (no normalizamos por motivos de complejidad — pg_trgm seria mejor
 * pero no esta instalado por defecto).
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_KIND = 25;

type TenantRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
  nif: string | null;
  total_connections: number;
  connected: number;
  errors: number;
  channels: string[] | null;
  last_activity_at: string | null;
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  total_connections: number;
  connected: number;
  tenants: Array<{ tenantId: string; legalName: string | null }> | null;
  last_activity_at: string | null;
};

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        {
          error: `Query demasiado corta. Minimo ${MIN_QUERY_LENGTH} caracteres.`,
          tenants: [],
          users: [],
        },
        { status: 400 }
      );
    }

    // ILIKE sobre tenant.legal_name, tenant.name, tenant.nif y profile fields.
    const tenantRows = await query<TenantRow>(
      `
      SELECT
        t.id::text AS id,
        t.name,
        COALESCE(t.legal_name, tp.legal_name) AS legal_name,
        COALESCE(t.nif, tp.tax_id) AS nif,
        COUNT(ec.id)::int AS total_connections,
        COUNT(*) FILTER (WHERE ec.connection_status = 'connected')::int AS connected,
        COUNT(*) FILTER (WHERE ec.connection_status = 'error')::int AS errors,
        ARRAY_AGG(DISTINCT COALESCE(ec.channel_key, 'dashboard')) FILTER (WHERE ec.id IS NOT NULL) AS channels,
        MAX(GREATEST(
          COALESCE(ec.last_validated_at, 'epoch'::timestamptz),
          COALESCE(ec.last_sync_at, 'epoch'::timestamptz),
          COALESCE(ec.connected_at, 'epoch'::timestamptz)
        ))::text AS last_activity_at
      FROM tenants t
      LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
      LEFT JOIN external_connections ec
        ON ec.tenant_id = t.id
       AND ec.provider = 'holded'
      WHERE
        t.legal_name ILIKE $1
        OR t.name ILIKE $1
        OR t.nif ILIKE $1
        OR tp.legal_name ILIKE $1
        OR tp.trade_name ILIKE $1
        OR tp.tax_id ILIKE $1
      GROUP BY t.id, t.name, t.legal_name, t.nif, tp.legal_name, tp.tax_id
      ORDER BY
        (COUNT(*) FILTER (WHERE ec.connection_status = 'connected')) DESC,
        COUNT(ec.id) DESC,
        COALESCE(t.legal_name, t.name, t.id::text) ASC
      LIMIT $2
      `,
      [`%${q}%`, MAX_RESULTS_PER_KIND]
    );

    const userRows = await query<UserRow>(
      `
      WITH matching_users AS (
        SELECT u.id
        FROM "User" u
        WHERE
          u.name ILIKE $1
          OR u.first_name ILIKE $1
          OR u.last_name ILIKE $1
          OR u.email ILIKE $1
          OR (u.first_name || ' ' || u.last_name) ILIKE $1
        LIMIT 200
      )
      SELECT
        u.id,
        u.email,
        u.name,
        u.first_name,
        u.last_name,
        COUNT(ec.id)::int AS total_connections,
        COUNT(*) FILTER (WHERE ec.connection_status = 'connected')::int AS connected,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'tenantId', t.id::text,
              'legalName', COALESCE(t.legal_name, t.name)
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::jsonb
        ) AS tenants,
        MAX(GREATEST(
          COALESCE(ec.last_validated_at, 'epoch'::timestamptz),
          COALESCE(ec.last_sync_at, 'epoch'::timestamptz),
          COALESCE(ec.connected_at, 'epoch'::timestamptz)
        ))::text AS last_activity_at
      FROM matching_users mu
      INNER JOIN "User" u ON u.id = mu.id
      LEFT JOIN memberships m
        ON m.user_id = u.id
       AND COALESCE(m.status, 'active') <> 'disabled'
      LEFT JOIN tenants t ON t.id = m.tenant_id
      LEFT JOIN external_connections ec
        ON ec.tenant_id = t.id
       AND ec.provider = 'holded'
      GROUP BY u.id, u.email, u.name, u.first_name, u.last_name
      ORDER BY
        (COUNT(*) FILTER (WHERE ec.connection_status = 'connected')) DESC,
        COUNT(ec.id) DESC,
        COALESCE(u.name, u.email, u.id) ASC
      LIMIT $2
      `,
      [`%${q}%`, MAX_RESULTS_PER_KIND]
    );

    return NextResponse.json({
      query: q,
      tenants: tenantRows.map((row) => ({
        id: row.id,
        name: row.name,
        legalName: row.legal_name,
        nif: row.nif,
        totalConnections: Number(row.total_connections || 0),
        connected: Number(row.connected || 0),
        errors: Number(row.errors || 0),
        channels: Array.isArray(row.channels) ? row.channels.filter(Boolean) : [],
        lastActivityAt: row.last_activity_at,
      })),
      users: userRows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name ?? [row.first_name, row.last_name].filter(Boolean).join(' ') ?? null,
        totalConnections: Number(row.total_connections || 0),
        connected: Number(row.connected || 0),
        tenants: Array.isArray(row.tenants) ? row.tenants : [],
        lastActivityAt: row.last_activity_at,
      })),
    });
  } catch (error) {
    console.error('[admin][connectors/search] query failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: 'Error en la busqueda de conectores',
        details: 'CONNECTORS_SEARCH_QUERY_FAILED',
      },
      { status: 500 }
    );
  }
}
