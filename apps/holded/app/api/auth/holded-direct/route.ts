/**
 * POST /api/auth/holded-direct  (canal = mobile)
 *
 * Wrapper F2.2 de la arquitectura unificada de conectores Holded.
 *
 * Recibe el form simple de `/auth/holded-direct` y delega TODA la lógica de
 * upsert (User → Tenant → Membership → ExternalConnection + emails admin) en
 * el endpoint común F1.1 del backend `apps/app`:
 *   POST {APP_PUBLIC_URL}/api/integrations/holded/upsert-from-key
 *
 * Responsabilidades propias del wrapper:
 *   - Parsear y normalizar el body que envía el form.
 *   - Sanitizar el `next` para que no se pueda redirigir fuera de los hosts
 *     permitidos (`holded.verifactu.business` / `app.verifactu.business`).
 *   - Mintear la cookie `.verifactu.business` (SameSite=None, Secure) con el
 *     payload de sesión correcto a partir del `userId` + `tenantId` que el
 *     endpoint F1.1 devuelve.
 *   - Traducir los códigos de error de F1 a los códigos que la UI ya maneja
 *     (MISSING_FIELDS / INVALID_EMAIL / TERMS_NOT_ACCEPTED / INVALID_API_KEY
 *     / PROBE_ERROR / DB_ERROR / SESSION_ERROR / NETWORK_ERROR).
 *
 * Esto cumple la Decisión Clave #1 del plan: "Endpoint común vs
 * implementaciones separadas: ELEGIDO endpoint común (DRY, single source of
 * truth)".
 */

import { sanitizeHoldedReturnTarget, APP_PUBLIC_URL } from '@/app/lib/holded-navigation';
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionSecret,
  signSessionToken,
} from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días
const UPSERT_PATH = '/api/integrations/holded/upsert-from-key';
const F2_CHANNEL = 'mobile' as const;
const F2_SOURCE = 'chatgpt_mobile_form' as const;

/** Errores F1 (helper) → códigos UI F2 (los que conoce `page.tsx`). */
function translateUpsertReason(reason: string | undefined): {
  code:
    | 'MISSING_FIELDS'
    | 'INVALID_EMAIL'
    | 'TERMS_NOT_ACCEPTED'
    | 'INVALID_API_KEY'
    | 'PROBE_ERROR'
    | 'DB_ERROR';
  status: number;
} {
  switch (reason) {
    case 'missing_api_key':
    case 'invalid_channel':
      return { code: 'MISSING_FIELDS', status: 400 };
    case 'invalid_personal_email':
      return { code: 'INVALID_EMAIL', status: 400 };
    case 'legal_acceptance_required':
      return { code: 'TERMS_NOT_ACCEPTED', status: 400 };
    case 'invalid_api_key':
      return { code: 'INVALID_API_KEY', status: 400 };
    case 'probe_failed':
      return { code: 'PROBE_ERROR', status: 502 };
    case 'persist_failed':
    default:
      return { code: 'DB_ERROR', status: 500 };
  }
}

type UpsertSuccess = {
  ok: true;
  userId: string;
  tenantId: string;
  connectionId: string;
  status: 'connected' | 'error';
  legalAcceptedAt: string;
};

