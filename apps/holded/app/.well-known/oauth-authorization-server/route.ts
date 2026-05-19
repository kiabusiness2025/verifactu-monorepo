/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 * Served from holded.verifactu.business — the MCP server domain.
 *
 * CRITICAL DESIGN RULES (learned from production debugging):
 *
 * 1. ISSUER MUST MATCH DISCOVERY DOMAIN (RFC 8414 §3.2)
 *    ChatGPT validates that `issuer` === the domain it fetched this document from.
 *    Using APP_PUBLIC_URL here causes "doesn't support RFC 7591 DCR" silently.
 *    Use HOLDED_APP_URL even though the real token signer is apps/app — token
 *    validation uses HMAC and never checks the issuer URL string.
 *
 * 2. ALL OAUTH ENDPOINTS MUST BE ON THE SAME DOMAIN AS THE MCP SERVER
 *    ChatGPT requires the MCP server domain to expose authorize/token/register.
 *    These are proxy routes that forward to apps/app internally.
 *
 * 3. PROTECTED RESOURCE METADATA MUST AGREE ON THE SAME ISSUER
 *    /.well-known/oauth-protected-resource/api/mcp/holded → authorization_servers
 *    must match this issuer. Inconsistency causes 400 Bad Request from ChatGPT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { HOLDED_APP_URL, APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';

const MCP_RESOURCE_PATH = '/api/mcp/holded';

function getDefaultScopes() {
  const fromEnv = process.env.MCP_DEFAULT_SCOPES?.trim();
  if (fromEnv) return fromEnv.split(' ').filter(Boolean);
  // Default scopes alineados con `openai_review_invoicing_v1` preset en
  // apps/app (`OPENAI_REVIEW_INVOICING_V1_SCOPE_SET`). Estos 6 scopes
  // cubren las 10 tools expuestas en submission v2 a OpenAI: invoicing
  // (venta + compra) + contactos + contabilidad. Si cambia el preset
  // público en apps/app, hay que actualizar este array.
  return [
    'mcp.read',
    'holded.invoices.read',
    'holded.invoices.write',
    'holded.documents.read',
    'holded.contacts.read',
    'holded.accounts.read',
  ];
}

// Full scope list — must match HOLDED_MCP_SUPPORTED_SCOPES in apps/app
function getAdvertisedScopes() {
  return [
    // OIDC pass-through scopes
    'openid',
    'email',
    'profile',
    // MCP base
    'mcp.read',
    // Holded resource scopes
    'holded.invoices.read',
    'holded.invoices.write',
    'holded.documents.read',
    'holded.documents.write',
    'holded.contacts.read',
    'holded.contacts.attachments.read',
    'holded.contacts.write',
    'holded.accounts.read',
    'holded.accounts.write',
    'holded.crm.read',
    'holded.projects.read',
    'holded.treasury.read',
    'holded.treasury.write',
    'holded.expenses.read',
    'holded.expenses.write',
    'holded.numbering.read',
    'holded.numbering.write',
    'holded.products.read',
    'holded.products.media.read',
    'holded.products.write',
    'holded.saleschannels.read',
    'holded.saleschannels.write',
    'holded.warehouses.read',
    'holded.warehouses.write',
    'holded.payments.read',
    'holded.payments.write',
    'holded.taxes.read',
    'holded.paymentmethods.read',
    'holded.contactgroups.read',
    'holded.contactgroups.write',
    'holded.remittances.read',
    'holded.services.read',
    'holded.services.write',
  ];
}

function buildMetadata() {
  return {
    // Must equal HOLDED_APP_URL — see rule #1 above
    issuer: HOLDED_APP_URL,
    // All OAuth endpoints on holded domain (proxied to apps/app internally)
    authorization_endpoint: `${HOLDED_APP_URL}/oauth/authorize`,
    token_endpoint: `${HOLDED_APP_URL}/oauth/token`,
    registration_endpoint: `${HOLDED_APP_URL}/oauth/register`,
    // RFC 7009 token revocation endpoint, proxied to apps/app.
    revocation_endpoint: `${HOLDED_APP_URL}/oauth/revoke`,
    // userinfo lives only on app domain (not proxied — called directly)
    userinfo_endpoint: `${APP_PUBLIC_URL}/oauth/userinfo`,
    scopes_supported: getAdvertisedScopes(),
    response_types_supported: ['code'],
    // ChatGPT app review DCR sends grant_types=[authorization_code, refresh_token].
    // The token endpoint in apps/app already supports both since 2026-05-12
    // (commit 8af1973fc); this metadata must advertise them so OAuth clients
    // know they can use refresh_token without re-registering. Fixed 2026-05-18.
    grant_types_supported: ['authorization_code', 'refresh_token'],
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
