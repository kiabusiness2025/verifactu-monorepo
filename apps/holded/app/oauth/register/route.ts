/**
 * OAuth DCR proxy — RFC 7591 Dynamic Client Registration.
 *
 * ChatGPT checks that the MCP server's domain (holded.verifactu.business)
 * supports DCR before proceeding.  This route proxies all DCR requests to
 * the apps/app registration endpoint so holded domain passes that check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRegisterUrl() {
  return `${process.env.APP_OAUTH_INTERNAL_URL?.trim() || APP_PUBLIC_URL}/oauth/register`;
}

function proxyHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  for (const name of ['content-type', 'accept', 'origin', 'authorization']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Force uncompressed upstream response — Node.js fetch sends Accept-Encoding: br
  // by default and we can't reliably re-stream compressed bytes to the client.
  headers.set('accept-encoding', 'identity');
  return headers;
}

async function proxy(request: NextRequest, method: string, body?: string | null) {
  try {
    const res = await fetch(getRegisterUrl(), {
      method,
      headers: proxyHeaders(request),
      ...(body != null ? { body } : {}),
    });

    const proxied = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
    });

    res.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // fetch() auto-decompresses the body, so strip compression headers
      if (lower !== 'transfer-encoding' && lower !== 'content-encoding') {
        proxied.headers.set(key, value);
      }
    });

    return proxied;
  } catch (err) {
    console.error('[OAuth register proxy] upstream error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return proxy(request, 'GET');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxy(request, 'POST', body);
}

export async function OPTIONS(request: NextRequest) {
  return proxy(request, 'OPTIONS');
}
