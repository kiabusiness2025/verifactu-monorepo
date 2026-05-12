/**
 * OAuth authorize transparent proxy.
 *
 * ChatGPT must discover and navigate the public connector on the holded domain.
 * The shared OAuth backend still lives in apps/app, but this route proxies the
 * request instead of redirecting there so the browser does not visibly abandon
 * holded.verifactu.business during the authorization step.
 */

import { NextRequest } from 'next/server';
import { APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (
      normalized === 'host' ||
      normalized === 'connection' ||
      normalized === 'content-length' ||
      normalized === 'transfer-encoding'
    ) {
      return;
    }
    headers.set(key, value);
  });

  headers.set('x-forwarded-host', request.nextUrl.host);
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

  return headers;
}

export async function GET(request: NextRequest) {
  const target = new URL('/oauth/authorize', APP_PUBLIC_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const upstream = await fetch(target, {
    method: 'GET',
    headers: buildForwardHeaders(request),
    redirect: 'manual',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export async function POST(request: NextRequest) {
  const target = new URL('/oauth/authorize', APP_PUBLIC_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const upstream = await fetch(target, {
    method: 'POST',
    headers: buildForwardHeaders(request),
    redirect: 'manual',
    body: request.body,
    // @ts-expect-error — Node.js fetch requires duplex when body is a ReadableStream
    duplex: 'half',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
