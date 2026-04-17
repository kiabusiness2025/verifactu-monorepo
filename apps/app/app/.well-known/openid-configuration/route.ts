import {
  applyOpenAiCorsHeaders,
  getAdvertisedScopes,
  getAuthorizationEndpoint,
  getAuthorizationServerIssuer,
  getTokenEndpoint,
  getUserInfoEndpoint,
} from '@/lib/oauth/mcp';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function buildOidcConfig() {
  const issuer = getAuthorizationServerIssuer();
  return {
    issuer,
    authorization_endpoint: getAuthorizationEndpoint(),
    token_endpoint: getTokenEndpoint(),
    userinfo_endpoint: getUserInfoEndpoint(),
    scopes_supported: ['openid', 'email', 'profile', ...getAdvertisedScopes()],
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: ['none'],
    claims_supported: ['sub', 'email', 'name'],
  };
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json(buildOidcConfig());
  response.headers.set('Cache-Control', 'no-store');
  return applyOpenAiCorsHeaders(response, request, {
    methods: ['GET', 'OPTIONS'],
    allowHeaders: ['content-type'],
  });
}

export async function OPTIONS(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } }),
    request,
    { methods: ['GET', 'OPTIONS'], allowHeaders: ['content-type'] }
  );
}
