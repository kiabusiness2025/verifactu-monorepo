/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414) — served from holded domain.
 *
 * RFC 8414 §3.2 requires the `issuer` to match the discovery URL domain.
 * We use HOLDED_APP_URL as the issuer so this metadata is accepted by strict validators.
 *
 * All OAuth endpoints (authorize/token/register) are hosted here on holded domain
 * as proxies to the actual implementation on app.verifactu.business.
 * Token signing/verification uses HMAC and does not validate the issuer URL,
 * so issuer = holded domain does not break token validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { HOLDED_APP_URL, APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';

const MCP_RESOURCE_PATH = '/api/mcp/holded';

function getDefaultScopes() {
  const fromEnv = process.env.MCP_DEFAULT_SCOPES?.trim();
  if (fromEnv) return fromEnv.split(' ').filter(Boolean);
  return ['mcp.read', 'holded.invoices.read'];
}

function getAdvertisedScopes() {
  return [
    'mcp.read',
    'holded.invoices.read',
    'holded.invoices.write',
    'holded.contacts.read',
    'holded.accounts.read',
    'holded.accounts.write',
    'holded.crm.read',
    'holded.projects.read',
  ];
}

function buildMetadata() {
  return {
    // issuer must match the discovery domain (RFC 8414 §3.2)
    issuer: HOLDED_APP_URL,
    // All OAuth endpoints exposed on holded domain (proxied to app internally)
    authorization_endpoint: `${HOLDED_APP_URL}/oauth/authorize`,
    token_endpoint: `${HOLDED_APP_URL}/oauth/token`,
    userinfo_endpoint: `${APP_PUBLIC_URL}/oauth/userinfo`,
    registration_endpoint: `${HOLDED_APP_URL}/oauth/register`,
    scopes_supported: getAdvertisedScopes(),
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    service_documentation: `${HOLDED_APP_URL}/.well-known/oauth-authorization-server`,
    openid_configuration: `${HOLDED_APP_URL}/.well-known/openid-configuration`,
    resource: `${HOLDED_APP_URL}${MCP_RESOURCE_PATH}`,
    default_scopes: getDefaultScopes(),
  };
}

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export async function GET(request: NextRequest) {
  return NextResponse.json(buildMetadata(), { headers: corsHeaders(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
