import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebaseAdmin";

const COOKIE_NAME = "__session";
// Cookie expira en 14 días, pero Firebase token expira en 1 hora
// El cliente debe refrescar el token antes de que expire
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function getDomainAndSecure(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isProd = host.includes("verifactu.business");

  return {
    domain: isProd ? ".verifactu.business" : undefined,
    secure: isProd,
  };
}

export async function POST(req: NextRequest) {
  let payload: { idToken?: string } = {};
  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const idToken = payload.idToken;
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Falta idToken" }, { status: 400 });
  }

  // Verificar el ID token con Firebase Admin
  try {
    const decodedToken = await verifyIdToken(idToken);
    
    // Token válido, crear sesión
    const res = NextResponse.json({ 
      ok: true, 
      uid: decodedToken.uid,
      email: decodedToken.email 
    });
    const { domain, secure } = getDomainAndSecure(req);

    res.cookies.set({
      name: COOKIE_NAME,
      value: idToken,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      domain,
      maxAge: MAX_AGE,
    });

    return res;
  } catch (error) {
    console.error("Error verificando token:", error);
    return NextResponse.json(
      { error: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const { domain, secure } = getDomainAndSecure(req);

  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    domain,
    maxAge: 0,
  });

  return res;
}