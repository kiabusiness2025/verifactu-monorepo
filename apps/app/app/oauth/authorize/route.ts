import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import {
  getHoldedOnboardingTokenFromSearchParams,
  resolveHoldedOnboardingSession,
} from '@/lib/integrations/holdedOnboardingSession';
import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import {
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { getSessionPayload } from '@/lib/session';
import {
  buildLoginUrl,
  ensureScopesAllowed,
  getDefaultScopes,
  getMcpResourceUrl,
  isValidPkceCodeChallenge,
  mapSessionToOAuthUser,
  mintHoldedOnboardingToken,
  mintAuthorizationCode,
  resolveTenantForHoldedFirstSession,
  validateRedirectUri,
} from '@/lib/oauth/mcp';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function buildCanonicalHoldedOnboardingUrl(input: {
  next: string;
  onboardingToken?: string | null;
  tenantId?: string | null;
}) {
  const holdedSiteUrl =
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() || 'https://holded.verifactu.business';
  const onboardingUrl = new URL('/onboarding/holded', holdedSiteUrl);
  onboardingUrl.searchParams.set('source', 'holded_chatgpt_entry');
  onboardingUrl.searchParams.set('channel', 'chatgpt');
  onboardingUrl.searchParams.set('require_connection_confirmation', '1');
  onboardingUrl.searchParams.set('reset', '1');
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

function redirectWithError(redirectUri: string, error: string, state?: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (state) url.searchParams.set('state', state);
  return NextResponse.redirect(url);
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
  const normalizedScope = requestedScope?.trim()
    ? requestedScope.trim()
    : getDefaultScopes().join(' ');
  const resource = url.searchParams.get('resource')?.trim() || getMcpResourceUrl();
  const connectionConfirmed = url.searchParams.get('connection_confirmed')?.trim() === '1';
  const tenantIdQuery = url.searchParams.get('tenant_id')?.trim() || null;
  const loginConfirmed = url.searchParams.get('holded_login_confirmed')?.trim() === '1';
  const isChatgptClient = isLikelyChatgptOAuthRequest({ clientId, redirectUri });

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
          buildLoginUrl(authorizeAfterLoginUrl.toString(), 'holded_chat_requires_session')
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
        next: authorizeUrl.toString(),
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
          channelType: 'chatgpt',
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

    if (resolved.tenantId && (!hasHoldedConnection || !connectionConfirmed)) {
      const authorizeUrl = new URL(url.toString());
      authorizeUrl.searchParams.delete('connection_confirmed');
      const redirectTenantId = tenantIdQuery ?? onboardingSession?.tenantId ?? resolved.tenantId;
      if (onboardingToken) {
        authorizeUrl.searchParams.set('onboarding_token', onboardingToken);
      }
      if (redirectTenantId) {
        authorizeUrl.searchParams.set('tenant_id', redirectTenantId);
      }

      const onboardingUrl = buildCanonicalHoldedOnboardingUrl({
        next: authorizeUrl.toString(),
        onboardingToken,
        tenantId: redirectTenantId,
      });

      if (!hasHoldedConnection) {
        return withConnectorRequestId(NextResponse.redirect(onboardingUrl), requestId);
      }

      return withConnectorRequestId(NextResponse.redirect(onboardingUrl), requestId);
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
