import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "__session";

function getDomainAndSecure(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isProd = host.includes("verifactu.business");

  return {
    domain: isProd ? ".verifactu.business" : undefined,
    secure: isProd,
  };
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const { domain, secure } = getDomainAndSecure(req);

  // Limpiar cookie de sesión
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
