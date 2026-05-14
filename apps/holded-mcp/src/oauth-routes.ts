import { Request, Response, Router } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';
import { logger } from './logger.js';
import {
  consumeAuthorizationCode,
  createAuthorizationCode,
  createTokenPair,
  isValidPkceCodeChallenge,
  isValidPkceCodeVerifier,
  revokeToken,
  revokeTokenValue,
  rotateRefreshToken,
  verifyAccessToken,
  verifyPkceCodeVerifier,
} from './auth.js';

export const oauthRouter: Router = Router();

interface ClientRecord {
  clientId: string;
  redirectUris: string[];
}

interface AuthorizeContext {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string | null;
  codeChallengeMethod: 'S256' | null;
}

function codeSecret() {
  return new TextEncoder().encode(config.OAUTH_JWT_SECRET);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_OAUTH_SCOPES = new Set(['holded:read', 'holded:write']);
const DEFAULT_OAUTH_SCOPE = 'holded:read holded:write';

// ──────────────────────────────────────────────────────────────────────────
// T#50 Opción 2 — Bridge a Firebase auth de apps/holded
// ──────────────────────────────────────────────────────────────────────────
// El consent screen de Claude (HTML server-rendered) NO debe aceptar email
// libre: el usuario podría poner cualquier dirección y nos quedamos con un
// email no verificado asociado a una API key real de Holded. Para resolverlo,
// reutilizamos el flow Firebase ya existente en /auth/holded-direct (Vercel)
// que verifica email vía Google OAuth popup o magic link.
//
// Flow:
//   1. ChatGPT → GET /oauth/authorize?... (este server)
//   2. ¿Hay cookie `__session` válida firmada con SESSION_SECRET?
//      - NO → redirect 302 a holded.verifactu.business/auth/holded-direct
//             ?source=claude_consent&next=<this-authorize-url>
//      - SÍ → mostrar consent screen con email VERIFIED (read-only)
//   3. Tras Firebase auth, el wrapper /api/auth/holded-direct mintea la
//      cookie `__session` con domain `.verifactu.business` y redirige al
//      `next` que apunta de vuelta a este server.
//   4. En esta segunda visita, la cookie YA existe → consent screen "Authorize"
//      ya con email verificado.
const VERIFACTU_SESSION_COOKIE_NAME = '__session';

interface VerifactuSessionPayload {
  uid: string;
  email: string;
  name?: string | null;
  tenantId?: string;
}

function readVerifactuSessionCookieRaw(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== 'string' || !cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const c of cookies) {
    const eq = c.indexOf('=');
    if (eq < 0) continue;
    const name = c.slice(0, eq);
    if (name === VERIFACTU_SESSION_COOKIE_NAME) {
      try {
        return decodeURIComponent(c.slice(eq + 1));
      } catch {
        return c.slice(eq + 1);
      }
    }
  }
  return null;
}

async function verifyVerifactuSession(req: Request): Promise<VerifactuSessionPayload | null> {
  if (!config.SESSION_SECRET) return null;
  const token = readVerifactuSessionCookieRaw(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(config.SESSION_SECRET));
    const uid = typeof payload.uid === 'string' ? payload.uid : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!uid || !email) return null;
    return {
      uid,
      email,
      name: typeof payload.name === 'string' ? payload.name : null,
      tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
    };
  } catch {
    return null;
  }
}

function buildFirebaseBridgeUrl(req: Request): string {
  // Always redirect to the Claude-specific form (amber UI, Google + OTP).
  // claude.verifactu.business is a Claude-only MCP server — holded-direct
  // (ChatGPT red form) is never the right target here.
  const claudeUrl = new URL('/auth/holded-claude', config.HOLDED_PUBLIC_URL);
  claudeUrl.searchParams.set('source', 'holded_claude_entry');
  const currentUrl = new URL(req.originalUrl, config.BASE_URL);
  claudeUrl.searchParams.set('next', currentUrl.toString());
  return claudeUrl.toString();
}
const DEFAULT_ALLOWED_REDIRECT_ORIGINS = ['https://claude.ai', 'https://app.claude.ai'];

const F1_UPSERT_PATH = '/api/integrations/holded/upsert-from-key';

const F1_ERROR_MESSAGES: Record<string, string> = {
  invalid_personal_email: 'El email no tiene un formato valido.',
  missing_api_key: 'Tienes que pegar la API key de Holded.',
  legal_acceptance_required:
    'Debes aceptar los terminos y la politica de privacidad para conectar.',
  invalid_channel: 'No reconocemos el canal del flujo. Vuelve a empezar la conexion.',
  invalid_api_key:
    'La API key no es valida o no tiene los permisos necesarios. Comprueba que sea correcta y que tu plan de Holded este activo.',
  probe_failed: 'No hemos podido contactar con Holded. Intentalo de nuevo en unos segundos.',
  persist_failed:
    'Error interno guardando la conexion. Si persiste, escribenos a soporte@verifactu.business.',
  central_registry_unavailable:
    'No hemos podido registrar la conexion en Verifactu. Intentalo de nuevo en unos segundos para mantener el alta bajo control del panel de administracion.',
};

