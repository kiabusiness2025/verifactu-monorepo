import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// GET - Obtener una empresa específica
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;

    const [company] = await query<{
      id: string;
      name: string;
      legal_name: string;
      tax_id: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      postal_code: string | null;
      country: string | null;
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
        t.email,
        t.phone,
        t.address,
        t.city,
        t.postal_code,
        t.country,
        t.created_at,
        COUNT(DISTINCT m.user_id) as members_count,
        COUNT(DISTINCT i.id) as invoices_count,
        COALESCE(SUM(i.total), 0) as total_revenue
       FROM tenants t
       LEFT JOIN memberships m ON m.tenant_id = t.id AND m.status = 'active'
       LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status IN ('sent', 'paid')
       WHERE t.id = $1
       GROUP BY t.id, t.name, t.legal_name, t.tax_id, t.email, t.phone, t.address, t.city, t.postal_code, t.country, t.created_at`,
      [companyId]
    );

    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...company });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar empresa
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;
    const body = await req.json();

    const { name, legal_name, tax_id, email, phone, address, city, postal_code, country } = body;

    await query(
      `UPDATE tenants SET 
        name = $1,
        legal_name = $2,
        tax_id = $3,
        email = $4,
        phone = $5,
        address = $6,
        city = $7,
        postal_code = $8,
        country = $9,
        updated_at = NOW()
       WHERE id = $10`,
      [name, legal_name, tax_id, email, phone, address, city, postal_code, country, companyId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update company" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar empresa
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;

    await query("DELETE FROM tenants WHERE id = $1", [companyId]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
