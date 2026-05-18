/**
 * POST /api/auth/holded-claude  (canal = claude)
 *
 * Wrapper F2.3 de la arquitectura unificada de conectores Holded.
 * Identical to /api/auth/holded-direct but stores channel='claude' so
 * the connection resolver can distinguish Claude Desktop connections.
 */

import { sendHoldedConnectedCommunication } from '@/app/lib/communications/holded-email-service';
import { sanitizeHoldedReturnTarget, APP_PUBLIC_URL } from '@/app/lib/holded-navigation';
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionSecret,
  signSessionToken,
  verifySessionToken,
} from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días
const UPSERT_PATH = '/api/integrations/holded/upsert-from-key';
const F2_CHANNEL = 'claude' as const;
const F2_SOURCE = 'claude_consent_screen' as const;

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

  const { apiKey, acceptedTerms, acceptedPrivacy, next } = body as Record<string, unknown>;

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }
  let normalizedEmail: string;
  try {
    const session = await verifySessionToken(sessionToken, readSessionSecret());
    if (!session?.email) throw new Error('no email in session');
    normalizedEmail = session.email;
  } catch {
    return NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  const normalizedNext = typeof next === 'string' ? next.trim() : '';

  if (!normalizedApiKey) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }
  if (!acceptedTerms || !acceptedPrivacy) {
    return NextResponse.json({ error: 'TERMS_NOT_ACCEPTED' }, { status: 400 });
  }

  let upsertResponse: Response;
  try {
    upsertResponse = await fetch(`${APP_PUBLIC_URL}${UPSERT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[holded-claude] upsert HTTP failed:', err);
    return NextResponse.json({ error: 'PROBE_ERROR' }, { status: 502 });
  }

  let upsertJson: UpsertSuccess | UpsertFailure;
  try {
    upsertJson = (await upsertResponse.json()) as UpsertSuccess | UpsertFailure;
  } catch {
    console.error('[holded-claude] upsert returned non-JSON', {
      status: upsertResponse.status,
    });
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  if (!upsertJson.ok) {
    const { code, status } = translateUpsertReason(upsertJson.reason);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[holded-claude] upsert rejected', {
        stage: upsertJson.stage,
        reason: upsertJson.reason,
        detail: upsertJson.detail,
      });
    }
    return NextResponse.json({ error: code }, { status });
  }

  const { userId, tenantId } = upsertJson;

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
    console.error('[holded-claude] Session sign failed:', err);
    return NextResponse.json({ error: 'SESSION_ERROR' }, { status: 500 });
  }

  // Email de confirmación (paridad con flow ChatGPT). Best-effort: no
  // bloqueamos la respuesta si Resend falla. F1 no nos devuelve aún
  // companyName/modules/isFirstConnection — usamos placeholders mínimos.
  try {
    await sendHoldedConnectedCommunication({
      name: normalizedEmail.split('@')[0] || 'Holded user',
      userEmail: normalizedEmail,
      companyName: 'tu cuenta de Holded',
      supportedModules: [],
      channel: 'claude',
      returnUrl: normalizedNext || null,
      isFirstConnection: false,
    });
  } catch (emailErr) {
    console.warn('[holded-claude] Connected email send failed:', emailErr);
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

  // ──────────────────────────────────────────────────────────────────────
  // 2026-05-18 (III): si el `next` apunta al /oauth/authorize de holded-mcp,
  // hacemos un POST server-to-server al mismo endpoint forwardeando la
  // cookie __session recién firmada. Eso simula exactamente lo que hacía
  // el consent screen HTML al hacer click en "Authorize", pero sin que el
  // usuario vea esa pantalla coral.
  //
  // El handler POST /oauth/authorize del MCP:
  //   1. Lee la cookie __session (la pasamos en la Cookie header) → tiene
  //      sesión verificada con email del usuario.
  //   2. Ejecuta F1 upsert (idempotente, ya hicimos uno arriba — coste
  //      despreciable).
  //   3. Genera el authorization code.
  //   4. Devuelve 302 con Location apuntando a redirect_uri?code=...&state=...
  //
  // Con `redirect: 'manual'` extraemos la Location header y se la
  // devolvemos al form, que hace window.location.replace(...) → el usuario
  // llega directo a Claude.
  //
  // Esta aproximación NO requiere ningún env var compartido nuevo —
  // utiliza la cookie firmada con SESSION_SECRET (que ya está sincronizada
  // entre apps/holded y apps/holded-mcp para que el bridge funcione).
  let redirectUrl = sanitizeHoldedReturnTarget(normalizedNext || undefined, '/dashboard');
  try {
    const parsedRedirect = new URL(redirectUrl);
    if (parsedRedirect.pathname === '/oauth/authorize') {
      const sp = parsedRedirect.searchParams;
      const postBody = new URLSearchParams({
        personal_email: normalizedEmail,
        holded_api_key: normalizedApiKey,
        accepted_terms: 'on',
        accepted_privacy: 'on',
        client_id: sp.get('client_id') ?? '',
        redirect_uri: sp.get('redirect_uri') ?? '',
        state: sp.get('state') ?? '',
        scope: sp.get('scope') ?? 'holded:read holded:write',
        code_challenge: sp.get('code_challenge') ?? '',
        code_challenge_method: sp.get('code_challenge_method') ?? '',
      });

      try {
        const authorizeResponse = await fetch(parsedRedirect.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: `${SESSION_COOKIE_NAME}=${token}`,
            ...(request.headers.get('x-request-id')
              ? { 'x-request-id': request.headers.get('x-request-id') as string }
              : {}),
          },
          body: postBody.toString(),
          redirect: 'manual',
          cache: 'no-store',
        });

        const location = authorizeResponse.headers.get('location');
        if (location && /^https?:\/\//i.test(location)) {
          redirectUrl = location;
        } else {
          // No location → algo fue mal en /oauth/authorize. Logueamos
          // status + body (truncado) y caemos al fallback de éxito local
          // (success page) para que el usuario al menos vea confirmación.
          const bodyText = await authorizeResponse.text().catch(() => '');
          console.error('[holded-claude] /oauth/authorize POST returned no Location header', {
            status: authorizeResponse.status,
            bodyPreview: bodyText.slice(0, 300),
          });
          redirectUrl = `${APP_PUBLIC_URL}/auth/holded-claude/success`;
        }
      } catch (postErr) {
        console.error('[holded-claude] /oauth/authorize POST failed:', postErr);
        redirectUrl = `${APP_PUBLIC_URL}/auth/holded-claude/success`;
      }
    }
  } catch {
    // Relative path — no OAuth flags needed
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
