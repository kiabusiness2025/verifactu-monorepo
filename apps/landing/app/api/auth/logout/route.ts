import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieDomainFromHost(host: string | null) {
  if (!host) return undefined;
  if (host.endsWith("verifactu.business")) return ".verifactu.business";
  return undefined;
}

export async function POST(req: Request) {
  const host = req.headers.get("host");
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: "__session",
    value: "",
    httpOnly: true,
    secure: new URL(req.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    domain: cookieDomainFromHost(host),
    maxAge: 0,
  });

  return res;
}
