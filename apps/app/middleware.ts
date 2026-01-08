import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAppUrl, getLandingUrl } from "./lib/urls";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function hasValidSession(req: NextRequest) {
  const token = req.cookies.get("__session")?.value;
  const secret = getSecretKey();
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isRoot = pathname === "/";

  const landingLogin = `${getLandingUrl()}/auth/login`;
  const appBase = getAppUrl();
  const current = `${appBase}${pathname}${search}`;

  if (isRoot) {
    if (await hasValidSession(req)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const target = `${landingLogin}?next=${encodeURIComponent(current)}`;
    return NextResponse.redirect(target);
  }

  if (isDashboard && !(await hasValidSession(req))) {
    const target = `${landingLogin}?next=${encodeURIComponent(current)}`;
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
