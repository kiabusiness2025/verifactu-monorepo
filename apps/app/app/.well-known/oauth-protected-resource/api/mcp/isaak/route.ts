/**
 * GET /.well-known/oauth-protected-resource/api/mcp/isaak
 *
 * Resource metadata para el Isaak MCP Server (RFC 9728 / MCP OAuth spec).
 * Permite a clientes MCP (Claude, ChatGPT, etc.) descubrir el servidor OAuth
 * y los scopes soportados por el Isaak MCP.
 */
import { applyOpenAiCorsHeaders } from '@/lib/oauth/mcp';
import { ISAAK_MCP_SCOPES } from '@/lib/isaak-platform/permissions/scopes';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getIsaakResourceMetadata() {
  const appBase = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://app.verifactu.business'
  ).replace(/\/$/, '');

  const holdedBase = (
    process.env.HOLDED_CONNECTOR_URL ||
    process.env.NEXT_PUBLIC_HOLDED_CONNECTOR_URL ||
    'https://claude.verifactu.business'
  ).replace(/\/$/, '');

  return {
    resource: `${appBase}/api/mcp/isaak`,
    authorization_servers: [holdedBase],
    bearer_methods_supported: ['header'],
    scopes_supported: ['openid', 'email', 'profile', 'mcp.read', ...ISAAK_MCP_SCOPES],
  };
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json(getIsaakResourceMetadata());
  response.headers.set('Cache-Control', 'no-store');

  return applyOpenAiCorsHeaders(response, request, {
    methods: ['GET', 'OPTIONS'],
    allowHeaders: ['content-type'],
  });
}

export async function OPTIONS(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    new NextResponse(null, {
      status: 204,
      headers: { Allow: 'GET, OPTIONS' },
    }),
    request,
    { methods: ['GET', 'OPTIONS'], allowHeaders: ['content-type'] }
  );
}
