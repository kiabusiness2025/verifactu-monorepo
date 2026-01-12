import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionToken,
  readSessionSecret,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "@verifactu/utils";
import { getLandingUrl, getAppUrl } from "@verifactu/utils";

function parseAllowlist(value?: string) {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAdmin(payload: SessionPayload | null) {
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

async function getSessionPayload(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = readSessionSecret();
    return await verifySessionToken(token, secret);
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Public routes
  if (pathname === "/demo" || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const landingLogin = `${getLandingUrl()}/auth/login`;
  const appBase = getAppUrl();
  const current = `${appBase}${pathname}${search}`;
  const sessionPayload = await getSessionPayload(req);

  // Root: redirect to dashboard if authenticated, else to landing login
  if (pathname === "/") {
    if (sessionPayload) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(`${landingLogin}?next=${encodeURIComponent(current)}`);
  }

  // Protected routes: require session
  if (!sessionPayload) {
    return NextResponse.redirect(`${landingLogin}?next=${encodeURIComponent(current)}`);
  }

  // Admin routes: require admin privilege
  const isAdminRoute = pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
  if (isAdminRoute && !isAdmin(sessionPayload)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/invoices/:path*",
    "/documents/:path*",
    "/expenses/:path*",
    "/app/:path*",
    "/demo",
  ],
};
