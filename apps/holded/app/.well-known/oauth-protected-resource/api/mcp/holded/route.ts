/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for the Holded MCP server.
 *
 * Declares:
 *   resource              → https://holded.verifactu.business/api/mcp/holded
 *   authorization_servers → [https://app.verifactu.business]
 *
 * ChatGPT discovers this document via the WWW-Authenticate header returned
 * by the MCP proxy at /api/mcp/holded when a request has no Bearer token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { HOLDED_APP_URL, APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';

const MCP_RESOURCE_PATH = '/api/mcp/holded';
const SUPPORTED_SCOPES = [
  'mcp.read',
  'holded.invoices.read',
  'holded.invoices.write',
  'holded.contacts.read',
  'holded.accounts.read',
  'holded.accounts.write',
  'holded.crm.read',
  'holded.projects.read',
];

function getMetadata() {
  return {
    resource: `${HOLDED_APP_URL}${MCP_RESOURCE_PATH}`,
    authorization_servers: [APP_PUBLIC_URL],
    bearer_methods_supported: ['header'],
    scopes_supported: SUPPORTED_SCOPES,
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
  return NextResponse.json(getMetadata(), { headers: corsHeaders(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
