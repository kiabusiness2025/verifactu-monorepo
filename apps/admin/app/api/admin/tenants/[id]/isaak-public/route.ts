/**
 * GET  /api/admin/tenants/[id]/isaak-public — devuelve estado del flag público de Isaak
 * PATCH /api/admin/tenants/[id]/isaak-public — activa/desactiva, genera/actualiza slug
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    const rows = await query<{
      isaak_public_enabled: boolean;
      isaak_public_slug: string | null;
      name: string;
    }>(`SELECT isaak_public_enabled, isaak_public_slug, name FROM tenants WHERE id = $1`, [
      tenantId,
    ]);

    if (!rows.length) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      enabled: rows[0]!.isaak_public_enabled,
      slug: rows[0]!.isaak_public_slug,
      publicUrl: rows[0]!.isaak_public_slug
        ? `https://isaak.verifactu.business/p/${rows[0]!.isaak_public_slug}`
        : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak-public GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    const body = (await req.json()) as { enabled?: boolean; slug?: string };

    const tenantRows = await query<{ name: string; isaak_public_slug: string | null }>(
      `SELECT name, isaak_public_slug FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (!tenantRows.length) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const tenant = tenantRows[0]!;

    // Resolve slug: use provided, or keep existing, or generate from name
    let slug = body.slug?.trim()
      ? slugify(body.slug.trim())
      : (tenant.isaak_public_slug ?? slugify(tenant.name));

    // Ensure slug uniqueness: append short suffix if taken by another tenant
    const conflict = await query<{ id: string }>(
      `SELECT id FROM tenants WHERE isaak_public_slug = $1 AND id <> $2`,
      [slug, tenantId]
    );
    if (conflict.length) {
      slug = `${slug}-${tenantId.slice(0, 6)}`;
    }

    await query(
      `UPDATE tenants SET isaak_public_enabled = $1, isaak_public_slug = $2 WHERE id = $3`,
      [body.enabled ?? false, slug, tenantId]
    );

    return NextResponse.json({
      ok: true,
      enabled: body.enabled ?? false,
      slug,
      publicUrl: `https://isaak.verifactu.business/p/${slug}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak-public PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
