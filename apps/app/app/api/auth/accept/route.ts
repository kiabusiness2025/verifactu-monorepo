import { buildSessionCookieOptions, verifySessionTokenFromEnv } from '@verifactu/utils';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cross-domain session handoff endpoint.
// Called by verifactu.business/auth after login when the destination
// is app.verifactu.business (different domain, can't share the landing cookie).
// The landing app passes the signed JWT in ?_t=... and we set our own __session cookie.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawToken = searchParams.get('_t')?.trim() ?? '';
  const rawNext = searchParams.get('next')?.trim() ?? '';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  function safeNext(): string {
    const fallback = '/dashboard';
    if (!rawNext) return fallback;
    if (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://')) {
      return rawNext;
    }
    if (appUrl) {
      try {
        const target = new URL(rawNext);
        const allowed = new URL(appUrl).origin;
        if (target.origin === allowed) return target.pathname + target.search + target.hash;
      } catch {
        // fall through
      }
    }
    return fallback;
  }

  if (!rawToken) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  const payload = await verifySessionTokenFromEnv(rawToken).catch(() => null);
  if (!payload?.uid) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  const host = req.headers.get('host');
  const cookieOpts = buildSessionCookieOptions({
    url: req.url,
    host,
    domainEnv: process.env.SESSION_COOKIE_DOMAIN,
    secureEnv: process.env.SESSION_COOKIE_SECURE,
    sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE,
    value: rawToken,
    maxAgeSeconds: 60 * 60 * 24 * 30,
  });

  const destination = safeNext();
  const response = NextResponse.redirect(new URL(destination, req.url));
  response.cookies.set(cookieOpts);
  return response;
}
