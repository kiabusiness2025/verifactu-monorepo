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
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://verifactu.business https://*.verifactu.business https://www.google-analytics.com https://analytics.google.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
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

  if (isHoldedHost(host) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/holded';
    const response = NextResponse.rewrite(url);
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  applySecurityHeaders(response, nonce);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
