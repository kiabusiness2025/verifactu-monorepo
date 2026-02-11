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
    const legalName = String(body?.legalName ?? "").trim();
    const taxId = String(body?.taxId ?? "").trim().toUpperCase();
    const address = body?.address ? String(body.address).trim() : null;
    const cnae = body?.cnae ? String(body.cnae).trim() : null;

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
      `INSERT INTO tenant_profiles (tenant_id, source, cnae, address, updated_at)
       VALUES ($1, 'manual', $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE
       SET cnae = EXCLUDED.cnae, address = EXCLUDED.address, updated_at = EXCLUDED.updated_at`,
      [tenantId, cnae, address, now]
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
