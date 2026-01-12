import { NextResponse } from "next/server";
import { buildSessionCookieOptions } from "@verifactu/utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("host");

  const cookieOpts = buildSessionCookieOptions({
    url: url.toString(),
    host,
    domainEnv: process.env.SESSION_COOKIE_DOMAIN,
    secureEnv: process.env.SESSION_COOKIE_SECURE,
    sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE,
    value: "",
    maxAgeSeconds: 0,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieOpts);
  return res;
}
