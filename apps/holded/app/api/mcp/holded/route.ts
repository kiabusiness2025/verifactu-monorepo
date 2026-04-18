/**
 * MCP Holded proxy route.
 *
 * The canonical MCP endpoint for ChatGPT is:
 *   https://holded.verifactu.business/api/mcp/holded
 *
 * All requests are forwarded to the apps/app MCP runtime, which holds the
 * OAuth infrastructure and Holded connection resolver.  The Authorization
 * header is forwarded transparently so token verification happens there.
 *
 * Required env vars:
 *   APP_MCP_INTERNAL_URL  — internal URL of apps/app MCP handler
 *                           (default: https://app.verifactu.business/api/mcp/holded)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAppMcpUrl() {
  return (
    process.env.APP_MCP_INTERNAL_URL?.trim() || 'https://app.verifactu.business/api/mcp/holded'
  );
}

function buildProxyHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const forward = ['authorization', 'content-type', 'accept', 'origin'];
  for (const name of forward) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Force uncompressed response from upstream so the proxy body is plain bytes.
  // Node.js fetch sends Accept-Encoding: br by default, which causes app domain
  // to return brotli — we can't reliably re-stream that to the client.
  headers.set('accept-encoding', 'identity');
  return headers;
}

async function proxyToApp(request: NextRequest, method: string, body?: BodyInit | null) {
  try {
    const response = await fetch(getAppMcpUrl(), {
      method,
      headers: buildProxyHeaders(request),
      body: body ?? null,
    });

    // Clone response and propagate all headers
    const proxied = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
    });

    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // fetch() auto-decompresses the body, so strip compression headers
      if (lower !== 'transfer-encoding' && lower !== 'content-encoding') {
        proxied.headers.set(key, value);
      }
    });

    return proxied;
  } catch (error) {
    console.error('[MCP Holded proxy] upstream error', error);
    return NextResponse.json({ error: 'MCP upstream unavailable' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return proxyToApp(request, 'GET');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToApp(request, 'POST', body);
}

export async function OPTIONS(request: NextRequest) {
  return proxyToApp(request, 'OPTIONS');
}
