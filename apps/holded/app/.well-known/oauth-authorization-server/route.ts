/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414) — served from holded domain.
 *
 * ChatGPT discovers OAuth by fetching /.well-known/oauth-authorization-server
 * on the same origin as the MCP server.  Since the MCP proxy lives here at
 * holded.verifactu.business, this endpoint must exist here too.
 *
 * The actual authorization server (authorize/token/etc.) remains on
 * app.verifactu.business.  RFC 8414 allows the issuer to differ from the
 * discovery host when the resource server is on a different domain.
 * The `resource` field points to the canonical MCP endpoint (holded domain).
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
    // issuer stays on app.verifactu.business — that's the canonical OAuth server
    issuer: APP_PUBLIC_URL,
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
    service_documentation: `${APP_PUBLIC_URL}/.well-known/oauth-authorization-server`,
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
