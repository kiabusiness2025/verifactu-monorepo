import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "__session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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

  // TODO: Verificar el ID token con Firebase Admin cuando esté disponible.
  const res = NextResponse.json({ ok: true });
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
