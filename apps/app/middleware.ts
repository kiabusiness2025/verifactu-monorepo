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
  console.log("[🧠 MW] getSessionPayload", {
    hasCookie: !!token,
    cookieName: SESSION_COOKIE_NAME,
    cookieValue: token ? `${token.substring(0, 20)}...` : "none",
    allCookies: Array.from(req.cookies.entries()).map(([k]) => k),
  });

  if (!token) {
    console.log("[🧠 MW] No session token found");
    return null;
  }

  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    console.log("[🧠 MW] Session verified successfully", {
      uid: payload?.uid,
      email: payload?.email,
    });
    return payload;
  } catch (error) {
    console.error("[🧠 MW] Session verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Public routes
  if (pathname === "/demo" || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  console.log("[🧠 MW] Incoming request", {
    pathname,
    host: req.headers.get("host"),
  });

  const landingLogin = `${getLandingUrl()}/auth/login`;
  const appBase = getAppUrl();
  const current = `${appBase}${pathname}${search}`;
  const sessionPayload = await getSessionPayload(req);

  console.log("[🧠 MW] Session check", {
    pathname,
    hasSession: !!sessionPayload,
    uid: sessionPayload?.uid,
  });

  // Root: redirect to dashboard if authenticated, else to landing login
  if (pathname === "/") {
    if (sessionPayload) {
      console.log("[🧠 MW] Root redirect to dashboard (authenticated)");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    console.log("[🧠 MW] Root redirect to landing login");
    return NextResponse.redirect(`${landingLogin}?next=${encodeURIComponent(current)}`);
  }

  // Protected routes: require session
  if (!sessionPayload) {
    console.log("[🧠 MW] Redirecting to login - no session", { pathname });
    return NextResponse.redirect(`${landingLogin}?next=${encodeURIComponent(current)}`);
  }

  // Admin routes: require admin privilege
  const isAdminRoute = pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
  if (isAdminRoute && !isAdmin(sessionPayload)) {
    console.log("[🧠 MW] Forbidden - not admin", { pathname });
    return new NextResponse("Forbidden", { status: 403 });
  }

  console.log("[🧠 MW] Allowing request", { pathname });
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
