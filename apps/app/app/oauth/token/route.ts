import {
  mintAccessToken,
  verifyAuthorizationCode,
  verifyPkce,
} from '@/lib/oauth/mcp';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function parseFormEncoded(body: string) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

export async function POST(request: NextRequest) {
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
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';
  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri.trim() : '';
  const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier.trim() : '';

  if (grantType !== 'authorization_code') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
  }
  if (!code || !clientId || !redirectUri) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const parsed = await verifyAuthorizationCode(code);
  if (!parsed) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  }
  if (parsed.clientId !== clientId || parsed.redirectUri !== redirectUri) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  }
  if (parsed.codeChallenge && !codeVerifier) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  if (parsed.codeChallenge && !verifyPkce(codeVerifier, parsed.codeChallenge)) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  }

  const accessToken = await mintAccessToken({
    type: 'mcp_access_token',
    clientId: parsed.clientId,
    scope: parsed.scope,
    resource: parsed.resource,
    uid: parsed.uid,
    email: parsed.email,
    name: parsed.name,
    tenantId: parsed.tenantId,
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: parsed.scope,
  });
}
