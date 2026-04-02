import {
  applyOpenAiCorsHeaders,
  getAdvertisedScopes,
  getAuthorizationEndpoint,
  getAuthorizationServerMetadataUrl,
  getDefaultScopes,
  getRegistrationEndpoint,
  getTokenEndpoint,
  getUserInfoEndpoint,
} from '@/lib/oauth/mcp';
import { getAppUrl } from '@verifactu/utils';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function buildMetadataResponse(request: NextRequest) {
  const response = NextResponse.json({
    issuer: getAppUrl(),
    authorization_endpoint: getAuthorizationEndpoint(),
    token_endpoint: getTokenEndpoint(),
    userinfo_endpoint: getUserInfoEndpoint(),
    registration_endpoint: getRegistrationEndpoint(),
    scopes_supported: getAdvertisedScopes(),
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    service_documentation: getAuthorizationServerMetadataUrl(),
    resource: `${getAppUrl()}/api/mcp/holded`,
    default_scopes: getDefaultScopes(),
  });

  response.headers.set('Cache-Control', 'no-store');

  return applyOpenAiCorsHeaders(response, request, {
    methods: ['GET', 'OPTIONS'],
    allowHeaders: ['content-type'],
  });
}

export async function GET(request: NextRequest) {
  return buildMetadataResponse(request);
}

export async function OPTIONS(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    new NextResponse(null, {
      status: 204,
      headers: {
        Allow: 'GET, OPTIONS',
      },
    }),
    request,
    {
      methods: ['GET', 'OPTIONS'],
      allowHeaders: ['content-type'],
    }
  );
}
