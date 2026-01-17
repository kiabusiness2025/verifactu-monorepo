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
  const cookieName = SESSION_COOKIE_NAME;
  const token = req.cookies.get(cookieName)?.value;

  console.log(`[🧠 MW] Checking session for: ${req.nextUrl.pathname}`, {
    host: req.headers.get("host"),
    hasCookie: !!token,
    cookieName,
    allCookies: req.cookies.getAll().map(c => c.name),
  });

  if (!token) {
    console.log("[🧠 MW] ❌ No session cookie found");
    console.log("[🧠 MW] Available cookies:", req.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 10)}...`));
    return null;
  }

  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    console.log("[🧠 MW] ✅ Session verified", { 
      uid: payload?.uid,
      email: payload?.email,
      tenantId: payload?.tenantId 
    });
    return payload;
  } catch (error) {
    console.error("[🧠 MW] ❌ Session verification failed", error);
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log(`[🧠 MW] ${req.method} ${pathname}`);

  // Redirect /dashboard/admin/tenants → /dashboard/admin/companies (permanent)
  if (pathname === "/dashboard/admin/tenants" || pathname.startsWith("/dashboard/admin/tenants/")) {
    const newPath = pathname.replace("/dashboard/admin/tenants", "/dashboard/admin/companies");
    const url = req.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url, { status: 308 }); // 308 = Permanent Redirect
  }

  // Skip public routes
  if (pathname === "/demo" || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  // Check session
  const session = await getSessionPayload(req);
  
  if (!session) {
    console.log(`[🧠 MW] ❌ No session - redirecting to login`);
    const landingUrl = getLandingUrl();
    const appUrl = getAppUrl();
    const returnUrl = `${appUrl}${pathname}`;
    const loginUrl = `${landingUrl}/auth/login?next=${encodeURIComponent(returnUrl)}`;
    console.log(`[🧠 MW] Redirect URL: ${loginUrl}`);
    return NextResponse.redirect(loginUrl);
  }

  console.log("[🧠 MW] ✅ Session valid - allowing request");
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
