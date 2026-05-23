import { NextRequest, NextResponse } from 'next/server';
import { buildSessionCookieOptions, verifySessionTokenFromEnv } from '@/app/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cross-domain session handoff endpoint.
// Called by verifactu.business/auth/isaak after login when the destination
// is isaak.app (a different domain that can't share the .verifactu.business cookie).
// The landing app passes the signed JWT in ?_t=... and we set our own __session cookie.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawToken = searchParams.get('_t')?.trim() ?? '';
  const rawNext = searchParams.get('next')?.trim() ?? '';

  const appUrl = process.env.NEXT_PUBLIC_ISAAK_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Resolve safe redirect target (relative paths only, or same-origin absolute)
  function safeNext(): string {
    const fallback = '/chat';
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
  if (!payload?.uid || !payload.tenantId) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  const host = req.headers.get('host');
  const cookieOpts = buildSessionCookieOptions({
    url: req.url,
    host,
    domainEnv: null, // no shared domain: cookie binds to current origin (isaak.app)
    secureEnv: 'true',
    sameSiteEnv: 'lax',
    value: rawToken,
    maxAgeSeconds: 60 * 60 * 24 * 30,
  });

  const destination = safeNext();
  const response = NextResponse.redirect(new URL(destination, req.url));
  response.cookies.set(cookieOpts);
  return response;
}