type UpsertFailure = {
  ok: false;
  stage?: string;
  reason?: string;
  detail?: string;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const { email, apiKey, acceptedTerms, acceptedPrivacy, next } = body as Record<string, unknown>;

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  const normalizedNext = typeof next === 'string' ? next.trim() : '';

  if (!normalizedEmail || !normalizedApiKey) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }
  if (!acceptedTerms || !acceptedPrivacy) {
    return NextResponse.json({ error: 'TERMS_NOT_ACCEPTED' }, { status: 400 });
  }

  // Llamada al endpoint F1.1 (single source of truth para el upsert).
  let upsertResponse: Response;
  try {
    upsertResponse = await fetch(`${APP_PUBLIC_URL}${UPSERT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Propagamos el request-id si está, para correlacionar logs
        ...(request.headers.get('x-request-id')
          ? { 'x-request-id': request.headers.get('x-request-id') as string }
          : {}),
      },
      body: JSON.stringify({
        personalEmail: normalizedEmail,
        holdedApiKey: normalizedApiKey,
        channel: F2_CHANNEL,
        source: F2_SOURCE,
        acceptedTerms: acceptedTerms === true,
        acceptedPrivacy: acceptedPrivacy === true,
      }),
      // El upsert debe ir contra estado fresco; nada de cache
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[holded-direct] upsert HTTP failed:', err);
    return NextResponse.json({ error: 'PROBE_ERROR' }, { status: 502 });
  }

  let upsertJson: UpsertSuccess | UpsertFailure;
  try {
    upsertJson = (await upsertResponse.json()) as UpsertSuccess | UpsertFailure;
  } catch {
    console.error('[holded-direct] upsert returned non-JSON', {
      status: upsertResponse.status,
    });
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  if (!upsertJson.ok) {
    const { code, status } = translateUpsertReason(upsertJson.reason);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[holded-direct] upsert rejected', {
        stage: upsertJson.stage,
        reason: upsertJson.reason,
        detail: upsertJson.detail,
      });
    }
    return NextResponse.json({ error: code }, { status });
  }

  const { userId, tenantId } = upsertJson;

  // Mintamos la cookie de sesión (la única responsabilidad del wrapper).
  let token: string;
  try {
    const secret = readSessionSecret();
    token = await signSessionToken({
      payload: {
        uid: userId,
        email: normalizedEmail,
        tenantId,
        role: 'owner',
        roles: ['owner'],
        tenants: [tenantId],
        ver: 1,
        rememberDevice: true,
      },
      secret,
      expiresIn: `${SESSION_MAX_AGE_SECONDS}s`,
    });
  } catch (err) {
    console.error('[holded-direct] Session sign failed:', err);
    return NextResponse.json({ error: 'SESSION_ERROR' }, { status: 500 });
  }

  const url = new URL(request.url);
  const host = request.headers.get('host');
  const cookieOptions = buildSessionCookieOptions({
    url: url.toString(),
    host,
    domainEnv: process.env.SESSION_COOKIE_DOMAIN || '.verifactu.business',
    secureEnv: process.env.SESSION_COOKIE_SECURE || 'true',
    sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || 'none',
    value: token,
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
  });

  // F2 (auditoria OpenAI 2026-05-08, sesion video demo): cuando el `next`
  // apunta a `/oauth/authorize`, el endpoint /oauth/authorize requiere los
  // flags `connection_confirmed=1` + `connected_provider_account_id` +
  // `tenant_id` para confirmar que el upsert via F1 ya genero una conexion
  // valida. Sin estos flags, oauth/authorize evalua hasSharedHoldedConnection
  // → redirige a /onboarding/holded LEGACY → el usuario tiene que pegar la
  // API key OTRA VEZ. Bug que aparecio en el video del demo: dos pantallas
  // pidiendo la API key consecutivamente.
  //
  // Fix: si el next es un /oauth/authorize, aumentamos su querystring con
  // los flags de confirmacion antes de devolverlo al cliente. Para otros
  // destinos (dashboard normal) no tocamos nada.
  let redirectUrl = sanitizeHoldedReturnTarget(normalizedNext || undefined, '/dashboard');
  try {
    const parsedRedirect = new URL(redirectUrl);
    if (parsedRedirect.pathname === '/oauth/authorize') {
      parsedRedirect.searchParams.set('connection_confirmed', '1');
      parsedRedirect.searchParams.set('connected_provider_account_id', upsertJson.connectionId);
      parsedRedirect.searchParams.set('tenant_id', tenantId);
      redirectUrl = parsedRedirect.toString();
    }
  } catch {
    // El redirectUrl puede ser una ruta relativa (e.g. "/dashboard") cuando
    // no hay `next`. En ese caso no aplican los flags OAuth — seguimos.
  }

  const response = NextResponse.json({ ok: true, redirectUrl });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: cookieOptions.value,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    domain: cookieOptions.domain,
    maxAge: cookieOptions.maxAge,
  });
  return response;
}
