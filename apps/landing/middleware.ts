import { NextRequest, NextResponse } from 'next/server';

function buildNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary);
}

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com https://apis.google.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://verifactu.business https://*.verifactu.business https://www.google-analytics.com https://analytics.google.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://apis.google.com https://accounts.google.com https://oauth2.googleapis.com",
    // Both Firebase projects: default and Holded-branded
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://verifactu-business.firebaseapp.com https://verifactu-business-48021-352e0.firebaseapp.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function applySecurityHeaders(response: NextResponse, nonce: string, isAuthRoute = false) {
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Auth routes need same-origin-allow-popups so Firebase signInWithPopup can
  // communicate through the OAuth popup window without COOP blocking it.
  response.headers.set(
    'Cross-Origin-Opener-Policy',
    isAuthRoute ? 'same-origin-allow-popups' : 'same-origin'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );
}

function isHoldedHost(host: string | null) {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return normalized === 'holded.verifactu.business' || normalized.startsWith('holded.');
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host');
  const nonce = buildNonce();
  const requestHeaders = new Headers(request.headers);
  const source = request.nextUrl.searchParams.get('source')?.toLowerCase() || '';
  const nextParam = request.nextUrl.searchParams.get('next')?.toLowerCase() || '';
  const isHoldedAuthFlow =
    pathname.startsWith('/auth/holded') ||
    source.startsWith('holded') ||
    nextParam.includes('/onboarding/holded') ||
    nextParam.includes('holded.verifactu.business');
  requestHeaders.set('x-nonce', nonce);
  if (isHoldedHost(host)) {
    requestHeaders.set('x-holded-host', '1');
    requestHeaders.set('x-hide-isaak-chat', '1');
  }
  if (isHoldedAuthFlow) {
    requestHeaders.set('x-holded-flow', '1');
  }

  if (isHoldedHost(host) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/holded';
    url.searchParams.set('variant', 'standalone');
    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
    applySecurityHeaders(response, nonce);
    return response;
  }

  // Redirigir /es/* a /*
  if (pathname.startsWith('/es/')) {
    const newPathname = pathname.slice(3);
    const response = NextResponse.redirect(new URL(newPathname, request.url), { status: 301 });
    applySecurityHeaders(response, nonce);
    return response;
  }

  // Redirigir /es (sin barra) a /
  if (pathname === '/es') {
    const response = NextResponse.redirect(new URL('/', request.url), { status: 301 });
    applySecurityHeaders(response, nonce);
    return response;
  }

  // Redirect /auth/login → /auth/holded only when the request originates from a
  // Holded host or carries a Holded-flow context (source/next).  Regular
  // Verifactu users must reach the standard login page unaffected.
  if (pathname === '/auth/login' && (isHoldedHost(host) || isHoldedAuthFlow)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/holded';
    const response = NextResponse.redirect(url, { status: 307 });
    applySecurityHeaders(response, nonce, true);
    return response;
  }

  const isAuthRoute = pathname.startsWith('/auth/');
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  applySecurityHeaders(response, nonce, isAuthRoute);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
