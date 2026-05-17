/**
 * GET  /api/admin/tenants/[id]/isaak-settings — devuelve configuración Isaak del tenant
 * PATCH /api/admin/tenants/[id]/isaak-settings — actualiza enabled / consent
 */

import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS tenant_isaak_settings (
    tenant_id           UUID PRIMARY KEY,
    holded_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    consent_given       BOOLEAN NOT NULL DEFAULT FALSE,
    consent_given_at    TIMESTAMPTZ,
    enabled_by          TEXT,
    enabled_at          TIMESTAMPTZ,
    notes               TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    await query(CREATE_TABLE, []);

    const rows = await query<{
      holded_enabled: boolean;
      consent_given: boolean;
      consent_given_at: string | null;
      enabled_by: string | null;
      enabled_at: string | null;
      notes: string | null;
    }>(
      `SELECT holded_enabled, consent_given, consent_given_at, enabled_by, enabled_at, notes
       FROM tenant_isaak_settings WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => []);

    if (!rows.length) {
      return NextResponse.json({
        holded_enabled: false,
        consent_given: false,
        consent_given_at: null,
        enabled_by: null,
        enabled_at: null,
        notes: null,
      });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak-settings GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    const body = (await req.json()) as {
      holded_enabled?: boolean;
      consent_given?: boolean;
      notes?: string;
      enabled_by?: string;
    };

    await query(CREATE_TABLE, []);

    const now = new Date().toISOString();
    const enabledAt = body.holded_enabled === true ? now : undefined;

    await query(
      `INSERT INTO tenant_isaak_settings
         (tenant_id, holded_enabled, consent_given, consent_given_at, enabled_by, enabled_at, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         holded_enabled   = COALESCE($2, tenant_isaak_settings.holded_enabled),
         consent_given    = COALESCE($3, tenant_isaak_settings.consent_given),
         consent_given_at = CASE WHEN $3 = TRUE AND tenant_isaak_settings.consent_given = FALSE THEN NOW()
                                 ELSE tenant_isaak_settings.consent_given_at END,
         enabled_by       = COALESCE($5, tenant_isaak_settings.enabled_by),
         enabled_at       = COALESCE($6, tenant_isaak_settings.enabled_at),
         notes            = COALESCE($7, tenant_isaak_settings.notes),
         updated_at       = NOW()`,
      [
        tenantId,
        body.holded_enabled ?? null,
        body.consent_given ?? null,
        body.consent_given === true ? now : null,
        body.enabled_by ?? null,
        enabledAt ?? null,
        body.notes ?? null,
      ]
    );

    const updated = await query<{
      holded_enabled: boolean;
      consent_given: boolean;
      enabled_at: string | null;
    }>(
      `SELECT holded_enabled, consent_given, enabled_at FROM tenant_isaak_settings WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => []);

    return NextResponse.json({ ok: true, ...(updated[0] ?? {}) });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak-settings PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
