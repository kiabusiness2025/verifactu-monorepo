import { getSessionPayload } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getSessionPayload();
  if (!payload) {
    return NextResponse.json({ ok: false, error: "No hay una sesión activa" }, { status: 401 });
  }

  const issuedAt = payload.iat ? new Date(payload.iat * 1000).toISOString() : null;
  const expiresAt = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;

  return NextResponse.json({
    ok: true,
    session: {
      email: payload.email ?? null,
      tenantId: payload.tenantId ?? null,
      issuedAt,
      expiresAt,
      rememberDevice: payload.rememberDevice ?? null,
    },
  });
}
