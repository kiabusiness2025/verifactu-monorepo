import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionToken,
  readSessionSecret,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "@verifactu/utils";
import { getLandingUrl, getAppUrl } from "@verifactu/utils";

async function getSessionPayload(req: NextRequest): Promise<SessionPayload | null> {
  const cookieName = SESSION_COOKIE_NAME;
  const token = req.cookies.get(cookieName)?.value;

  console.log(`[MW] Checking session for: ${req.nextUrl.pathname}`, {
    host: req.headers.get("host"),
    hasCookie: !!token,
    cookieName,
    allCookies: req.cookies.getAll().map((c) => c.name),
  });

  if (!token) {
    console.log("[MW] No session cookie found");
    console.log(
      "[MW] Available cookies:",
      req.cookies.getAll().map((c) => `${c.name}=${c.value.substring(0, 10)}...`)
    );
    return null;
  }

  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    console.log("[MW] Session verified", {
      uid: payload?.uid,
      email: payload?.email,
      tenantId: payload?.tenantId,
    });
    return payload;
  } catch (error) {
    console.error("[MW] Session verification failed", error);
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log(`[MW] ${req.method} ${pathname}`);

  // Redirect /dashboard/admin/tenants -> /dashboard/admin/companies (permanent)
  if (pathname === "/dashboard/admin/tenants" || pathname.startsWith("/dashboard/admin/tenants/")) {
    const newPath = pathname.replace("/dashboard/admin/tenants", "/dashboard/admin/companies");
    const url = req.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url, { status: 308 });
  }

  // Public routes - no authentication needed
  const publicRoutes = [
    "/demo",
    "/api/",
    "/_next/",
  ];
  
  if (publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  )) {
    console.log("[MW] Public route - allowing without auth");
    return NextResponse.next();
  }

  // Protected routes - authentication required
  const session = await getSessionPayload(req);

  if (!session) {
    console.log("[MW] No session - redirecting to login");
    const landingUrl = getLandingUrl();
    const appUrl = getAppUrl();
    
    // Determine return URL based on path
    let returnPath = "/dashboard";
    if (pathname === "/onboarding") {
      returnPath = "/onboarding";
    } else if (pathname !== "/" && pathname !== "/dashboard") {
      returnPath = pathname;
    }
    
    const returnUrl = `${appUrl}${returnPath}`;
    const loginUrl = `${landingUrl}/auth/login?next=${encodeURIComponent(returnUrl)}`;
    console.log(`[MW] Redirect to login: ${loginUrl}`);
    return NextResponse.redirect(loginUrl);
  }

  // User has session - redirect based on onboarding status
  
  // User with tenant trying to access onboarding → dashboard
  if (pathname.startsWith("/onboarding") && session.tenantId) {
    console.log("[MW] User has tenant - redirect to dashboard");
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // User without tenant trying to access dashboard → onboarding
  if ((pathname === "/" || pathname.startsWith("/dashboard")) && !session.tenantId) {
    console.log("[MW] User needs onboarding");
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  console.log("[MW] Session valid - allowing request");
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/onboarding", "/demo", "/demo/:path*"],
};
