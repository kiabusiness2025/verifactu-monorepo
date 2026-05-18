/**
 * GET /api/auth/holded-claude/force-relogin?next=...&source=...
 *
 * Limpia la cookie `__session` (domain `.verifactu.business`) y redirige a
 * `/auth/holded-claude` preservando `next` y `source`. Lo invoca
 * `apps/holded-mcp` en su `buildFirebaseBridgeUrl({ forceRelogin: true })`
 * cuando detecta que el usuario tiene sesión válida pero su conexión Claude
 * en BD está disconnected — típicamente porque revocó el conector desde
 * Claude y ahora intenta volver a añadirlo.
 *
 * Por qué un endpoint dedicado en lugar de hacerlo en la propia page:
 * los Server Components no pueden setear/borrar cookies durante el render.
 * Las Route Handlers sí — y nos permiten redirigir limpio sin un click
 * extra del usuario.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, buildSessionCookieOptions } from '@/app/lib/session';
import { sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextParam = url.searchParams.get('next')?.trim() || '';
  const sourceParam = url.searchParams.get('source')?.trim() || 'holded_claude_force_relogin';

  // Construimos el destino: siempre la misma página /auth/holded-claude con
  // los mismos query params de continuación. sanitizeHoldedReturnTarget se
  // encarga de no permitir redirects abiertos a dominios ajenos.
  const formUrl = new URL('/auth/holded-claude', url.origin);
  if (nextParam) {
    const safeNext = sanitizeHoldedReturnTarget(nextParam, nextParam);
    formUrl.searchParams.set('next', safeNext);
  }
  formUrl.searchParams.set('source', sourceParam);
  // Marcamos que el usuario llega tras un revoke para que el form pueda
  // mostrar un mensaje informativo ("Tu conexión anterior fue desconectada,
  // confirma tu identidad para volver a conectar").
  formUrl.searchParams.set('post_revoke', '1');

  const response = NextResponse.redirect(formUrl.toString(), 302);

  // Borramos la cookie tanto sin domain (para entornos legacy) como con el
  // domain `.verifactu.business` que es donde realmente vive en producción.
  const cookieOptions = buildSessionCookieOptions({
    url: url.toString(),
    host: request.headers.get('host'),
    domainEnv: process.env.SESSION_COOKIE_DOMAIN || '.verifactu.business',
    secureEnv: process.env.SESSION_COOKIE_SECURE || 'true',
    sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || 'none',
    value: '',
    maxAgeSeconds: 0,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    domain: cookieOptions.domain,
    maxAge: 0,
    expires: new Date(0),
  });

  // Defensive: también limpiar la versión sin domain por si la cookie venía
  // sembrada por un flow legacy sin domain explícito.
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
