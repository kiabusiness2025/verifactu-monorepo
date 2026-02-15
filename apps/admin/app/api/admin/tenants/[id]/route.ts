import { requireAdmin } from "@/lib/adminAuth";
import { one, query } from "@/lib/db";
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    await requireAdmin(_req);
    const hasTenantLegalName = await columnExists("tenants", "legal_name");
    const hasTenantNif = await columnExists("tenants", "nif");
    const hasTenantTaxId = await columnExists("tenants", "tax_id");
    const taxIdColumn = hasTenantNif ? "nif" : hasTenantTaxId ? "tax_id" : null;
    const hasTenantProfiles = await tableExists("tenant_profiles");

    const tenant = await one<{
      id: string;
      legal_name: string | null;
      nif: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
    }>(
      `SELECT
         t.id,
         ${hasTenantLegalName ? "t.legal_name" : "t.name"} as legal_name,
         ${taxIdColumn ? `t.${taxIdColumn}` : "NULL::text"} as nif,
         t.created_at,
       ${hasTenantProfiles ? "tp.address" : "NULL::text"} as address,
       ${hasTenantProfiles ? "tp.cnae" : "NULL::text"} as cnae
       FROM tenants t
       ${hasTenantProfiles ? "LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id" : ""}
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
    const representative = profile?.representatives?.[0]?.name ?? null;
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

    if (!legalName || !taxId) {
      return NextResponse.json(
        { error: "legalName y taxId son obligatorios" },
        { status: 400 }
      );
    }

    const hasTenantLegalName = await columnExists("tenants", "legal_name");
    const hasTenantNif = await columnExists("tenants", "nif");
    const hasTenantTaxId = await columnExists("tenants", "tax_id");
    const tenantTaxColumn = hasTenantNif ? "nif" : hasTenantTaxId ? "tax_id" : null;

    const updateSet = ["name = $1"];
    const updateValues: unknown[] = [legalName];
    if (hasTenantLegalName) {
      updateSet.push(`legal_name = $${updateValues.length + 1}`);
      updateValues.push(legalName);
    }
    if (tenantTaxColumn) {
      updateSet.push(`${tenantTaxColumn} = $${updateValues.length + 1}`);
      updateValues.push(taxId);
    }
    updateValues.push(tenantId);
    await query(
      `UPDATE tenants
       SET ${updateSet.join(", ")}
       WHERE id = $${updateValues.length}`,
      updateValues
    );

    const now = new Date().toISOString();
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

    const tenant = await one<{
      id: string;
      legal_name: string | null;
      nif: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
    }>(
      `SELECT
         t.id,
         ${hasTenantLegalName ? "t.legal_name" : "t.name"} as legal_name,
         ${tenantTaxColumn ? `t.${tenantTaxColumn}` : "NULL::text"} as nif,
         t.created_at,
         ${hasTenantProfiles ? "tp.address" : "NULL::text"} as address,
         ${hasTenantProfiles ? "tp.cnae" : "NULL::text"} as cnae
       FROM tenants t
       ${hasTenantProfiles ? "LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id" : ""}
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
