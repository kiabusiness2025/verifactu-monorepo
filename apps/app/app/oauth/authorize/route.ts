import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import {
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import {
  getHoldedOnboardingTokenFromSearchParams,
  resolveHoldedOnboardingSession,
} from '@/lib/integrations/holdedOnboardingSession';
import { getHoldedMcpScopePreset } from '@/lib/integrations/holdedMcpScopes';
import {
  buildLoginUrl,
  ensureScopesAllowed,
  getDefaultScopes,
  getMcpResourceUrl,
  getPublicScopePreset,
  isValidPkceCodeChallenge,
  mapSessionToOAuthUser,
  mintAuthorizationCode,
  mintHoldedOnboardingToken,
  resolveTenantForHoldedFirstSession,
  validateRedirectUri,
} from '@/lib/oauth/mcp';
import { getSessionPayload } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function resolveCanonicalHoldedSiteUrl() {
  const defaultUrl = 'https://holded.verifactu.business';
  const raw =
    process.env.HOLDED_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() ||
    defaultUrl;

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === 'app.verifactu.business') {
      return defaultUrl;
    }
    return parsed.origin;
  } catch {
    return defaultUrl;
  }
}

function buildCanonicalHoldedOnboardingUrl(input: {
  next: string;
  onboardingToken?: string | null;
  tenantId?: string | null;
}) {
  const holdedSiteUrl = resolveCanonicalHoldedSiteUrl();
  const onboardingUrl = new URL('/onboarding/holded', holdedSiteUrl);
  onboardingUrl.searchParams.set('source', 'holded_chatgpt_entry');
  onboardingUrl.searchParams.set('channel', 'chatgpt');
  onboardingUrl.searchParams.set('next', input.next);

  const onboardingToken = input.onboardingToken?.trim();
  if (onboardingToken) {
    onboardingUrl.searchParams.set('onboarding_token', onboardingToken);
  }

  const tenantId = input.tenantId?.trim();
  if (tenantId) {
    onboardingUrl.searchParams.set('tenant_id', tenantId);
  }

  return onboardingUrl;
}

// Redirige a la nueva pantalla unificada de conexión Holded (F2.2):
// auth (Google/magic link) + API key en un único formulario, sin el
// wizard multi-step de onboarding. Usado cuando el tenant ya existe pero
// no tiene conexión Holded activa, o cuando el provider fingerprint cambió.
function buildCanonicalHoldedDirectUrl(input: { next: string; tenantId?: string | null }) {
  const holdedSiteUrl = resolveCanonicalHoldedSiteUrl();
  const directUrl = new URL('/auth/holded-direct', holdedSiteUrl);
  directUrl.searchParams.set('source', 'holded_chatgpt_entry');
  directUrl.searchParams.set('next', input.next);

  const tenantId = input.tenantId?.trim();
  if (tenantId) {
    directUrl.searchParams.set('tenant_id', tenantId);
  }

  return directUrl;
}

function buildCanonicalPublicAuthorizeUrl(url: URL) {
  const holdedSiteUrl = resolveCanonicalHoldedSiteUrl();
  const publicAuthorizeUrl = new URL('/oauth/authorize', holdedSiteUrl);
  url.searchParams.forEach((value, key) => {
    publicAuthorizeUrl.searchParams.set(key, value);
  });
  publicAuthorizeUrl.searchParams.set('dbg', Date.now().toString(36));
  return publicAuthorizeUrl.toString();
}

function redirectWithError(redirectUri: string, error: string, state?: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (state) url.searchParams.set('state', state);
  return NextResponse.redirect(url);
}

