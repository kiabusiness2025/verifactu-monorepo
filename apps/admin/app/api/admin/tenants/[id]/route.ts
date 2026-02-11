import { requireAdmin } from "@/lib/adminAuth";
import { one, query } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    await requireAdmin(_req);
    const tenant = await one<{
      id: string;
      legal_name: string | null;
      nif: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
    }>(
      `SELECT t.id, t.legal_name, t.nif, t.created_at, tp.address, tp.cnae
       FROM tenants t
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        legalName: tenant.legal_name ?? "",
        taxId: tenant.nif ?? "",
        address: tenant.address ?? null,
        cnae: tenant.cnae ?? null,
        createdAt: tenant.created_at,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al obtener empresa" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    await requireAdmin(req);

    const body = await req.json();
    const normalized = body?.normalized ?? null;
    const profile = body?.profile ?? null;
    const isEinforma = !!normalized;

    const legalName = String(
      normalized?.legalName || normalized?.name || body?.legalName || ""
    ).trim();
    const taxId = String(normalized?.nif || body?.taxId || "")
      .trim()
      .toUpperCase();
    const address = isEinforma
      ? String(normalized?.address || profile?.address?.street || '').trim() || null
      : body?.address
      ? String(body.address).trim()
      : null;
    const cnae = isEinforma
      ? String(profile?.cnae || '').trim() || null
      : body?.cnae
      ? String(body.cnae).trim()
      : null;

    const cnaeCode = normalized?.cnaeCode ?? null;
    const cnaeText = normalized?.cnaeText ?? null;
    const legalForm = profile?.legalForm ?? null;
    const status = profile?.status ?? null;
    const website = profile?.website ?? null;
    const capitalSocialRaw = profile?.capitalSocial;
    const capitalSocial = Number.isFinite(Number(capitalSocialRaw))
      ? Number(capitalSocialRaw)
      : null;
    const incorporationDate = profile?.constitutionDate
      ? new Date(profile.constitutionDate)
      : null;
    const postalCode = normalized?.postalCode ?? profile?.address?.zip ?? null;
    const city = normalized?.city ?? profile?.address?.city ?? null;
    const province = normalized?.province ?? profile?.address?.province ?? null;
    const country = normalized?.country ?? profile?.address?.country ?? null;
    const sourceId = normalized?.sourceId ?? normalized?.nif ?? profile?.sourceId ?? null;
    const einformaTaxIdVerified =
      !!taxId && !!normalized?.nif && String(normalized.nif).toUpperCase() === taxId;
    const einformaRaw = isEinforma ? profile?.raw ?? profile ?? null : null;
    const profileSource = isEinforma ? 'einforma' : 'manual';

    if (!legalName || !taxId) {
      return NextResponse.json(
        { error: "legalName y taxId son obligatorios" },
        { status: 400 }
      );
    }

    await query(
      `UPDATE tenants
       SET legal_name = $1, nif = $2
       WHERE id = $3`,
      [legalName, taxId, tenantId]
    );

    const now = new Date().toISOString();
    await query(
      `INSERT INTO tenant_profiles (
         tenant_id,
         source,
         source_id,
         cnae,
         cnae_code,
         cnae_text,
         legal_form,
         status,
         website,
         capital_social,
         incorporation_date,
         address,
         postal_code,
         city,
         province,
         country,
         einforma_last_sync_at,
         einforma_tax_id_verified,
         einforma_raw,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (tenant_id) DO UPDATE
       SET source = EXCLUDED.source,
           source_id = EXCLUDED.source_id,
           cnae = EXCLUDED.cnae,
           cnae_code = EXCLUDED.cnae_code,
           cnae_text = EXCLUDED.cnae_text,
           legal_form = EXCLUDED.legal_form,
           status = EXCLUDED.status,
           website = EXCLUDED.website,
           capital_social = EXCLUDED.capital_social,
           incorporation_date = EXCLUDED.incorporation_date,
           address = EXCLUDED.address,
           postal_code = EXCLUDED.postal_code,
           city = EXCLUDED.city,
           province = EXCLUDED.province,
           country = EXCLUDED.country,
           einforma_last_sync_at = EXCLUDED.einforma_last_sync_at,
           einforma_tax_id_verified = EXCLUDED.einforma_tax_id_verified,
           einforma_raw = EXCLUDED.einforma_raw,
           updated_at = EXCLUDED.updated_at`,
      [
        tenantId,
        profileSource,
        sourceId,
        cnae,
        cnaeCode,
        cnaeText,
        legalForm,
        status,
        website,
        capitalSocial,
        incorporationDate,
        address,
        postalCode,
        city,
        province,
        country,
        isEinforma ? now : null,
        isEinforma ? einformaTaxIdVerified : null,
        einformaRaw,
        now,
      ]
    );

    const tenant = await one<{
      id: string;
      legal_name: string | null;
      nif: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
    }>(
      `SELECT t.id, t.legal_name, t.nif, t.created_at, tp.address, tp.cnae
       FROM tenants t
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        legalName: tenant.legal_name ?? "",
        taxId: tenant.nif ?? "",
        address: tenant.address ?? null,
        cnae: tenant.cnae ?? null,
        createdAt: tenant.created_at,
        membersCount: 0,
        invoicesThisMonth: 0,
        revenueThisMonth: 0,
        status: "active",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al actualizar empresa" }, { status: 500 });
  }
}
