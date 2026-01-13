import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Verificar que el usuario es admin
    await requireAdmin(req);

    // Obtener todos los usuarios con sus tenants
    const users = await query<{
      id: string;
      email: string;
      name: string;
      created_at: string;
    }>(
      `SELECT id, email, name, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    // Para cada usuario, obtener sus tenants
    const usersWithTenants = await Promise.all(
      users.map(async (user) => {
        const tenants = await query<{
          id: string;
          legal_name: string | null;
          name: string;
          role: string;
        }>(
          `SELECT t.id, t.legal_name, t.name, m.role
           FROM tenants t
           JOIN memberships m ON m.tenant_id = t.id
           WHERE m.user_id = $1 AND m.status = 'active'`,
          [user.id]
        );
        return {
          id: user.id,
          email: user.email,
          displayName: user.name ?? null,
          createdAt: user.created_at,
          tenants: tenants.map((t) => ({
            tenantId: t.id,
            legalName: t.legal_name ?? t.name,
            role: t.role,
          })),
        };
      })
    );

    return NextResponse.json({ users: usersWithTenants });
  } catch (error) {
    console.error("Error fetching users:", error);
    
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
