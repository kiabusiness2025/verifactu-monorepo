import { NextRequest, NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/session";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/check
 * Verifica si el usuario actual tiene permisos de administrador
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    
    if (!session?.email) {
      return NextResponse.json({ isAdmin: false });
    }

    // Verificar si el email está en la lista de administradores
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = adminEmails.includes(session.email);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("[Admin Check Error]", error);
    return NextResponse.json({ isAdmin: false });
  }
}