interface F1UpsertSuccessPayload {
  ok: true;
  userId: string;
  tenantId: string;
  connectionId: string;
  status: 'connected' | 'error';
  legalAcceptedAt: string;
}

interface F1UpsertFailurePayload {
  ok: false;
  stage?: string;
  reason?: string;
  detail?: string;
}

type F1UpsertResponse = F1UpsertSuccessPayload | F1UpsertFailurePayload;

function splitEnvList(value?: string | null) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAllowedRedirectOrigins() {
  const origins = new Set([
    ...DEFAULT_ALLOWED_REDIRECT_ORIGINS,
    ...splitEnvList(config.OAUTH_ALLOWED_REDIRECT_ORIGINS),
  ]);

  if (config.NODE_ENV !== 'production') {
    origins.add('http://localhost');
    origins.add('http://127.0.0.1');
  }

  return origins;
}

function isAllowedRedirectUri(redirectUri: string) {
  try {
    const parsed = new URL(redirectUri);
    const isLocalDev =
      config.NODE_ENV !== 'production' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (parsed.protocol !== 'https:' && !isLocalDev) return false;

    const origin = `${parsed.protocol}//${parsed.host}`;
    return getAllowedRedirectOrigins().has(origin);
  } catch {
    return false;
  }
}

function normalizeOAuthScope(scope?: string | null) {
  const requested = (scope?.trim() || DEFAULT_OAUTH_SCOPE)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [...new Set(requested)];
  if (unique.length === 0) return DEFAULT_OAUTH_SCOPE;
  if (!unique.every((item) => SUPPORTED_OAUTH_SCOPES.has(item))) return null;
  return unique.join(' ');
}

/**
 * Llama al endpoint comun F1 (`apps/app`) para crear o actualizar el grafo
 * User -> Tenant -> Membership -> ExternalConnection. Devuelve el resultado
 * tal cual (success o failure) o lanza si hay error de red.
 */
async function callUpsertFromKey(input: {
  personalEmail: string;
  holdedApiKey: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}): Promise<F1UpsertResponse> {
  const url = new URL(F1_UPSERT_PATH, config.VERIFACTU_APP_URL).toString();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.VERIFACTU_APP_SHARED_SECRET) {
    headers['x-verifactu-shared-secret'] = config.VERIFACTU_APP_SHARED_SECRET;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      personalEmail: input.personalEmail,
      holdedApiKey: input.holdedApiKey,
      channel: 'claude',
      source: 'claude_consent_screen',
      acceptedTerms: input.acceptedTerms,
      acceptedPrivacy: input.acceptedPrivacy,
    }),
    cache: 'no-store',
  });

  return (await response.json()) as F1UpsertResponse;
}

