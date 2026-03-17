import {
  getAuthorizationEndpoint,
  getAuthorizationServerMetadataUrl,
  getDefaultScopes,
  getSupportedScopes,
  getTokenEndpoint,
  getUserInfoEndpoint,
} from '@/lib/oauth/mcp';
import { getAppUrl } from '@verifactu/utils';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    issuer: getAppUrl(),
    authorization_endpoint: getAuthorizationEndpoint(),
    token_endpoint: getTokenEndpoint(),
    userinfo_endpoint: getUserInfoEndpoint(),
    scopes_supported: getSupportedScopes(),
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    service_documentation: getAuthorizationServerMetadataUrl(),
    resource: `${getAppUrl()}/api/mcp/holded`,
    default_scopes: getDefaultScopes(),
  });
}
