import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { getSessionPayload } from '@/lib/session';
import {
  buildLoginUrl,
  ensureScopesAllowed,
  getDefaultScopes,
  getMcpResourceUrl,
  mapSessionToOAuthUser,
  mintAuthorizationCode,
  resolveTenantForOAuthSession,
  validateRedirectUri,
} from '@/lib/oauth/mcp';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function redirectWithError(redirectUri: string, error: string, state?: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (state) url.searchParams.set('state', state);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const responseType = url.searchParams.get('response_type');
  const clientId = url.searchParams.get('client_id')?.trim() || '';
  const redirectUri = url.searchParams.get('redirect_uri')?.trim() || '';
  const state = url.searchParams.get('state');
  const codeChallengeRaw = url.searchParams.get('code_challenge')?.trim() || '';
  const codeChallengeMethodRaw = url.searchParams.get('code_challenge_method')?.trim() || '';
  const requestedScope = url.searchParams.get('scope');
  const normalizedScope = requestedScope?.trim() ? requestedScope.trim() : getDefaultScopes().join(' ');
  const resource = url.searchParams.get('resource')?.trim() || getMcpResourceUrl();

  try {
  if (responseType !== 'code') {
    return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 });
  }
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  if (codeChallengeRaw && codeChallengeMethodRaw && codeChallengeMethodRaw !== 'S256') {
    return redirectWithError(redirectUri, 'invalid_request', state);
  }
  if (!validateRedirectUri(redirectUri)) {
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
  }
  if (!ensureScopesAllowed(normalizedScope)) {
    return redirectWithError(redirectUri, 'invalid_scope', state);
  }

  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.redirect(buildLoginUrl(url.toString()));
  }

  let resolved: Awaited<ReturnType<typeof resolveTenantForOAuthSession>> = {
    tenantId: session.tenantId ?? null,
    resolvedUserId: null,
  };

  try {
    resolved = await resolveTenantForOAuthSession({
      uid: session.uid,
      email: session.email ?? null,
      name: session.name ?? null,
      sessionTenantId: session.tenantId ?? null,
    });
  } catch (error) {
    console.error('[oauth/authorize] tenant resolution failed', {
      clientId,
      sessionUid: session.uid,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (resolved.tenantId && resolved.resolvedUserId) {
    try {
      await upsertChannelIdentity({
        userId: resolved.resolvedUserId,
        tenantId: resolved.tenantId,
        channelType: 'chatgpt',
        channelSubjectId: clientId + ':' + session.uid,
        email: session.email ?? null,
        displayName: session.name ?? null,
        metadata: { clientId },
      });
    } catch (error) {
      console.error('[oauth/authorize] channel identity upsert failed', {
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
      hasHoldedConnection = await hasSharedHoldedConnectionForTenant(resolved.tenantId);
    } catch (error) {
      console.error('[oauth/authorize] holded connection lookup failed', {
        tenantId: resolved.tenantId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (resolved.tenantId && !hasHoldedConnection) {
    const onboardingUrl = new URL('/onboarding/holded', request.nextUrl.origin);
    onboardingUrl.searchParams.set('next', url.toString());
    onboardingUrl.searchParams.set('channel', 'chatgpt');
    return NextResponse.redirect(onboardingUrl);
  }

  const user = mapSessionToOAuthUser({
    uid: session.uid,
    email: session.email ?? null,
    name: session.name ?? null,
    tenantId: resolved.tenantId,
  });

  if (!user) {
    return NextResponse.json({ error: 'no_tenant_selected' }, { status: 400 });
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
  return NextResponse.redirect(redirect);
  } catch (error) {
    console.error('[oauth/authorize] unexpected error', {
      clientId,
      redirectUri,
      state,
      message: error instanceof Error ? error.message : String(error),
    });

    if (redirectUri && validateRedirectUri(redirectUri)) {
      return redirectWithError(redirectUri, 'server_error', state);
    }

    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
