import {
  consumeAuthorizationCode,
  isValidPkceCodeVerifier,
  mintAccessToken,
  mintRefreshToken,
  verifyAuthorizationCode,
  verifyPkce,
  verifyRefreshToken,
} from '@/lib/oauth/mcp';
import { rateLimit } from '@/lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// R2 hardening (auditoría 2026-05-11): rate limit en /oauth/token para evitar
// que un atacante haga brute-force de authorization codes o code_verifiers.
// 20 intentos/min/IP cubre con holgura cualquier flujo legítimo (ChatGPT
// intercambia 1 código + opcionalmente 1 refresh por sesión).
const TOKEN_RATE_LIMIT = { limit: 20, windowMs: 60_000, keyPrefix: 'oauth-token' } as const;

function parseFormEncoded(body: string) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, TOKEN_RATE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited', error_description: 'Too many token requests. Retry shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfter),
          'X-RateLimit-Limit': String(TOKEN_RATE_LIMIT.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  const contentType = request.headers.get('content-type') || '';
  const raw = await request.text();
  let body: Record<string, unknown>;
  try {
    body = contentType.includes('application/x-www-form-urlencoded')
      ? parseFormEncoded(raw)
      : JSON.parse(raw || '{}');
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const grantType = typeof body.grant_type === 'string' ? body.grant_type.trim() : '';
  const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';

  if (grantType === 'refresh_token') {
    const refreshTokenRaw = typeof body.refresh_token === 'string' ? body.refresh_token.trim() : '';
    if (!refreshTokenRaw || !clientId) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    try {
      const parsed = await verifyRefreshToken(refreshTokenRaw);
      if (!parsed || parsed.clientId !== clientId) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }
      const tokenBase = {
        clientId: parsed.clientId,
        scope: parsed.scope,
        resource: parsed.resource,
        uid: parsed.uid,
        email: parsed.email,
        name: parsed.name,
        tenantId: parsed.tenantId,
      };
      const [accessToken, refreshToken] = await Promise.all([
        mintAccessToken({ type: 'mcp_access_token', ...tokenBase }),
        mintRefreshToken(tokenBase),
      ]);
      return NextResponse.json({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 86400,
        scope: parsed.scope,
      });
    } catch (error) {
      console.error('[oauth/token] refresh_token error', {
        clientId,
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri.trim() : '';
  const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier.trim() : '';

  if (grantType !== 'authorization_code') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
  }
  if (!code || !clientId || !redirectUri) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const parsed = await verifyAuthorizationCode(code);
    if (!parsed) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }
    if (parsed.clientId !== clientId || parsed.redirectUri !== redirectUri) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }
    if (!parsed.codeChallenge || parsed.codeChallengeMethod !== 'S256') {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }
    if (!codeVerifier || !isValidPkceCodeVerifier(codeVerifier)) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    if (!verifyPkce(codeVerifier, parsed.codeChallenge)) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }

    const consumed = await consumeAuthorizationCode(parsed.codeId, parsed.exp);
    if (!consumed) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }

    const tokenBase = {
      clientId: parsed.clientId,
      scope: parsed.scope,
      resource: parsed.resource,
      uid: parsed.uid,
      email: parsed.email,
      name: parsed.name,
      tenantId: parsed.tenantId,
    };
    const [accessToken, refreshToken] = await Promise.all([
      mintAccessToken({ type: 'mcp_access_token', ...tokenBase }),
      mintRefreshToken(tokenBase),
    ]);

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      // C3 (auditoria OpenAI 2026-05-07): 86400s = 24h.
      expires_in: 86400,
      scope: parsed.scope,
    });
  } catch (error) {
    console.error('[oauth/token] unexpected error', {
      clientId,
      redirectUri,
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
