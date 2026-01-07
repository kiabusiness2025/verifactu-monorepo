import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppUrl, getLandingUrl } from "./lib/urls";

function hasSession(req: NextRequest) {
  const cookies = req.cookies;
  return (
    cookies.has("__session") ||
    cookies.has("session") ||
    cookies.has("firebaseSession") ||
    cookies.has("authToken")
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isRoot = pathname === "/";

  const landingLogin = `${getLandingUrl()}/auth/login`;
  const appBase = getAppUrl();
  const current = `${appBase}${pathname}${search}`;

  if (isRoot) {
    if (hasSession(req)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const target = `${landingLogin}?next=${encodeURIComponent(current)}`;
    return NextResponse.redirect(target);
  }

  if (isDashboard && !hasSession(req)) {
    const target = `${landingLogin}?next=${encodeURIComponent(current)}`;
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