async function createDynamicClientSecret(
  clientId: string,
  redirectUris: string[]
): Promise<string> {
  return new SignJWT({
    cid: clientId,
    rus: redirectUris,
    type: 'client_secret',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .setIssuer(config.BASE_URL)
    .setAudience('holded-mcp-client')
    .sign(codeSecret());
}

async function verifyClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<ClientRecord | null> {
  if (clientId === config.OAUTH_CLIENT_ID && clientSecret === config.OAUTH_CLIENT_SECRET) {
    return { clientId, redirectUris: [] };
  }

  try {
    const { payload } = await jwtVerify(clientSecret, codeSecret(), {
      issuer: config.BASE_URL,
      audience: 'holded-mcp-client',
    });

    if (payload['type'] !== 'client_secret') return null;
    if (payload['cid'] !== clientId) return null;

    const redirectUris = Array.isArray(payload['rus'])
      ? payload['rus'].filter((value): value is string => typeof value === 'string')
      : [];

    return { clientId, redirectUris };
  } catch {
    return null;
  }
}

function resolveAuthorizeContext(req: Request): AuthorizeContext | null {
  const bodyClientId =
    typeof req.body?.client_id === 'string' && req.body.client_id.length > 0
      ? req.body.client_id
      : null;
  const bodyRedirectUri =
    typeof req.body?.redirect_uri === 'string' && req.body.redirect_uri.length > 0
      ? req.body.redirect_uri
      : null;
  const bodyState = typeof req.body?.state === 'string' ? req.body.state : '';
  const bodyScope =
    typeof req.body?.scope === 'string' && req.body.scope.trim() ? req.body.scope.trim() : null;
  const bodyCodeChallenge =
    typeof req.body?.code_challenge === 'string' && req.body.code_challenge.trim()
      ? req.body.code_challenge.trim()
      : null;
  const bodyCodeChallengeMethod =
    req.body?.code_challenge_method === 'S256' ? ('S256' as const) : null;

  const queryClientId =
    typeof req.query?.client_id === 'string' && req.query.client_id.length > 0
      ? req.query.client_id
      : null;
  const queryRedirectUri =
    typeof req.query?.redirect_uri === 'string' && req.query.redirect_uri.length > 0
      ? req.query.redirect_uri
      : null;
  const queryState = typeof req.query?.state === 'string' ? req.query.state : '';
  const queryScope =
    typeof req.query?.scope === 'string' && req.query.scope.trim() ? req.query.scope.trim() : null;
  const queryCodeChallenge =
    typeof req.query?.code_challenge === 'string' && req.query.code_challenge.trim()
      ? req.query.code_challenge.trim()
      : null;
  const queryCodeChallengeMethod =
    req.query?.code_challenge_method === 'S256' ? ('S256' as const) : null;

  if (bodyClientId && bodyRedirectUri) {
    return {
      clientId: bodyClientId,
      redirectUri: bodyRedirectUri,
      state: bodyState,
      scope: bodyScope || queryScope || DEFAULT_OAUTH_SCOPE,
      codeChallenge: bodyCodeChallenge || queryCodeChallenge,
      codeChallengeMethod: bodyCodeChallengeMethod || queryCodeChallengeMethod,
    };
  }

  if (queryClientId && queryRedirectUri) {
    return {
      clientId: queryClientId,
      redirectUri: queryRedirectUri,
      state: bodyState || queryState,
      scope: bodyScope || queryScope || DEFAULT_OAUTH_SCOPE,
      codeChallenge: bodyCodeChallenge || queryCodeChallenge,
      codeChallengeMethod: bodyCodeChallengeMethod || queryCodeChallengeMethod,
    };
  }

  const referer = req.get('referer');
  if (!referer) return null;

  try {
    const refererUrl = new URL(referer);
    const refererClientId = refererUrl.searchParams.get('client_id');
    const refererRedirectUri = refererUrl.searchParams.get('redirect_uri');
    const refererState = refererUrl.searchParams.get('state') ?? '';

    if (!refererClientId || !refererRedirectUri) {
      return null;
    }

    return {
      clientId: refererClientId,
      redirectUri: refererRedirectUri,
      state: bodyState || refererState,
      scope: bodyScope || refererUrl.searchParams.get('scope') || DEFAULT_OAUTH_SCOPE,
      codeChallenge: bodyCodeChallenge || refererUrl.searchParams.get('code_challenge'),
      codeChallengeMethod:
        bodyCodeChallengeMethod ||
        (refererUrl.searchParams.get('code_challenge_method') === 'S256' ? 'S256' : null),
    };
  } catch {
    return null;
  }
}

oauthRouter.post('/register', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const { redirect_uris, client_name } = req.body;

  const redirectUris = Array.isArray(redirect_uris)
    ? [
        ...new Set(
          redirect_uris
            .filter(
              (value): value is string => typeof value === 'string' && value.trim().length > 0
            )
            .map((value) => value.trim())
        ),
      ]
    : [];

  if (redirectUris.length === 0) {
    res.status(400).json({
      error: 'invalid_client_metadata',
      error_description: 'redirect_uris requerido',
    });
    return;
  }

  if (!redirectUris.every(isAllowedRedirectUri)) {
    res.status(400).json({
      error: 'invalid_redirect_uri',
      error_description: 'redirect_uri no autorizado',
      allowed_origins: [...getAllowedRedirectOrigins()],
    });
    return;
  }

  const clientId = `holded-mcp-${crypto.randomUUID()}`;
  const clientSecret = await createDynamicClientSecret(clientId, redirectUris);

  logger.info(`Cliente registrado: ${client_name ?? 'unknown'} (${clientId})`);

  res.status(201).json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
    logo_uri: `${config.BASE_URL}/holded-diamond-logo.png?v=holded-diamond-2026-05-12`,
  });
});

