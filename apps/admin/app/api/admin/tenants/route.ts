import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Verificar que el usuario es admin
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const status = (searchParams.get("status") || "all").toLowerCase();
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(searchParams.get("pageSize") || "25", 10), 1),
      100
    );
    const offset = (page - 1) * pageSize;

    const where: string[] = [];
    const params: Array<string | number> = [];

    // FILTRAR EMPRESAS DEMO: Excluir tenants con is_demo = TRUE
    where.push(`(t.is_demo IS NULL OR t.is_demo = FALSE)`);

    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      where.push(
        `(LOWER(t.legal_name) LIKE $${params.length - 2} OR LOWER(t.name) LIKE $${
          params.length - 1
        } OR LOWER(t.nif) LIKE $${params.length})`
      );
    }

    if (from) {
      params.push(from);
      where.push(`t.created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`t.created_at <= $${params.length}`);
    }

    if (status !== "all") {
      params.push(status);
      where.push(`COALESCE(sub.status, 'trial') = $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*)::int as total
       FROM tenants t
       LEFT JOIN LATERAL (
         SELECT status
         FROM tenant_subscriptions s
         WHERE s.tenant_id = t.id
         ORDER BY s.created_at DESC
         LIMIT 1
       ) sub ON true
       ${whereClause}`,
      params
    );

    const tenants = await query<{
      id: string;
      name: string;
      legal_name: string;
      nif: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
      members_count: number;
      invoices_this_month: number;
      revenue_this_month: number;
      status: string | null;
    }>(
      `SELECT 
        t.id,
        t.name,
        COALESCE(t.legal_name, t.name) as legal_name,
        t.nif,
        tp.address,
        tp.cnae,
        t.created_at,
        COUNT(DISTINCT m.user_id) as members_count,
        COUNT(DISTINCT i.id) as invoices_this_month,
        COALESCE(SUM(i.amount_gross), 0) as revenue_this_month,
        COALESCE(sub.status, 'trial') as status
       FROM tenants t
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
       LEFT JOIN memberships m ON m.tenant_id = t.id AND m.status = 'active'
       LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status IN ('sent', 'paid')
         AND i.issue_date >= DATE_TRUNC('month', CURRENT_DATE)
         AND i.issue_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')
       LEFT JOIN LATERAL (
         SELECT status
         FROM tenant_subscriptions s
         WHERE s.tenant_id = t.id
         ORDER BY s.created_at DESC
         LIMIT 1
       ) sub ON true
       ${whereClause}
       GROUP BY t.id, t.name, t.legal_name, t.nif, tp.address, tp.cnae, t.created_at
       ORDER BY t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    // Transformar a camelCase
    const transformedTenants = tenants.map((t) => ({
      id: t.id,
      legalName: t.legal_name,
      taxId: t.nif || "",
      address: t.address,
      cnae: t.cnae,
      createdAt: t.created_at,
      membersCount: Number(t.members_count || 0),
      invoicesThisMonth: Number(t.invoices_this_month || 0),
      revenueThisMonth: parseFloat(String(t.revenue_this_month || 0)),
      status: t.status || "trial",
    }));

    return NextResponse.json({
      items: transformedTenants,
      page,
      pageSize,
      total: countRows[0]?.total || 0,
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Verificar que el usuario es admin
    const admin = await requireAdmin(req);

    const body = await req.json();
    const normalized = body?.normalized ?? null;
    const profile = body?.profile ?? null;
    const isEinforma = !!normalized;

    const legalName = String(
      normalized?.legalName || normalized?.name || body?.legalName || ''
    ).trim();
    const taxId = String(normalized?.nif || body?.taxId || '').trim().toUpperCase();
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

    // Validación básica
    if (!legalName || !taxId) {
      return NextResponse.json(
        { ok: false, error: "legalName y taxId son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que no exista ya un tenant con ese taxId
    const existing = await query<{ id: string }>(
      `SELECT id FROM tenants WHERE nif = $1 LIMIT 1`,
      [taxId]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Ya existe una empresa con ese CIF/NIF" },
        { status: 409 }
      );
    }

    const tenantId = randomUUID();
    const now = new Date().toISOString();

    // Crear tenant
    await query(
      `INSERT INTO tenants (id, name, legal_name, nif, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, legalName, legalName, taxId, now]
    );

    if (address || cnae || isEinforma) {
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
    }

    // Crear membership owner para el admin
    await query(
      `INSERT INTO memberships (tenant_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [tenantId, admin.userId]
    );

    // Marcar empresa activa para el admin
    await query(
      `INSERT INTO user_preferences (user_id, preferred_tenant_id, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET preferred_tenant_id = EXCLUDED.preferred_tenant_id, updated_at = EXCLUDED.updated_at`,
      [admin.userId, tenantId, now]
    );

    // Obtener el tenant creado con estadísticas
    const [tenant] = await query<{
      id: string;
      name: string;
      legal_name: string;
      nif: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
    }>(
      `SELECT t.id, t.name, t.legal_name, t.nif, t.created_at, tp.address, tp.cnae
       FROM tenants t
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId]
    );

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        legalName: tenant.legal_name,
        taxId: tenant.nif || '',
        address: tenant.address,
        cnae: tenant.cnae,
        createdAt: tenant.created_at,
        membersCount: 0,
        invoicesThisMonth: 0,
        revenueThisMonth: 0,
        status: "trial",
      },
    });
  } catch (error) {
    console.error("Error creating tenant:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Error al crear la empresa" },
      { status: 500 }
    );
  }
}
