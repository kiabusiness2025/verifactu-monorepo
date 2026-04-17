import { NextRequest, NextResponse } from 'next/server';
import { HOLDED_APP_URL, APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';

const ADVERTISED_SCOPES = [
  'openid',
  'email',
  'profile',
  'mcp.read',
  'holded.invoices.read',
  'holded.invoices.write',
  'holded.contacts.read',
  'holded.accounts.read',
  'holded.accounts.write',
  'holded.crm.read',
  'holded.projects.read',
];

function buildOidcConfig() {
  return {
    // issuer must match the discovery domain (RFC 8414 §3.2)
    issuer: HOLDED_APP_URL,
    authorization_endpoint: `${HOLDED_APP_URL}/oauth/authorize`,
    token_endpoint: `${HOLDED_APP_URL}/oauth/token`,
    userinfo_endpoint: `${APP_PUBLIC_URL}/oauth/userinfo`,
    scopes_supported: ADVERTISED_SCOPES,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: ['none'],
    claims_supported: ['sub', 'email', 'name'],
    // OIDC configuration URL for this resource server domain
    service_documentation: `${HOLDED_APP_URL}/.well-known/openid-configuration`,
  };
}

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin');
  const h: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
  if (origin) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

export async function GET(request: NextRequest) {
  return NextResponse.json(buildOidcConfig(), { headers: corsHeaders(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
