import {
  ADMIN_SESSION_REMEMBER_MAX_AGE_SECONDS,
  ADMIN_SESSION_SHORT_MAX_AGE_SECONDS,
  createAuthOptions,
} from '@/lib/auth-options';
import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ADMIN_REMEMBER_COOKIE = 'admin_remember_device';

function isTruthyRemember(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return null;
}

function readCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function handle(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const url = new URL(req.url);

  const rememberFromQuery = isTruthyRemember(url.searchParams.get('rememberDevice'));
  if (rememberFromQuery !== null) {
    url.searchParams.delete('rememberDevice');
    const response = NextResponse.redirect(url);
    response.cookies.set({
      name: ADMIN_REMEMBER_COOKIE,
      value: rememberFromQuery ? '1' : '0',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 60 * 15,
    });
    return response;
  }

  const rememberFromCookie = isTruthyRemember(readCookie(req, ADMIN_REMEMBER_COOKIE));
  const sessionMaxAge = rememberFromCookie
    ? ADMIN_SESSION_REMEMBER_MAX_AGE_SECONDS
    : ADMIN_SESSION_SHORT_MAX_AGE_SECONDS;

  const handler = NextAuth(createAuthOptions(sessionMaxAge));
  return handler(req, ctx);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return handle(req, { params: await ctx.params });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return handle(req, { params: await ctx.params });
}