oauthRouter.get('/authorize', async (req: Request, res: Response) => {
  const {
    client_id,
    redirect_uri,
    state,
    response_type,
    scope,
    code_challenge,
    code_challenge_method,
  } = req.query;
  res.set('Cache-Control', 'no-store');

  if (response_type !== 'code') {
    res.status(400).send('response_type debe ser "code"');
    return;
  }

  if (!client_id || !redirect_uri) {
    res.status(400).send('client_id y redirect_uri son obligatorios.');
    return;
  }

  if (!isAllowedRedirectUri(String(redirect_uri))) {
    res.status(400).send('redirect_uri no autorizado.');
    return;
  }

  const normalizedScope = normalizeOAuthScope(typeof scope === 'string' ? scope : null);
  if (!normalizedScope) {
    res.status(400).send('scope no autorizado.');
    return;
  }

  if (code_challenge_method && code_challenge_method !== 'S256') {
    res.status(400).send('code_challenge_method debe ser "S256"');
    return;
  }

  if (
    typeof code_challenge === 'string' &&
    code_challenge &&
    !isValidPkceCodeChallenge(code_challenge)
  ) {
    res.status(400).send('code_challenge invalido');
    return;
  }

  // T#50 Opción 2: si no hay sesión .verifactu.business verificada por Firebase,
  // redirigir al flow /auth/holded-claude ANTES de mostrar el consent screen.
  // Si SESSION_SECRET no está seteado en env, fallback al consent screen plano
  // (modo legacy) para que el flow siga funcionando aunque el bridge no esté
  // activado.
  const verifactuSession = await verifyVerifactuSession(req);
  if (!verifactuSession && config.SESSION_SECRET) {
    const bridgeUrl = buildFirebaseBridgeUrl(req);
    logger.info('[oauth/authorize] No verifactu session — bridging to holded-claude auth', {
      clientId: String(client_id),
      next: bridgeUrl,
    });
    res.redirect(302, bridgeUrl);
    return;
  }

  // Auto-issue: if the session already has a tenantId (set by holded-claude
  // after connecting the Holded API key), look up the existing API key from
  // apps/app and mint the auth code directly — no consent form needed.
  if (verifactuSession?.tenantId && config.VERIFACTU_APP_SHARED_SECRET) {
    const authorizeContext = resolveAuthorizeContext(req);
    const ctxScope = authorizeContext ? normalizeOAuthScope(authorizeContext.scope) : null;
    if (authorizeContext && ctxScope) {
      try {
        const apiKeyResponse = await fetch(
          `${config.VERIFACTU_APP_URL}/api/integrations/holded/api-key?tenant_id=${encodeURIComponent(verifactuSession.tenantId)}`,
          {
            headers: { 'x-mcp-shared-secret': config.VERIFACTU_APP_SHARED_SECRET },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (apiKeyResponse.ok) {
          const apiKeyJson = (await apiKeyResponse.json()) as { apiKey?: string };
          if (typeof apiKeyJson.apiKey === 'string' && apiKeyJson.apiKey) {
            const code = await createAuthorizationCode({
              holdedApiKey: apiKeyJson.apiKey,
              clientId: authorizeContext.clientId,
              redirectUri: authorizeContext.redirectUri,
              scope: ctxScope,
              codeChallenge: authorizeContext.codeChallenge,
              codeChallengeMethod: authorizeContext.codeChallengeMethod,
              userId: verifactuSession.uid,
              tenantId: verifactuSession.tenantId,
              personalEmail: verifactuSession.email,
            });
            logger.info('[oauth/authorize] Auto-issued auth code from existing connection', {
              clientId: authorizeContext.clientId,
              tenantId: verifactuSession.tenantId,
            });
            const callbackUrl = new URL(authorizeContext.redirectUri);
            callbackUrl.searchParams.set('code', code);
            if (authorizeContext.state)
              callbackUrl.searchParams.set('state', authorizeContext.state);
            res.redirect(callbackUrl.toString());
            return;
          }
        }
        // 404 = no connection yet → fall through to consent form
      } catch (err) {
        logger.warn('[oauth/authorize] API key lookup failed, falling back to consent form', {
          message: err instanceof Error ? err.message : String(err),
          tenantId: verifactuSession.tenantId,
        });
      }
    }
  }

  res.send(
    consentPage(
      String(client_id),
      String(redirect_uri),
      String(state ?? ''),
      false,
      normalizedScope,
      typeof code_challenge === 'string' ? code_challenge : null,
      code_challenge_method === 'S256' ? 'S256' : null,
      verifactuSession
        ? {
            personalEmail: verifactuSession.email,
            personalName: verifactuSession.name ?? null,
            verifiedUid: verifactuSession.uid,
          }
        : null
    )
  );
});

oauthRouter.post('/authorize', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const holdedApiKey =
    typeof req.body?.holded_api_key === 'string' ? req.body.holded_api_key.trim() : '';

  // T#50 Opción 2: si hay sesión .verifactu.business verificada por Firebase,
  // ignoramos el `personal_email` del form (user-controllable) y usamos el
  // email firmado server-side. NUNCA confiamos en `verified_uid` del body —
  // siempre re-verificamos la cookie aquí.
  const verifactuSession = await verifyVerifactuSession(req);
  const bodyEmailRaw =
    typeof req.body?.personal_email === 'string'
      ? req.body.personal_email.trim().toLowerCase()
      : '';
  const personalEmailRaw = verifactuSession
    ? verifactuSession.email.trim().toLowerCase()
    : bodyEmailRaw;
  if (verifactuSession && bodyEmailRaw && bodyEmailRaw !== personalEmailRaw) {
    logger.warn(
      '[oauth/authorize] body.personal_email distinto de session.email — usamos session',
      {
        sessionEmail: personalEmailRaw,
        bodyEmail: bodyEmailRaw,
      }
    );
  }

  const acceptedTerms = req.body?.accepted_terms === '1' || req.body?.accepted_terms === 'on';
  const acceptedPrivacy = req.body?.accepted_privacy === '1' || req.body?.accepted_privacy === 'on';
  const authorizeContext = resolveAuthorizeContext(req);

  if (!authorizeContext) {
    logger.warn('POST /oauth/authorize sin contexto suficiente', {
      hasHoldedApiKey: holdedApiKey.length > 0,
      hasPersonalEmail: personalEmailRaw.length > 0,
      hasBodyClientId: typeof req.body?.client_id === 'string' && req.body.client_id.length > 0,
      hasBodyRedirectUri:
        typeof req.body?.redirect_uri === 'string' && req.body.redirect_uri.length > 0,
      hasQueryClientId: typeof req.query?.client_id === 'string' && req.query.client_id.length > 0,
      hasQueryRedirectUri:
        typeof req.query?.redirect_uri === 'string' && req.query.redirect_uri.length > 0,
      hasReferer: Boolean(req.get('referer')),
      contentType: req.get('content-type') ?? '',
    });
    res.status(400).json({ error: 'Faltan parametros' });
    return;
  }

  if (!isAllowedRedirectUri(authorizeContext.redirectUri)) {
    res.status(400).send('redirect_uri no autorizado.');
    return;
  }

  const normalizedScope = normalizeOAuthScope(authorizeContext.scope);
  if (!normalizedScope) {
    res.status(400).send('scope no autorizado.');
    return;
  }
  authorizeContext.scope = normalizedScope;

  if (!holdedApiKey || !personalEmailRaw) {
    logger.warn('POST /oauth/authorize sin credenciales suficientes', {
      hasHoldedApiKey: holdedApiKey.length > 0,
      hasPersonalEmail: personalEmailRaw.length > 0,
      hasBodyClientId: typeof req.body?.client_id === 'string' && req.body.client_id.length > 0,
      hasBodyRedirectUri:
        typeof req.body?.redirect_uri === 'string' && req.body.redirect_uri.length > 0,
      contentType: req.get('content-type') ?? '',
    });
    res
      .status(400)
      .send(
        consentPage(
          authorizeContext.clientId,
          authorizeContext.redirectUri,
          authorizeContext.state,
          'Faltan datos: rellena email y API key.',
          authorizeContext.scope,
          authorizeContext.codeChallenge,
          authorizeContext.codeChallengeMethod,
          { personalEmail: personalEmailRaw, acceptedTerms, acceptedPrivacy }
        )
      );
    return;
  }

  if (!EMAIL_REGEX.test(personalEmailRaw)) {
    res
      .status(400)
      .send(
        consentPage(
          authorizeContext.clientId,
          authorizeContext.redirectUri,
          authorizeContext.state,
          F1_ERROR_MESSAGES.invalid_personal_email,
          authorizeContext.scope,
          authorizeContext.codeChallenge,
          authorizeContext.codeChallengeMethod,
          { personalEmail: personalEmailRaw, acceptedTerms, acceptedPrivacy }
        )
      );
    return;
  }

  if (!acceptedTerms || !acceptedPrivacy) {
    res
      .status(400)
      .send(
        consentPage(
          authorizeContext.clientId,
          authorizeContext.redirectUri,
          authorizeContext.state,
          F1_ERROR_MESSAGES.legal_acceptance_required,
          authorizeContext.scope,
          authorizeContext.codeChallenge,
          authorizeContext.codeChallengeMethod,
          { personalEmail: personalEmailRaw, acceptedTerms, acceptedPrivacy }
        )
      );
    return;
  }

  // Single source of truth: delegamos el upsert User+Tenant+Connection en F1.
  // Si F1 no responde, no emitimos un authorization code local. El conector
  // solo puede quedar activo si existe antes el grafo central User -> Tenant ->
  // ExternalConnection visible en admin.
  let upsertResult: F1UpsertResponse;
  try {
    upsertResult = await callUpsertFromKey({
      personalEmail: personalEmailRaw,
      holdedApiKey,
      acceptedTerms,
      acceptedPrivacy,
    });
  } catch (err) {
    logger.error('F1 upsert network failure, refusing local-only OAuth code', {
      message: err instanceof Error ? err.message : String(err),
    });
    res
      .status(503)
      .send(
        consentPage(
          authorizeContext.clientId,
          authorizeContext.redirectUri,
          authorizeContext.state,
          F1_ERROR_MESSAGES.central_registry_unavailable,
          authorizeContext.scope,
          authorizeContext.codeChallenge,
          authorizeContext.codeChallengeMethod,
          { personalEmail: personalEmailRaw, acceptedTerms, acceptedPrivacy }
        )
      );
    return;
  }

  if (!upsertResult.ok) {
    const reason = upsertResult.reason ?? 'persist_failed';
    const message = F1_ERROR_MESSAGES[reason] ?? F1_ERROR_MESSAGES.persist_failed;
    res
      .status(reason === 'invalid_api_key' ? 400 : 500)
      .send(
        consentPage(
          authorizeContext.clientId,
          authorizeContext.redirectUri,
          authorizeContext.state,
          message,
          authorizeContext.scope,
          authorizeContext.codeChallenge,
          authorizeContext.codeChallengeMethod,
          { personalEmail: personalEmailRaw, acceptedTerms, acceptedPrivacy }
        )
      );
    return;
  }

  const code = await createAuthorizationCode({
    holdedApiKey,
    clientId: authorizeContext.clientId,
    redirectUri: authorizeContext.redirectUri,
    scope: authorizeContext.scope,
    codeChallenge: authorizeContext.codeChallenge,
    codeChallengeMethod: authorizeContext.codeChallengeMethod,
    userId: upsertResult.userId,
    tenantId: upsertResult.tenantId,
    personalEmail: personalEmailRaw,
  });
  logger.info(`Authorization code generado para ${authorizeContext.clientId} (userId=real)`);

  const callbackUrl = new URL(authorizeContext.redirectUri);
  callbackUrl.searchParams.set('code', code);
  if (authorizeContext.state) {
    callbackUrl.searchParams.set('state', authorizeContext.state);
  }

  res.redirect(callbackUrl.toString());
});

oauthRouter.post('/token', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

  const clientId = String(client_id ?? '');
  const clientSecret = String(client_secret ?? '');
  const clientRecord = await verifyClientCredentials(clientId, clientSecret);

  if (!clientRecord) {
    res.status(401).json({
      error: 'invalid_client',
      error_description: 'Cliente OAuth invalido',
    });
    return;
  }

  if (grant_type === 'authorization_code') {
    const authCodePayload = await consumeAuthorizationCode(String(code ?? ''));
    if (!authCodePayload) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Codigo expirado o invalido',
      });
      return;
    }

    if (authCodePayload.clientId !== clientRecord.clientId) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'El codigo no pertenece a este cliente OAuth',
      });
      return;
    }

    if (!isAllowedRedirectUri(authCodePayload.redirectUri)) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri no autorizado',
      });
      return;
    }

    if (
      clientRecord.redirectUris.length > 0 &&
      !clientRecord.redirectUris.includes(authCodePayload.redirectUri)
    ) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri no autorizado para este cliente',
      });
      return;
    }

    // RFC 6749 §4.1.3: redirect_uri is REQUIRED in the token request when it
    // was present in the authorization request (which it always is here).
    // Accepting a token request without redirect_uri would let an attacker
    // redeem a stolen auth code without knowing the registered redirect URI.
    if (!redirect_uri || authCodePayload.redirectUri !== String(redirect_uri)) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri no coincide con el codigo de autorizacion',
      });
      return;
    }

    if (authCodePayload.codeChallenge) {
      const codeVerifier =
        typeof req.body?.code_verifier === 'string' ? req.body.code_verifier.trim() : '';

      if (!codeVerifier || !isValidPkceCodeVerifier(codeVerifier)) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'Falta code_verifier valido',
        });
        return;
      }

      if (
        authCodePayload.codeChallengeMethod !== 'S256' ||
        !verifyPkceCodeVerifier(codeVerifier, authCodePayload.codeChallenge)
      ) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'PKCE invalido',
        });
        return;
      }
    }

    const tokenPair = await createTokenPair({
      holdedApiKey: authCodePayload.holdedApiKey,
      clientId: clientRecord.clientId,
      scope: authCodePayload.scope,
      // F3.2: propagamos el userId real (si vino del consent screen post-F1)
      // al token pair para que la BD del MCP refleje el User.id de Verifactu
      // en lugar del sha256(apiKey) legacy.
      userId: authCodePayload.userId ?? null,
    });

    res.json({
      access_token: tokenPair.accessToken,
      token_type: 'Bearer',
      expires_in: tokenPair.expiresIn,
      refresh_token: tokenPair.refreshToken,
      scope: tokenPair.scope,
    });
    return;
  }

  if (grant_type === 'refresh_token') {
    const refreshToken =
      typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : '';
    if (!refreshToken) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Falta refresh_token' });
      return;
    }

    const rotatedPair = await rotateRefreshToken(refreshToken, clientRecord.clientId);
    if (!rotatedPair) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Refresh token expirado o invalido',
      });
      return;
    }

    res.json({
      access_token: rotatedPair.accessToken,
      token_type: 'Bearer',
      expires_in: rotatedPair.expiresIn,
      refresh_token: rotatedPair.refreshToken,
      scope: rotatedPair.scope,
    });
    return;
  }

  res.status(400).json({ error: 'unsupported_grant_type' });
});

