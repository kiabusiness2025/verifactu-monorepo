import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    const hasCustomers = await tableExists("customers");
    if (!hasCustomers) {
      return NextResponse.json({ items: [] });
    }

    const [hasNif, hasEmail, hasCreatedAt] = await Promise.all([
      columnExists("customers", "nif"),
      columnExists("customers", "email"),
      columnExists("customers", "created_at"),
    ]);

    const rows = await query<{
      id: string;
      name: string | null;
      nif: string | null;
      email: string | null;
      created_at: string | null;
    }>(
      `SELECT
         c.id,
         c.name,
         ${hasNif ? "c.nif" : "NULL::text"} as nif,
         ${hasEmail ? "c.email" : "NULL::text"} as email,
         ${hasCreatedAt ? "c.created_at::text" : "NULL::text"} as created_at
       FROM customers c
       WHERE c.tenant_id = $1::uuid
       ORDER BY ${hasCreatedAt ? "c.created_at DESC" : "c.name ASC"}
       LIMIT 200`,
      [tenantId]
    );

    return NextResponse.json({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name ?? "",
        nif: row.nif ?? null,
        email: row.email ?? null,
        createdAt: row.created_at ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al obtener clientes del tenant" }, { status: 500 });
  }
}
