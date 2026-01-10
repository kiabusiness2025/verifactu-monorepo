import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAppUrl, getLandingUrl } from "./lib/urls";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function getSessionPayload(req: NextRequest) {
  const token = req.cookies.get("__session")?.value;
  const secret = getSecretKey();
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

function parseAllowlist(value?: string) {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAdmin(payload: Record<string, unknown> | null) {
  if (!payload) return false;
  const adminUids = parseAllowlist(process.env.ADMIN_UIDS);
  const adminEmails = parseAllowlist(process.env.ADMIN_EMAILS);
  const uid = typeof payload.uid === "string" ? payload.uid.toLowerCase() : "";
  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (uid && adminUids.has(uid)) return true;
  if (email && adminEmails.has(email)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAdminRoute =
    pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
  const isRoot = pathname === "/";
  const isDemo = pathname === "/demo";

  // Demo is always public
  if (isDemo) {
    return NextResponse.next();
  }

  const landingLogin = `${getLandingUrl()}/auth/login`;
  const appBase = getAppUrl();
  const current = `${appBase}${pathname}${search}`;
  const sessionPayload = (isRoot || isDashboard) ? await getSessionPayload(req) : null;

  if (isRoot) {
    if (sessionPayload) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const target = `${landingLogin}?next=${encodeURIComponent(current)}`;
    return NextResponse.redirect(target);
  }

  if (isDashboard && !sessionPayload) {
    const target = `${landingLogin}?next=${encodeURIComponent(current)}`;
    return NextResponse.redirect(target);
  }

  if (isAdminRoute && !isAdmin(sessionPayload)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/demo"],
};