oauthRouter.post('/revoke', async (req: Request, res: Response) => {
  const requestedToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (requestedToken) {
    await revokeTokenValue(requestedToken);
    res.status(200).send();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(200).send();
    return;
  }

  const token = authHeader.slice(7);
  const record = await verifyAccessToken(token);
  if (record) {
    await revokeToken(record);
  }

  res.status(200).send();
});

type ConsentPagePrefill = {
  personalEmail?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  // T#50 Opción 2: si está rellenado, el email viene verificado por Firebase
  // (Google OAuth o magic link). El consent screen lo renderiza como read-only
  // con badge "✓ Verificado".
  personalName?: string | null;
  verifiedUid?: string;
};

function consentPage(
  clientId: string,
  redirectUri: string,
  state: string,
  error: false | string = false,
  scope = DEFAULT_OAUTH_SCOPE,
  codeChallenge: string | null = null,
  codeChallengeMethod: 'S256' | null = null,
  prefillInput: ConsentPagePrefill | null = {}
): string {
  const prefill: ConsentPagePrefill = prefillInput ?? {};
  // Use a relative path for the form action so that the browser's
  // `form-action 'self'` CSP directive always matches (relative URLs
  // resolve to the document origin, making them unconditionally 'self').
  // An absolute URL with the same origin should also match, but Chrome has
  // been observed blocking it when query params contain cross-origin values
  // (e.g. redirect_uri=https://claude.ai/...).
  const actionParams = new URLSearchParams();
  actionParams.set('client_id', clientId);
  actionParams.set('redirect_uri', redirectUri);
  if (state) actionParams.set('state', state);
  actionParams.set('scope', scope);
  if (codeChallenge) actionParams.set('code_challenge', codeChallenge);
  if (codeChallengeMethod) actionParams.set('code_challenge_method', codeChallengeMethod);
  const escapedActionUrl = escapeHtml(`/oauth/authorize?${actionParams.toString()}`);
  const escapedClientId = escapeHtml(clientId);
  const escapedRedirectUri = escapeHtml(redirectUri);
  const escapedState = escapeHtml(state);
  const escapedScope = escapeHtml(scope);
  const escapedCodeChallenge = escapeHtml(codeChallenge ?? '');
  const escapedCodeChallengeMethod = escapeHtml(codeChallengeMethod ?? '');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conectar Holded con Claude</title>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/holded-diamond-logo.png">
  <link rel="mask-icon" href="/logo.svg" color="#ff5454">
  <meta property="og:image" content="/holded-diamond-logo.png">
  <meta name="twitter:image" content="/holded-diamond-logo.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: radial-gradient(circle at top left, #fff5f2 0%, #f8fafc 44%, #f8fafc 100%); color: #0f172a; min-height: 100vh; padding: 32px 16px; }
    .wrap { max-width: 460px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 32px; padding: 36px 32px 28px; box-shadow: 0 30px 90px -56px rgba(15,23,42,0.35); }
    .badge-row { display: flex; justify-content: center; margin-bottom: 24px; }
    .badge { display: inline-flex; align-items: center; gap: 12px; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 16px; background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .badge-icon { width: 36px; height: 36px; border-radius: 50%; background: #fff1f2; display: flex; align-items: center; justify-content: center; }
    .badge-icon img { width: 20px; height: 20px; object-fit: contain; }
    .badge-text { text-align: left; }
    .badge-title { font-size: 14px; font-weight: 600; color: #0f172a; }
    .badge-sub { font-size: 12px; color: #64748b; }
    h1 { font-size: 28px; font-weight: 600; text-align: center; letter-spacing: -0.025em; color: #0f172a; margin: 12px 0 8px; }
    h1 .star { display: inline-block; margin-right: 6px; }
    .lead { text-align: center; font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px; }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 16px; border-radius: 16px; font-size: 13px; line-height: 1.5; margin-bottom: 18px; }
    .field { margin-bottom: 16px; }
    .label-row { display: flex; align-items: baseline; justify-content: space-between; padding: 0 4px; margin-bottom: 6px; }
    .label { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    .help { font-size: 12px; font-weight: 500; color: #ff5460; text-decoration: none; }
    .help:hover { text-decoration: underline; }
    input[type="email"], input[type="password"], input[type="text"] { width: 100%; height: 56px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 0 20px; font-size: 16px; background: #ffffff; color: #0f172a; transition: box-shadow 120ms, border-color 120ms; }
    input[type="email"]:focus, input[type="password"]:focus, input[type="text"]:focus { outline: none; border-color: #ff5460; box-shadow: 0 0 0 3px rgba(255,84,96,0.15); }
    input::placeholder { color: #94a3b8; }
    .terms-row { display: flex; align-items: flex-start; gap: 10px; padding: 0 4px; margin-bottom: 16px; cursor: pointer; }
    .terms-row input[type="checkbox"] { width: 16px; height: 16px; margin-top: 2px; accent-color: #ff5460; flex: 0 0 auto; }
    .terms-row span { font-size: 12px; line-height: 1.5; color: #64748b; }
    .terms-row a { font-weight: 500; color: #1f2937; text-decoration: underline; text-underline-offset: 2px; }
    .submit { width: 100%; height: 48px; background: #ff5460; color: #ffffff; border: none; border-radius: 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 120ms; margin-bottom: 16px; }
    .submit:hover { background: #ef4654; }
    .safety { display: flex; align-items: flex-start; gap: 8px; padding: 0 4px; font-size: 12px; line-height: 1.5; color: #64748b; margin-bottom: 18px; }
    .safety .check { color: #059669; flex-shrink: 0; margin-top: 1px; }
    .scopes { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 16px; padding: 14px 18px; margin-bottom: 16px; }
    .scopes-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 8px; }
    .scope { font-size: 13px; color: #334155; padding: 3px 0; line-height: 1.5; }
    .scope::before { content: '✓ '; color: #059669; font-weight: 700; }
    .trust { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 11px; color: #94a3b8; margin-bottom: 16px; }
    .trust a { color: inherit; }
    .trust a:hover { color: #475569; text-decoration: underline; }
    .footer { padding-top: 18px; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer-text { font-size: 12px; color: #64748b; }
    .footer-text a { color: #1f2937; font-weight: 500; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="badge-row">
        <div class="badge">
          <div class="badge-icon"><img src="/holded-diamond-logo.png" alt="Holded"></div>
          <div class="badge-text">
            <div class="badge-title">holded</div>
            <div class="badge-sub">Conexion Holded para Claude</div>
          </div>
        </div>
      </div>

      <h1><span class="star" aria-hidden="true">✦</span>Conecta Holded con Claude</h1>
      <p class="lead">Introduce tu email y la API key de Holded. Claude podra consultar tus datos y crear borradores con tu confirmacion explicita.</p>

      ${
        error
          ? `<div class="error">${typeof error === 'string' ? escapeHtml(error) : 'API key invalida o sin permisos. Comprueba que es correcta y que tu plan de Holded esta activo.'}</div>`
          : ''
      }

      <div class="scopes">
        <div class="scopes-title">Permisos solicitados</div>
        <div class="scope">Leer facturas, presupuestos y documentos</div>
        <div class="scope">Leer y buscar contactos y clientes</div>
        <div class="scope">Leer productos e inventario</div>
        <div class="scope">Leer proyectos y tareas</div>
        <div class="scope">Leer contabilidad y diario</div>
        <div class="scope">Crear borradores de factura (con tu confirmacion)</div>
      </div>

      <form method="POST" action="${escapedActionUrl}">
        <input type="hidden" name="client_id" value="${escapedClientId}">
        <input type="hidden" name="redirect_uri" value="${escapedRedirectUri}">
        <input type="hidden" name="state" value="${escapedState}">
        <input type="hidden" name="scope" value="${escapedScope}">
        <input type="hidden" name="code_challenge" value="${escapedCodeChallenge}">
        <input type="hidden" name="code_challenge_method" value="${escapedCodeChallengeMethod}">

        <div class="field">
          <div class="label-row">
            <label class="label" for="personal_email">Tu email</label>
          </div>
          <input type="email" id="personal_email" name="personal_email" placeholder="tu@empresa.com" required autocomplete="email" inputmode="email" value="${escapeHtml(prefill.personalEmail ?? '')}">
        </div>

        <div class="field">
          <div class="label-row">
            <label class="label" for="holded_api_key">API key de Holded</label>
            <a class="help" href="https://help.holded.com/en/articles/6896051" target="_blank" rel="noopener">&iquest;Donde la encuentro?</a>
          </div>
          <input type="password" id="holded-secret-token-input" name="holded_api_key" placeholder="32 caracteres hexadecimales (0-9, a-f)" required autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-form-type="other">
        </div>

        <label class="terms-row">
          <input type="checkbox" name="accepted_terms" value="1"${prefill.acceptedTerms ? ' checked' : ''} required>
          <span>Acepto los <a href="https://holded.verifactu.business/conectores/claude/terms" target="_blank" rel="noopener">terminos de uso</a> y la <a href="https://holded.verifactu.business/conectores/claude/privacy" target="_blank" rel="noopener">politica de privacidad</a>.</span>
        </label>
        <input type="hidden" name="accepted_privacy" value="1">

        <button type="submit" class="submit">Conectar Holded a Claude</button>

        <div class="safety">
          <span class="check" aria-hidden="true">🛡</span>
          <span>Tu API key se cifra con AES-256 y se queda en tu tenant. <strong>Nunca</strong> viaja por modelos de IA, ni se usa para entrenar.</span>
        </div>
      </form>

      <div class="trust">
        <span>✓ RGPD</span>
        <span>·</span>
        <a href="https://holded.verifactu.business/conectores/claude/dpa" target="_blank" rel="noopener">DPA</a>
        <span>·</span>
        <span>Sin venta de datos</span>
      </div>

      <div class="footer">
        <p class="footer-text">
          Si necesitas ayuda, escribenos a <a href="mailto:soporte@verifactu.business">soporte@verifactu.business</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
