import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = '__session';

// Rutas que requieren autenticación
const PROTECTED_PREFIXES = ['/t/', '/dashboard'];

// Rutas legacy que redirigimos al nuevo path (sin tenantSlug → login primero)
const LEGACY_REDIRECTS: Record<string, string> = {
  '/dashboard': '/workspace',
  '/workspace/dashboard': '/workspace',
  '/workspace/workspace': '/workspace',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const normalizedPath =
    pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const session = req.cookies.get(SESSION_COOKIE)?.value;

  // Redirigir raíz
  if (normalizedPath === '/') {
    const target = new URL(session ? '/workspace' : '/login', req.url);
    return NextResponse.redirect(target);
  }

  // Redirigir rutas legacy a login (no tenemos tenantSlug aquí)
  if (normalizedPath in LEGACY_REDIRECTS) {
    const target = new URL(session ? LEGACY_REDIRECTS[normalizedPath] : '/login', req.url);
    return NextResponse.redirect(target);
  }

  // Proteger rutas autenticadas
  const isProtected = PROTECTED_PREFIXES.some((p) => normalizedPath.startsWith(p));
  if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', normalizedPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Excluir: archivos estáticos, _next, api routes y favicon
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
