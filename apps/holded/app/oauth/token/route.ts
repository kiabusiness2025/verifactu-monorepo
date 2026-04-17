/**
 * OAuth token proxy.
 *
 * Proxies token exchange (authorization_code → access_token) to apps/app.
 * Needed so ChatGPT can complete the OAuth flow on the holded domain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getTokenUrl() {
  return `${process.env.APP_OAUTH_INTERNAL_URL?.trim() || APP_PUBLIC_URL}/oauth/token`;
}

function proxyHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  for (const name of ['content-type', 'accept', 'origin', 'authorization']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function proxy(request: NextRequest, method: string, body?: string | null) {
  try {
    const res = await fetch(getTokenUrl(), {
      method,
      headers: proxyHeaders(request),
      ...(body != null ? { body } : {}),
    });

    const proxied = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
    });

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') proxied.headers.set(key, value);
    });

    return proxied;
  } catch (err) {
    console.error('[OAuth token proxy] upstream error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxy(request, 'POST', body);
}

export async function OPTIONS(request: NextRequest) {
  return proxy(request, 'OPTIONS');
}
