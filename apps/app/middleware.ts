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

  const session = await getSessionPayload(req);

  if (!session) {
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
  matcher: ["/", "/dashboard/:path*", "/onboarding", "/demo/:path*"],
};
