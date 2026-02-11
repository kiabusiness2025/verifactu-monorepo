import { requireAdmin } from "@/lib/adminAuth";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ ok: false, error: "No hay una sesión activa" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      session: {
        expires: session.expires ?? null,
        user: {
          email: session.user?.email ?? null,
          name: session.user?.name ?? null,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "No se pudo cargar la sesión" }, { status: 500 });
  }
}
