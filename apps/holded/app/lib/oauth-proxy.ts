/**
 * Shared proxy utility for holded OAuth routes.
 *
 * All holded OAuth endpoints (register, token) are thin proxies to apps/app.
 * This module centralises the forwarding logic so each route stays minimal.
 *
 * Critical implementation notes:
 *
 * 1. BROTLI — Node.js fetch() sends "Accept-Encoding: br, gzip, deflate" by
 *    default. If we forward that to the upstream, Vercel on app domain returns
 *    brotli-compressed bytes. We then re-stream those bytes to the client with
 *    the original Content-Encoding header, which causes "brotli: decoder failed"
 *    on ChatGPT's servers. Fix: always set "Accept-Encoding: identity" to the
 *    upstream so it returns uncompressed JSON. Vercel on holded domain handles
 *    outgoing compression independently.
 *
 * 2. CONTENT-ENCODING — Strip Content-Encoding from upstream responses for the
 *    same reason above (belt-and-suspenders with the identity request).
 *
 * 3. TRANSFER-ENCODING — Next.js sets this itself; forwarding it from the
 *    upstream causes "invalid header" errors.
 */

import { NextRequest, NextResponse } from 'next/server';

const STRIP_RESPONSE_HEADERS = new Set(['transfer-encoding', 'content-encoding']);

export function buildUpstreamHeaders(
  request: NextRequest,
  forward: string[] = ['content-type', 'accept', 'origin', 'authorization']
): Headers {
  const headers = new Headers();
  for (const name of forward) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Force uncompressed upstream response (see module docblock).
  headers.set('accept-encoding', 'identity');
  return headers;
}

export async function proxyUpstream(
  request: NextRequest,
  upstreamUrl: string,
  method: string,
  body?: string | null
): Promise<NextResponse> {
  try {
    const res = await fetch(upstreamUrl, {
      method,
      headers: buildUpstreamHeaders(request),
      ...(body != null ? { body } : {}),
    });

    const proxied = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
    });

    res.headers.forEach((value, key) => {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        proxied.headers.set(key, value);
      }
    });

    return proxied;
  } catch (err) {
    console.error(`[oauth-proxy] upstream error → ${upstreamUrl}`, err);
    return NextResponse.json({ error: 'server_error' }, { status: 502 });
  }
}
