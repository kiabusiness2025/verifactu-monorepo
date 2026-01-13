import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(_req);
    const tenantId = params.id;

    // Asegurar membership owner para el admin
    await query(
      `INSERT INTO memberships (tenant_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [tenantId, admin.userId]
    );

    await query(
      `INSERT INTO user_preferences (user_id, preferred_tenant_id, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE
       SET preferred_tenant_id = EXCLUDED.preferred_tenant_id, updated_at = EXCLUDED.updated_at`,
      [admin.userId, tenantId]
    );

    return NextResponse.json({ ok: true, activeTenantId: tenantId });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al activar empresa" }, { status: 500 });
  }
}
