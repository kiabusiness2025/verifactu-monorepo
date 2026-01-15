import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const envVars = {
    SESSION_SECRET_EXISTS: !!process.env.SESSION_SECRET,
    SESSION_SECRET_LENGTH: process.env.SESSION_SECRET?.length || 0,
    SESSION_COOKIE_DOMAIN: process.env.SESSION_COOKIE_DOMAIN,
    SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
    SESSION_COOKIE_SAMESITE: process.env.SESSION_COOKIE_SAMESITE,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(envVars);
}
