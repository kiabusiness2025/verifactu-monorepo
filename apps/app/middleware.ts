import { SUPPORT_SESSION_COOKIE, verifySupportToken } from "@/src/server/support/supportToken";
import {
    getAppUrl,
    getLandingUrl,
    readSessionSecret,
    SESSION_COOKIE_NAME,
    verifySessionToken,
    type SessionPayload,
} from "@verifactu/utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "Legacy admin API removed. Use admin.verifactu.business." },
      { status: 410 }
    );
  }

  // Force legacy admin routes to the new admin app
  if (pathname.startsWith("/dashboard/admin")) {
    const adminBase =
      process.env.NEXT_PUBLIC_ADMIN_URL ??
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3003"
        : "https://admin.verifactu.business");
    const target = new URL(adminBase);
    target.pathname = pathname;
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target, { status: 308 });
  }

  // Redirect /dashboard/admin/tenants -> /dashboard/admin/companies
  if (pathname === "/dashboard/admin/tenants" || pathname.startsWith("/dashboard/admin/tenants/")) {
    const newPath = pathname.replace("/dashboard/admin/tenants", "/dashboard/admin/companies");
    const url = req.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url, { status: 308 });
  }

  // Demo is always public
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    return NextResponse.next();
  }

  // Support handoff route is public (token protected)
  if (pathname.startsWith("/support/handoff")) {
    return NextResponse.next();
  }

  const supportToken = req.cookies.get(SUPPORT_SESSION_COOKIE)?.value;
  if (supportToken) {
    try {
      const support = await verifySupportToken(supportToken);
      const headers = new Headers(req.headers);
      headers.set("x-support-tenant-id", support.tenantId);
      headers.set("x-support-user-id", support.userId);
      headers.set("x-support-session-id", support.supportSessionId);
      headers.set("x-support-admin-id", support.adminId);
      return NextResponse.next({ request: { headers } });
    } catch {
      const response = NextResponse.next();
      response.cookies.delete(SUPPORT_SESSION_COOKIE);
      return response;
    }
  }

  // Admin routes are public - served without authentication requirement
  // Individual pages may have their own auth checks if needed
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isAdminRoute = pathname.startsWith("/dashboard/admin");
  
  const session = await getSessionPayload(req);

  if (!session && !isDevelopment && !isAdminRoute) {
    const landingUrl = getLandingUrl();
    const appUrl = getAppUrl();
    const returnPath = pathname === "/" ? "/dashboard" : pathname;
    const returnUrl = `${appUrl}${returnPath}`;
    const loginUrl = `${landingUrl}/auth/login?next=${encodeURIComponent(returnUrl)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/onboarding", "/demo/:path*", "/api/admin/:path*"],
};
