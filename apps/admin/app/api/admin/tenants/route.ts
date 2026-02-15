import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

async function tableExists(tableName: string) {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) as exists`,
    [tableName]
  );
  return !!rows[0]?.exists;
}

async function columnExists(tableName: string, columnName: string) {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) as exists`,
    [tableName, columnName]
  );
  return !!rows[0]?.exists;
}

export async function GET(req: Request) {
  try {
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

    const [
      hasTenantIsDemo,
      hasTenantLegalName,
      hasTenantNif,
      hasTenantTaxId,
      hasTenantProfiles,
      hasTenantSubscriptions,
      hasSubscriptions,
      hasInvoices,
      hasInvoiceAmountGross,
      hasInvoiceTotal,
      hasInvoiceIssueDate,
      hasInvoiceStatus,
    ] = await Promise.all([
      columnExists("tenants", "is_demo"),
      columnExists("tenants", "legal_name"),
      columnExists("tenants", "nif"),
      columnExists("tenants", "tax_id"),
      tableExists("tenant_profiles"),
      tableExists("tenant_subscriptions"),
      tableExists("subscriptions"),
      tableExists("invoices"),
      columnExists("invoices", "amount_gross"),
      columnExists("invoices", "total"),
      columnExists("invoices", "issue_date"),
      columnExists("invoices", "status"),
    ]);

    const taxIdColumn = hasTenantNif ? "nif" : hasTenantTaxId ? "tax_id" : null;
    const legalNameExpr = hasTenantLegalName ? "COALESCE(t.legal_name, t.name)" : "t.name";
    const subJoin = hasTenantSubscriptions
      ? `LEFT JOIN LATERAL (
           SELECT status
           FROM tenant_subscriptions s
           WHERE s.tenant_id = t.id
           ORDER BY s.created_at DESC
           LIMIT 1
         ) sub ON true`
      : hasSubscriptions
      ? `LEFT JOIN LATERAL (
           SELECT status
           FROM subscriptions s
           WHERE s.tenant_id = t.id
           ORDER BY s.created_at DESC
           LIMIT 1
         ) sub ON true`
      : `LEFT JOIN LATERAL (
           SELECT 'trial'::text as status
         ) sub ON true`;

    const invoiceAmountColumn = hasInvoiceAmountGross
      ? "amount_gross"
      : hasInvoiceTotal
      ? "total"
      : null;
    const canUseInvoiceMetrics = hasInvoices && hasInvoiceIssueDate && !!invoiceAmountColumn;
    const invoiceJoin = canUseInvoiceMetrics
      ? `LEFT JOIN invoices i ON i.tenant_id = t.id
         ${hasInvoiceStatus ? "AND i.status IN ('sent', 'paid')" : ""}
         AND i.issue_date >= DATE_TRUNC('month', CURRENT_DATE)
         AND i.issue_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')`
      : "";
    const invoiceCountExpr = canUseInvoiceMetrics
      ? "COUNT(DISTINCT i.id)::int as invoices_this_month"
      : "0::int as invoices_this_month";
    const invoiceRevenueExpr = canUseInvoiceMetrics
      ? `COALESCE(SUM(i.${invoiceAmountColumn}), 0) as revenue_this_month`
      : "0::numeric as revenue_this_month";

    const profileJoin = hasTenantProfiles
      ? "LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id"
      : "";
    const profileAddressExpr = hasTenantProfiles ? "tp.address as address" : "NULL::text as address";
    const profileCnaeExpr = hasTenantProfiles ? "tp.cnae as cnae" : "NULL::text as cnae";

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (hasTenantIsDemo) {
      where.push(`(t.is_demo IS NULL OR t.is_demo = FALSE)`);
    }

    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      if (taxIdColumn) params.push(`%${q}%`);
      const legalNameParamIndex = params.length - (taxIdColumn ? 2 : 1);
      const nameParamIndex = params.length - (taxIdColumn ? 1 : 0);
      const conditions = [
        `LOWER(${legalNameExpr}) LIKE $${legalNameParamIndex}`,
        `LOWER(t.name) LIKE $${nameParamIndex}`,
      ];
      if (taxIdColumn) {
        conditions.push(`LOWER(t.${taxIdColumn}) LIKE $${params.length}`);
      }
      where.push(`(${conditions.join(" OR ")})`);
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
       ${subJoin}
       ${whereClause}`,
      params
    );

    const tenants = await query<{
      id: string;
      legal_name: string;
      tax_id: string | null;
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
        ${legalNameExpr} as legal_name,
        ${taxIdColumn ? `t.${taxIdColumn}` : "NULL::text"} as tax_id,
        ${profileAddressExpr},
        ${profileCnaeExpr},
        t.created_at,
        COUNT(DISTINCT m.user_id) as members_count,
        ${invoiceCountExpr},
        ${invoiceRevenueExpr},
        COALESCE(sub.status, 'trial') as status
       FROM tenants t
       ${profileJoin}
       LEFT JOIN memberships m ON m.tenant_id = t.id AND m.status = 'active'
       ${invoiceJoin}
       ${subJoin}
       ${whereClause}
       GROUP BY t.id, ${hasTenantLegalName ? "t.legal_name, " : ""}t.name, ${
        taxIdColumn ? `t.${taxIdColumn}, ` : ""
      }${hasTenantProfiles ? "tp.address, tp.cnae, " : ""}t.created_at
       ORDER BY t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    // Transformar a camelCase
    const transformedTenants = tenants.map((t) => ({
      id: t.id,
      legalName: t.legal_name,
      taxId: t.tax_id || "",
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

    try {
      const { searchParams } = new URL(req.url);
      const q = (searchParams.get("q") || "").trim().toLowerCase();
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
      const pageSize = Math.min(
        Math.max(parseInt(searchParams.get("pageSize") || "25", 10), 1),
        100
      );
      const offset = (page - 1) * pageSize;
      const variants: Array<{ legalExpr: string; taxExpr?: string | null }> = [
        { legalExpr: "COALESCE(t.legal_name, t.name)", taxExpr: "t.nif" },
        { legalExpr: "COALESCE(t.legal_name, t.name)", taxExpr: "t.tax_id" },
        { legalExpr: "t.name", taxExpr: "t.nif" },
        { legalExpr: "t.name", taxExpr: "t.tax_id" },
        { legalExpr: "t.name", taxExpr: null },
      ];

      for (const variant of variants) {
        try {
          const where: string[] = [];
          const params: Array<string | number> = [];
          if (q) {
            params.push(`%${q}%`);
            params.push(`%${q}%`);
            const conditions = [
              `LOWER(${variant.legalExpr}) LIKE $${params.length - 1}`,
              `LOWER(t.name) LIKE $${params.length}`,
            ];
            if (variant.taxExpr) {
              params.push(`%${q}%`);
              conditions.push(`LOWER(${variant.taxExpr}) LIKE $${params.length}`);
            }
            where.push(`(${conditions.join(" OR ")})`);
          }
          if (from) {
            params.push(from);
            where.push(`t.created_at >= $${params.length}`);
          }
          if (to) {
            params.push(to);
            where.push(`t.created_at <= $${params.length}`);
          }
          const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

          const countRows = await query<{ total: number }>(
            `SELECT COUNT(*)::int as total FROM tenants t ${whereClause}`,
            params
          );
          const tenants = await query<{
            id: string;
            legal_name: string;
            tax_id: string | null;
            created_at: string;
          }>(
            `SELECT
              t.id,
              ${variant.legalExpr} as legal_name,
              ${variant.taxExpr ? `${variant.taxExpr}` : "NULL::text"} as tax_id,
              t.created_at
             FROM tenants t
             ${whereClause}
             ORDER BY t.created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, offset]
          );

          return NextResponse.json({
            items: tenants.map((t) => ({
              id: t.id,
              legalName: t.legal_name,
              taxId: t.tax_id || "",
              address: null,
              cnae: null,
              createdAt: t.created_at,
              membersCount: 0,
              invoicesThisMonth: 0,
              revenueThisMonth: 0,
              status: "trial",
            })),
            page,
            pageSize,
            total: countRows[0]?.total || 0,
            degraded: true,
          });
        } catch {
          // Try next schema variant.
        }
      }

      return NextResponse.json({
        items: [],
        page,
        pageSize,
        total: 0,
        degraded: true,
      });
    } catch (fallbackError) {
      console.error("Fallback tenants query failed:", fallbackError);
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
    const representative = profile?.representatives?.[0]?.name ?? null;
    const email = profile?.email ?? null;
    const phone = profile?.phone ?? null;
    const employeesRaw = profile?.employees;
    const employees = Number.isFinite(Number(employeesRaw)) ? Number(employeesRaw) : null;
    const salesRaw = profile?.sales;
    const sales = Number.isFinite(Number(salesRaw)) ? Number(salesRaw) : null;
    const salesYearRaw = profile?.salesYear;
    const salesYear = Number.isFinite(Number(salesYearRaw)) ? Number(salesYearRaw) : null;
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
    const lastBalanceDate = profile?.lastBalanceDate ? new Date(profile.lastBalanceDate) : null;
    const sourceId = normalized?.sourceId ?? normalized?.nif ?? profile?.sourceId ?? null;
    const adminEditHistoryFromPayload = Array.isArray(body?.adminEditHistory)
      ? body.adminEditHistory
      : null;
    const adminEditHistoryFromRaw = Array.isArray(profile?.raw?.manualEditHistory)
      ? profile.raw.manualEditHistory
      : null;
    const adminEditHistory = adminEditHistoryFromPayload ?? adminEditHistoryFromRaw ?? null;
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

    const hasTenantNif = await columnExists("tenants", "nif");
    const hasTenantTaxId = await columnExists("tenants", "tax_id");
    const tenantTaxColumn = hasTenantNif ? "nif" : hasTenantTaxId ? "tax_id" : null;

    // Verificar que no exista ya un tenant con ese taxId
    const existing = tenantTaxColumn
      ? await query<{ id: string }>(
          `SELECT id FROM tenants WHERE ${tenantTaxColumn} = $1 LIMIT 1`,
          [taxId]
        )
      : [];

    if (existing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Ya existe una empresa con ese CIF/NIF" },
        { status: 409 }
      );
    }

    const tenantId = randomUUID();
    const now = new Date().toISOString();

    // Crear tenant con compatibilidad de esquema
    const tenantFields = ["id", "name", "created_at"];
    const tenantValues: Array<string | null> = [tenantId, legalName, now];
    if (await columnExists("tenants", "legal_name")) {
      tenantFields.push("legal_name");
      tenantValues.push(legalName);
    }
    if (tenantTaxColumn) {
      tenantFields.push(tenantTaxColumn);
      tenantValues.push(taxId);
    }
    const tenantPlaceholders = tenantFields.map((_, i) => `$${i + 1}`).join(", ");
    await query(
      `INSERT INTO tenants (${tenantFields.join(", ")})
       VALUES (${tenantPlaceholders})`,
      tenantValues
    );

    if (address || cnae || isEinforma) {
      try {
        const hasTenantProfiles = await tableExists("tenant_profiles");
        if (hasTenantProfiles) {
          const profileCandidates: Array<{ column: string; value: unknown }> = [
            { column: "tenant_id", value: tenantId },
            { column: "source", value: profileSource },
            { column: "source_id", value: sourceId },
            { column: "cnae", value: cnae },
            { column: "cnae_code", value: cnaeCode },
            { column: "cnae_text", value: cnaeText },
            { column: "legal_form", value: legalForm },
            { column: "status", value: status },
            { column: "website", value: website },
            { column: "capital_social", value: capitalSocial },
            { column: "incorporation_date", value: incorporationDate },
            { column: "address", value: address },
            { column: "postal_code", value: postalCode },
            { column: "city", value: city },
            { column: "province", value: province },
            { column: "country", value: country },
            { column: "representative", value: representative },
            { column: "email", value: email },
            { column: "phone", value: phone },
            { column: "employees", value: employees },
            { column: "sales", value: sales },
            { column: "sales_year", value: salesYear },
            { column: "last_balance_date", value: lastBalanceDate },
            { column: "einforma_last_sync_at", value: isEinforma ? now : null },
            { column: "einforma_tax_id_verified", value: isEinforma ? einformaTaxIdVerified : null },
            { column: "einforma_raw", value: einformaRaw },
            { column: "admin_edit_history", value: adminEditHistory },
            { column: "updated_at", value: now },
          ];
          const availableColumns: string[] = [];
          const values: unknown[] = [];
          for (const candidate of profileCandidates) {
            if (await columnExists("tenant_profiles", candidate.column)) {
              availableColumns.push(candidate.column);
              values.push(candidate.value);
            }
          }

          if (availableColumns.length > 0) {
            const placeholders = availableColumns.map((_, i) => `$${i + 1}`).join(", ");
            const updates = availableColumns
              .filter((col) => col !== "tenant_id")
              .map((col) => `${col} = EXCLUDED.${col}`)
              .join(", ");
            if (updates.length > 0) {
              await query(
                `INSERT INTO tenant_profiles (${availableColumns.join(", ")})
                 VALUES (${placeholders})
                 ON CONFLICT (tenant_id) DO UPDATE
                 SET ${updates}`,
                values
              );
            } else {
              await query(
                `INSERT INTO tenant_profiles (${availableColumns.join(", ")})
                 VALUES (${placeholders})
                 ON CONFLICT (tenant_id) DO NOTHING`,
                values
              );
            }
          }
        }
      } catch (profileError) {
        console.error("Error creating/updating tenant_profile snapshot:", profileError);
      }
    }

    // Crear membership owner para el admin
    await query(
      `INSERT INTO memberships (tenant_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [tenantId, admin.userId]
    );

    const supportUser = await prisma.user.upsert({
      where: { email: "support@verifactu.business" },
      update: { role: "ADMIN", name: "Verifactu Support" },
      create: {
        email: "support@verifactu.business",
        name: "Verifactu Support",
        role: "ADMIN",
      },
    });

    await query(
      `INSERT INTO memberships (tenant_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT (tenant_id, user_id) DO UPDATE
       SET role = 'owner', status = 'active'`,
      [tenantId, supportUser.id]
    );

    // Marcar empresa activa para el admin
    if (await tableExists("user_preferences")) {
      await query(
        `INSERT INTO user_preferences (user_id, preferred_tenant_id, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE
         SET preferred_tenant_id = EXCLUDED.preferred_tenant_id, updated_at = EXCLUDED.updated_at`,
        [admin.userId, tenantId, now]
      );
    }

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
      `SELECT 
         t.id, 
         t.name, 
         ${await columnExists("tenants", "legal_name") ? "t.legal_name" : "t.name as legal_name"}, 
         ${
           tenantTaxColumn ? `t.${tenantTaxColumn} as nif` : "NULL::text as nif"
         }, 
         t.created_at, 
         ${
           await tableExists("tenant_profiles")
             ? "tp.address, tp.cnae"
             : "NULL::text as address, NULL::text as cnae"
         }
       FROM tenants t
       ${await tableExists("tenant_profiles") ? "LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id" : ""}
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
