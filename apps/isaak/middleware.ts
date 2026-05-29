// SEC C3 (2026) — Origin enforcement para mitigar CSRF.
//
// Bloquea peticiones de mutación (POST/PATCH/PUT/DELETE) cuyo header
// Origin no coincida con uno de los hosts permitidos del producto.
//
// Esto, sumado a la cookie con SameSite=lax (resolveSameSite en
// packages/utils/session.ts), forma defensa en profundidad contra CSRF.
//
// Excepciones (no se aplica):
//   * GET / HEAD / OPTIONS (idempotentes)
//   * Webhooks externos firmados (banking, stripe, holded-mcp) — la
//     firma criptográfica ya autoriza al payload
//   * Rutas explícitamente públicas (/api/chat/public, /api/public/*,
//     /api/health, etc.)

import { NextRequest, NextResponse } from 'next/server';

// Hosts permitidos por defecto. Se pueden extender via env
// ISAAK_ALLOWED_ORIGINS (lista separada por comas).
const DEFAULT_ALLOWED_HOSTS = [
  'isaak.chat',
  'www.isaak.chat',
  'isaak.app',
  'isaak.verifactu.business',
  'app.verifactu.business',
  'verifactu.business',
  'localhost',
  '127.0.0.1',
];

// Rutas exentas del check Origin. Webhooks externos vienen firmados.
const EXEMPT_PREFIXES = [
  '/api/isaak/banking/saltedge/webhook',
  '/api/isaak/banking/gcbd/webhook',
  '/api/isaak/banking/webhook', // GoCardless payments
  '/api/holded-mcp/webhook',
  '/api/stripe/webhook',
  '/api/chat/public', // chat público no autenticado
  '/api/public/', // endpoints públicos /api/public/*
  '/api/health',
  '/api/cron/', // crons llegan con Bearer secret, no Origin
];

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function getAllowedHosts(): Set<string> {
  const extra = (process.env.ISAAK_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...extra]);
}

function isAllowedOrigin(originHeader: string | null, allowed: Set<string>): boolean {
  if (!originHeader) return false;
  let originUrl: URL;
  try {
    originUrl = new URL(originHeader);
  } catch {
    return false;
  }
  return allowed.has(originUrl.hostname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplica a rutas API
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Métodos idempotentes pasan sin check
  if (!MUTATION_METHODS.has(request.method)) return NextResponse.next();

  // Rutas exentas
  for (const prefix of EXEMPT_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next();
  }

  const allowed = getAllowedHosts();
  const origin = request.headers.get('origin');

  // Origin presente → debe ser allowed
  if (origin) {
    if (!isAllowedOrigin(origin, allowed)) {
      return NextResponse.json(
        { error: 'csrf_blocked', message: `Origin no permitido: ${origin}` },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  // Origin ausente: aceptamos solo si Referer matchea (fallback para
  // clientes que no envíen Origin, p.ej. algunos formularios HTML).
  const referer = request.headers.get('referer');
  if (referer && isAllowedOrigin(referer, allowed)) {
    return NextResponse.next();
  }

  // Sin Origin ni Referer válido → bloquear.
  // Esto rechaza CSRF clásico (formulario en otro dominio) porque el
  // navegador siempre envía Origin o Referer en POST cross-origin.
  return NextResponse.json(
    { error: 'csrf_blocked', message: 'Falta Origin/Referer válido.' },
    { status: 403 },
  );
}

export const config = {
  // Aplica a TODAS las rutas API. Las exclusiones se gestionan dentro
  // del middleware (EXEMPT_PREFIXES) para mantener un único punto de
  // verdad.
  matcher: '/api/:path*',
};