function isLikelyClaudeOAuthRequest(input: { clientId: string; redirectUri: string }) {
  const normalizedClientId = input.clientId.trim().toLowerCase();
  if (
    normalizedClientId.startsWith('claude-') ||
    normalizedClientId.startsWith('anthropic-') ||
    normalizedClientId.includes('claude')
  ) {
    return true;
  }

  try {
    const parsedRedirect = new URL(input.redirectUri);
    const host = parsedRedirect.hostname.toLowerCase();
    if (host.includes('claude.ai') || host.includes('anthropic.com')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function buildCanonicalHoldedClaudeUrl(input: { next: string; tenantId?: string | null }) {
  const holdedSiteUrl = resolveCanonicalHoldedSiteUrl();
  const claudeUrl = new URL('/auth/holded-claude', holdedSiteUrl);
  claudeUrl.searchParams.set('source', 'holded_claude_entry');
  claudeUrl.searchParams.set('next', input.next);

  const tenantId = input.tenantId?.trim();
  if (tenantId) {
    claudeUrl.searchParams.set('tenant_id', tenantId);
  }

  return claudeUrl;
}

function isLikelyChatgptOAuthRequest(input: { clientId: string; redirectUri: string }) {
  const normalizedClientId = input.clientId.trim().toLowerCase();
  if (
    normalizedClientId.startsWith('openai-chatgpt-') ||
    normalizedClientId.startsWith('openai-') ||
    normalizedClientId.includes('chatgpt')
  ) {
    return true;
  }

  try {
    const parsedRedirect = new URL(input.redirectUri);
    const host = parsedRedirect.hostname.toLowerCase();
    const path = parsedRedirect.pathname.toLowerCase();

    if (host.includes('chat.openai.com') || host.includes('chatgpt.com')) {
      return true;
    }

    if (path.includes('/aip/oauth/callback') || path.includes('/oauth/callback')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function isValidOAuthClientId(clientId: string) {
  const normalized = clientId.trim();
  if (!normalized) return false;
  if (normalized.includes('://')) return false;
  return /^[A-Za-z0-9._~-]{3,200}$/.test(normalized);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const requestId = getConnectorRequestId(request);
  const responseType = url.searchParams.get('response_type');
  const clientId = url.searchParams.get('client_id')?.trim() || '';
  const redirectUri = url.searchParams.get('redirect_uri')?.trim() || '';
  const state = url.searchParams.get('state');
  const codeChallengeRaw = url.searchParams.get('code_challenge')?.trim() || '';
  const codeChallengeMethodRaw = url.searchParams.get('code_challenge_method')?.trim() || '';
  const requestedScope = url.searchParams.get('scope');
  // B1 hardening (auditoría 2026-05-11): el authorization code se mintará SIEMPRE
  // con scopes clampados al preset público (MCP_PUBLIC_SCOPE_PRESET, cuyo default
  // efectivo es `claude_parity` desde 2026-05-18). Si un cliente OAuth solicita
  // scopes adicionales — sea por error o por intentar ampliar superficie — los
  // ignoramos en silencio en lugar de devolver invalid_scope, para que la
  // integración no se rompa pero la lista de tools quede limitada a la submission
  // firmada con OpenAI.
  const publicPresetScopeSet = new Set<string>(getHoldedMcpScopePreset(getPublicScopePreset()));
  const requestedScopeList = (requestedScope?.trim() ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const clampedScopeList =
    requestedScopeList.length > 0
      ? requestedScopeList.filter((s) => publicPresetScopeSet.has(s))
      : getDefaultScopes();
  // Si la intersección está vacía (cliente pidió solo scopes fuera del preset),
  // caemos a los defaults en lugar de mintar un token sin scope.
  const normalizedScope =
    clampedScopeList.length > 0 ? clampedScopeList.join(' ') : getDefaultScopes().join(' ');
  const resource = url.searchParams.get('resource')?.trim() || getMcpResourceUrl();
  const tenantIdQuery = url.searchParams.get('tenant_id')?.trim() || null;
  const loginConfirmed = url.searchParams.get('holded_login_confirmed')?.trim() === '1';
  // B4 hardening (auditoría 2026-05-11): el flujo OAuth público requiere un
  // consent screen explícito antes de mintar el authorization code. La página
  // /oauth/consent muestra los scopes solicitados en lenguaje humano, los links
  // legales (T&C / Privacy / DPA) y los botones Authorize / Cancel. Al pulsar
  // Authorize, redirige de vuelta a /oauth/authorize con consent_confirmed=1.
  const consentConfirmed = url.searchParams.get('consent_confirmed')?.trim() === '1';
  const isClaudeClient = isLikelyClaudeOAuthRequest({ clientId, redirectUri });
  const isChatgptClient = !isClaudeClient && isLikelyChatgptOAuthRequest({ clientId, redirectUri });

  try {
    if (responseType !== 'code') {
      return withConnectorRequestId(
        NextResponse.json({ error: 'unsupported_response_type', requestId }, { status: 400 }),
        requestId
      );
    }
    if (!clientId || !redirectUri) {
      return withConnectorRequestId(
        NextResponse.json({ error: 'invalid_request', requestId }, { status: 400 }),
        requestId
      );
    }
    if (!isValidOAuthClientId(clientId)) {
      return withConnectorRequestId(
        redirectWithError(redirectUri, 'invalid_client', state),
        requestId
      );
    }
    if (!validateRedirectUri(redirectUri)) {
      return withConnectorRequestId(
        NextResponse.json({ error: 'invalid_redirect_uri', requestId }, { status: 400 }),
        requestId
      );
    }
    if (
      !codeChallengeRaw ||
      !codeChallengeMethodRaw ||
      codeChallengeMethodRaw !== 'S256' ||
      !isValidPkceCodeChallenge(codeChallengeRaw)
    ) {
      return withConnectorRequestId(
        redirectWithError(redirectUri, 'invalid_request', state),
        requestId
      );
    }
    if (!ensureScopesAllowed(normalizedScope)) {
      return withConnectorRequestId(
        redirectWithError(redirectUri, 'invalid_scope', state),
        requestId
      );
    }

    if (isChatgptClient && !loginConfirmed) {
      const authorizeAfterLoginUrl = new URL(url.toString());
      authorizeAfterLoginUrl.searchParams.set('holded_login_confirmed', '1');

      return withConnectorRequestId(
        NextResponse.redirect(
          buildLoginUrl(
            buildCanonicalPublicAuthorizeUrl(authorizeAfterLoginUrl),
            'holded_chat_requires_session'
          )
        ),
        requestId
      );
    }

    const session = await getSessionPayload();
    const onboardingToken = getHoldedOnboardingTokenFromSearchParams(url.searchParams);
    const onboardingSession = onboardingToken
      ? await resolveHoldedOnboardingSession(onboardingToken)
      : null;
    const tenantIdHint = tenantIdQuery ?? onboardingSession?.tenantId ?? null;
    if (!session?.uid && !onboardingSession?.uid) {
      const mintedOnboardingToken = await mintHoldedOnboardingToken({
        seed: [clientId, redirectUri, state ?? '', codeChallengeRaw, Date.now().toString()].join(
          '|'
        ),
        tenantId: tenantIdQuery,
      });
      const authorizeUrl = new URL(url.toString());
      authorizeUrl.searchParams.set('onboarding_token', mintedOnboardingToken);

      const onboardingUrl = buildCanonicalHoldedOnboardingUrl({
        next: buildCanonicalPublicAuthorizeUrl(authorizeUrl),
        onboardingToken: mintedOnboardingToken,
        tenantId: tenantIdQuery,
      });

      return withConnectorRequestId(
        NextResponse.redirect(
          buildLoginUrl(onboardingUrl.toString(), 'holded_chat_requires_session')
        ),
        requestId
      );
    }

    const prefersOnboardingSubject = Boolean(onboardingSession?.uid);
    const subject = {
      uid: prefersOnboardingSubject
        ? (onboardingSession?.uid ?? null)
        : (session?.uid ?? onboardingSession?.uid ?? null),
      email: prefersOnboardingSubject
        ? (onboardingSession?.email ?? session?.email ?? null)
        : (session?.email ?? onboardingSession?.email ?? null),
      name: prefersOnboardingSubject
        ? (onboardingSession?.name ?? session?.name ?? null)
        : (session?.name ?? onboardingSession?.name ?? null),
      sessionTenantId: prefersOnboardingSubject
        ? (onboardingSession?.tenantId ?? session?.tenantId ?? null)
        : (session?.tenantId ?? onboardingSession?.tenantId ?? null),
    };

    if (!subject?.uid) {
      return withConnectorRequestId(
        NextResponse.redirect(buildLoginUrl(url.toString())),
        requestId
      );
    }

    let resolved: { tenantId: string | null; resolvedUserId: string | null } = {
      tenantId: subject.sessionTenantId ?? null,
      resolvedUserId: null,
    };

    try {
      resolved = await resolveTenantForHoldedFirstSession({
        uid: subject.uid,
        email: subject.email,
        name: subject.name,
        sessionTenantId: subject.sessionTenantId,
        tenantIdHint,
      });
    } catch (error) {
      logConnectorEvent('oauth/authorize', 'error', {
        requestId,
        clientId,
        sessionUid: subject.uid,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (onboardingSession?.tenantBound === true && onboardingSession.tenantId) {
      resolved = {
        tenantId: onboardingSession.tenantId,
        resolvedUserId: resolved.resolvedUserId,
      };
    }

    if (resolved.tenantId && resolved.resolvedUserId) {
      try {
        await upsertChannelIdentity({
          userId: resolved.resolvedUserId,
          tenantId: resolved.tenantId,
          channelType: isClaudeClient ? 'claude' : 'chatgpt',
          channelSubjectId: clientId + ':' + subject.uid,
          email: subject.email,
          displayName: subject.name,
          metadata: {
            clientId,
            guest:
              !session?.uid || (!!onboardingSession?.uid && onboardingSession.uid === subject.uid),
          },
        });
      } catch (error) {
        logConnectorEvent('oauth/authorize', 'error', {
          requestId,
          clientId,
          tenantId: resolved.tenantId,
          resolvedUserId: resolved.resolvedUserId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    let hasHoldedConnection = false;
    if (resolved.tenantId) {
      try {
        hasHoldedConnection = await hasSharedHoldedConnectionForTenant(
          resolved.tenantId,
          'chatgpt'
        );
      } catch (error) {
        logConnectorEvent('oauth/authorize', 'error', {
          requestId,
          tenantId: resolved.tenantId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // hasProviderMismatch was removed: upsertAccountingIntegration never sets
    // provider_account_id (stays NULL), so the check always evaluated to true
    // and caused an infinite redirect loop back to holded-direct even after a
    // successful connection. hasHoldedConnection (api_key_enc != NULL) is the
    // authoritative signal.
    if (resolved.tenantId && !hasHoldedConnection) {
      const authorizeUrl = new URL(url.toString());
      authorizeUrl.searchParams.delete('connection_confirmed');
      authorizeUrl.searchParams.delete('connected_provider_account_id');
      const redirectTenantId = tenantIdQuery ?? onboardingSession?.tenantId ?? resolved.tenantId;
      if (redirectTenantId) {
        authorizeUrl.searchParams.set('tenant_id', redirectTenantId);
      }

      const connectionFormUrl = isClaudeClient
        ? buildCanonicalHoldedClaudeUrl({
            next: buildCanonicalPublicAuthorizeUrl(authorizeUrl),
            tenantId: redirectTenantId,
          })
        : buildCanonicalHoldedDirectUrl({
            next: buildCanonicalPublicAuthorizeUrl(authorizeUrl),
            tenantId: redirectTenantId,
          });

      return withConnectorRequestId(NextResponse.redirect(connectionFormUrl), requestId);
    }

    const user = mapSessionToOAuthUser({
      uid: subject.uid,
      email: subject.email,
      name: subject.name,
      tenantId: resolved.tenantId,
    });

    if (!user) {
      return withConnectorRequestId(
        NextResponse.json({ error: 'no_tenant_selected', requestId }, { status: 400 }),
        requestId
      );
    }

    // B4 hardening: si el usuario aún no ha confirmado consent, redirigimos a
    // /oauth/consent con todos los parámetros necesarios. Esa página muestra el
    // scope solicitado en lenguaje humano, los links legales y los botones
    // Authorize/Cancel. Al autorizar redirige a /oauth/authorize con
    // consent_confirmed=1 manteniendo el resto de params.
    //
    // El consent screen se sirve bajo el dominio canónico público
    // (holded.verifactu.business) mediante un proxy ligero en apps/holded
    // para que el usuario no vea un cambio de dominio durante la auth flow.
    if (!consentConfirmed) {
      const holdedSiteUrl = resolveCanonicalHoldedSiteUrl();
      const consentUrl = new URL('/oauth/consent', holdedSiteUrl);
      consentUrl.searchParams.set('client_id', clientId);
      consentUrl.searchParams.set('redirect_uri', redirectUri);
      consentUrl.searchParams.set('scope', normalizedScope);
      if (state) consentUrl.searchParams.set('state', state);
      consentUrl.searchParams.set('code_challenge', codeChallengeRaw);
      consentUrl.searchParams.set('code_challenge_method', codeChallengeMethodRaw);
      consentUrl.searchParams.set('response_type', 'code');
      consentUrl.searchParams.set('email', user.email ?? '');
      if (resource) consentUrl.searchParams.set('resource', resource);
      return withConnectorRequestId(NextResponse.redirect(consentUrl), requestId);
    }

    const code = await mintAuthorizationCode({
      type: 'mcp_auth_code',
      clientId,
      redirectUri,
      scope: normalizedScope,
      codeChallenge: codeChallengeRaw || null,
      codeChallengeMethod: codeChallengeRaw ? 'S256' : null,
      resource,
      uid: user.uid,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    });

    const redirect = new URL(redirectUri);
    redirect.searchParams.set('code', code);
    if (state) redirect.searchParams.set('state', state);
    return withConnectorRequestId(NextResponse.redirect(redirect), requestId);
  } catch (error) {
    logConnectorEvent('oauth/authorize', 'error', {
      requestId,
      clientId,
      redirectUri,
      state,
      message: error instanceof Error ? error.message : String(error),
    });

    if (redirectUri && validateRedirectUri(redirectUri)) {
      return withConnectorRequestId(
        redirectWithError(redirectUri, 'server_error', state),
        requestId
      );
    }

    return withConnectorRequestId(
      NextResponse.json({ error: 'server_error', requestId }, { status: 500 }),
      requestId
    );
  }
}
