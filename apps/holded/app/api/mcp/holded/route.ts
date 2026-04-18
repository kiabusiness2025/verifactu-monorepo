/**
 * MCP Holded proxy route.
 *
 * The canonical MCP endpoint for ChatGPT is:
 *   https://holded.verifactu.business/api/mcp/holded
 *
 * All requests are transparently forwarded to the apps/app MCP runtime, which
 * holds the OAuth token validator and the Holded connection resolver.
 * The Authorization header is forwarded so token verification happens there.
 *
 * Required env var (optional — falls back to public URL):
 *   APP_MCP_INTERNAL_URL  internal URL of apps/app MCP handler
 */

import { buildUpstreamHeaders, proxyUpstream } from '@/app/lib/oauth-proxy';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAppMcpUrl() {
  return (
    process.env.APP_MCP_INTERNAL_URL?.trim() || 'https://app.verifactu.business/api/mcp/holded'
  );
}

export async function GET(request: NextRequest) {
  return proxyUpstream(request, getAppMcpUrl(), 'GET', null);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyUpstream(request, getAppMcpUrl(), 'POST', body);
}

export async function OPTIONS(request: NextRequest) {
  // Pass OPTIONS through so apps/app can respond with correct CORS headers
  const proxied = await proxyUpstream(request, getAppMcpUrl(), 'OPTIONS', null);

  // Ensure holded domain also advertises the correct CORS methods
  if (!proxied.headers.get('access-control-allow-methods')) {
    proxied.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  }

  return proxied;
}

// Re-export for explicit HEAD support (returns 200 so ChatGPT knows endpoint exists)
export async function HEAD(request: NextRequest) {
  const headers = buildUpstreamHeaders(request);
  try {
    const res = await fetch(getAppMcpUrl(), { method: 'HEAD', headers });
    return new NextResponse(null, { status: res.status });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
