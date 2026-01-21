import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/api/auth", // NextAuth
  "/_next",
  "/favicon.ico",
  "/robots.txt",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signin";
    url.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(url);
  }

  const email = (token.email || "").toLowerCase();
  const role = (token.role || "USER") as string;

  const allowedEmail = (process.env.ADMIN_ALLOWED_EMAIL || "support@verifactu.business").toLowerCase();
  const allowedDomain = (process.env.ADMIN_ALLOWED_DOMAIN || "verifactu.business").toLowerCase();

  const emailOk = email === allowedEmail || email.endsWith(`@${allowedDomain}`);
  const roleOk = role === "SUPPORT" || role === "ADMIN";

  if (!emailOk || !roleOk) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
