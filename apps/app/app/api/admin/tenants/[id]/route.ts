import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);

    const [tenant] = await query<{
      id: string;
      name: string;
      legal_name: string;
      tax_id: string;
      address: string | null;
      cnae: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, name, legal_name, tax_id, address, cnae, created_at, updated_at
       FROM tenants WHERE id = $1`,
      [params.id]
    );

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Obtener estadísticas
    const [stats] = await query<{
      members_count: number;
      invoices_count: number;
      total_revenue: number;
    }>(
      `SELECT 
        COUNT(DISTINCT m.user_id) as members_count,
        COUNT(DISTINCT i.id) as invoices_count,
        COALESCE(SUM(i.total), 0) as total_revenue
       FROM tenants t
       LEFT JOIN memberships m ON m.tenant_id = t.id AND m.status = 'active'
       LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status IN ('sent', 'paid')
       WHERE t.id = $1`,
      [params.id]
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
        ...stats,
      },
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Error al obtener empresa" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);

    const body = await req.json();
    const { legalName, taxId, address, cnae } = body;

    // Verificar que el tenant existe
    const existing = await query<{ id: string }>(
      `SELECT id FROM tenants WHERE id = $1`,
      [params.id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Si se está cambiando el taxId, verificar que no esté en uso
    if (taxId) {
      const duplicate = await query<{ id: string }>(
        `SELECT id FROM tenants WHERE tax_id = $1 AND id != $2 LIMIT 1`,
        [taxId, params.id]
      );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Ya existe otra empresa con ese CIF/NIF" },
          { status: 409 }
        );
      }
    }

    // Construir UPDATE dinámico
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (legalName !== undefined) {
      updates.push(`legal_name = $${paramIndex}`);
      updates.push(`name = $${paramIndex}`); // name = legal_name
      values.push(legalName);
      paramIndex++;
    }

    if (taxId !== undefined) {
      updates.push(`tax_id = $${paramIndex}`);
      values.push(taxId);
      paramIndex++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      values.push(address || null);
      paramIndex++;
    }

    if (cnae !== undefined) {
      updates.push(`cnae = $${paramIndex}`);
      values.push(cnae || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    // Agregar updated_at
    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    // Agregar id al final
    values.push(params.id);

    await query(
      `UPDATE tenants SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    );

    // Obtener tenant actualizado con estadísticas
    const [tenant] = await query<{
      id: string;
      name: string;
      legal_name: string;
      tax_id: string;
      address: string | null;
      cnae: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, name, legal_name, tax_id, address, cnae, created_at, updated_at
       FROM tenants WHERE id = $1`,
      [params.id]
    );

    const [stats] = await query<{
      members_count: number;
      invoices_count: number;
      total_revenue: number;
    }>(
      `SELECT 
        COUNT(DISTINCT m.user_id) as members_count,
        COUNT(DISTINCT i.id) as invoices_count,
        COALESCE(SUM(i.total), 0) as total_revenue
       FROM tenants t
       LEFT JOIN memberships m ON m.tenant_id = t.id AND m.status = 'active'
       LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status IN ('sent', 'paid')
       WHERE t.id = $1`,
      [params.id]
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
        ...stats,
      },
    });
  } catch (error) {
    console.error("Error updating tenant:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Error al actualizar empresa" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);

    // Verificar que el tenant existe
    const existing = await query<{ id: string }>(
      `SELECT id FROM tenants WHERE id = $1`,
      [params.id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si tiene facturas (prevención)
    const [hasInvoices] = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1`,
      [params.id]
    );

    if (hasInvoices && hasInvoices.count > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `No se puede eliminar. La empresa tiene ${hasInvoices.count} facturas asociadas.`,
        },
        { status: 409 }
      );
    }

    // Eliminar membresías primero (FK constraint)
    await query(`DELETE FROM memberships WHERE tenant_id = $1`, [params.id]);

    // Eliminar tenant
    await query(`DELETE FROM tenants WHERE id = $1`, [params.id]);

    return NextResponse.json({
      ok: true,
      message: "Empresa eliminada correctamente",
    });
  } catch (error) {
    console.error("Error deleting tenant:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Error al eliminar empresa" },
      { status: 500 }
    );
  }
}
