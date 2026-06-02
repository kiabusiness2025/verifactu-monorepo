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

const V1_RESTRICTED_PREFIXES = [
  '/ventas',
  '/gastos',
  '/banking',
  '/informes',
  '/mail',
  '/calendario',
  '/whatsapp',
  '/microsoft',
  '/fiscal',
  '/auditoria',
  '/inspector',
  '/sede',
  '/perfil-fiscal',
  '/contactos',
  '/equipo',
  '/advisor',
  '/sede-corpus',
  '/asesor-legal',
  '/webhooks',
  '/compartir-isaak',
  '/ajustes/notificaciones',
  '/verifactu',
];

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function isV1LaunchEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ISAAK_V1_LAUNCH ?? process.env.ISAAK_V1_LAUNCH;
  return ['true', '1', 'yes'].includes((raw ?? '').trim().toLowerCase());
}

function isRestrictedV1Path(pathname: string): boolean {
  return V1_RESTRICTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

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

  if (isV1LaunchEnabled() && !pathname.startsWith('/api/') && isRestrictedV1Path(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/chat';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // CSRF: solo aplica a rutas API
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
        { status: 403 }
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
    { status: 403 }
  );
}

export const config = {
  // API completa para CSRF + paginas workspace para el recorte V1.
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\..*).*)',
  ],
};
