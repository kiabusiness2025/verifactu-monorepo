import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Verificar que el usuario es admin
    await requireAdmin(req);

    const tenants = await query<{
      id: string;
      name: string;
      legal_name: string;
      tax_id: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
      members_count: number;
      invoices_count: number;
      total_revenue: number;
    }>(
      `SELECT 
        t.id,
        t.name,
        COALESCE(t.legal_name, t.name) as legal_name,
        t.tax_id,
        t.address,
        t.cnae,
        t.created_at,
        COUNT(DISTINCT m.user_id) as members_count,
        COUNT(DISTINCT i.id) as invoices_count,
        COALESCE(SUM(i.total), 0) as total_revenue
       FROM tenants t
       LEFT JOIN memberships m ON m.tenant_id = t.id AND m.status = 'active'
       LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status IN ('sent', 'paid')
       GROUP BY t.id, t.name, t.legal_name, t.tax_id, t.address, t.cnae, t.created_at
       ORDER BY t.created_at DESC`
    );

    // Transformar a camelCase
    const transformedTenants = tenants.map(t => ({
      id: t.id,
      legalName: t.legal_name,
      taxId: t.tax_id,
      address: t.address,
      cnae: t.cnae,
      createdAt: t.created_at,
      members_count: t.members_count,
      invoices_count: t.invoices_count,
      total_revenue: parseFloat(String(t.total_revenue || 0)),
    }));

    return NextResponse.json({ ok: true, tenants: transformedTenants });
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
    await requireAdmin(req);

    const body = await req.json();
    const { legalName, taxId, address, cnae } = body;

    // Validación básica
    if (!legalName || !taxId) {
      return NextResponse.json(
        { ok: false, error: "legalName y taxId son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que no exista ya un tenant con ese taxId
    const existing = await query<{ id: string }>(
      `SELECT id FROM tenants WHERE tax_id = $1 LIMIT 1`,
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
      `INSERT INTO tenants (id, name, legal_name, tax_id, address, cnae, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId, legalName, legalName, taxId, address || null, cnae || null, now, now]
    );

    // Obtener el tenant creado con estadísticas
    const [tenant] = await query<{
      id: string;
      name: string;
      legal_name: string;
      tax_id: string;
      address: string | null;
      cnae: string | null;
      created_at: string;
    }>(
      `SELECT id, name, legal_name, tax_id, address, cnae, created_at
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    return NextResponse.json({
      ok: true,
      tenant: {
        id: tenant.id,
        legalName: tenant.legal_name,
        taxId: tenant.tax_id,
        address: tenant.address,
        cnae: tenant.cnae,
        createdAt: tenant.created_at,
        members_count: 0,
        invoices_count: 0,
        total_revenue: 0,
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
