import { NextResponse } from "next/server";
import { query, one } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(_req);
    const tenant = await one<{
      id: string;
      legal_name: string | null;
      tax_id: string | null;
      address: string | null;
      cnae: string | null;
      created_at: string;
    }>(
      `SELECT id, legal_name, tax_id, address, cnae, created_at
       FROM tenants WHERE id = $1`,
      [params.id]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        legalName: tenant.legal_name ?? "",
        taxId: tenant.tax_id ?? "",
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
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
       SET legal_name = $1, tax_id = $2, address = $3, cnae = $4, updated_at = now()
       WHERE id = $5`,
      [legalName, taxId, address, cnae, params.id]
    );

    const tenant = await one<{
      id: string;
      legal_name: string | null;
      tax_id: string | null;
      created_at: string;
    }>(
      `SELECT id, legal_name, tax_id, created_at
       FROM tenants WHERE id = $1`,
      [params.id]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        legalName: tenant.legal_name ?? "",
        taxId: tenant.tax_id ?? "",
        address,
        cnae,
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
