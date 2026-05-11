/**
 * OAuth consent screen transparent proxy.
 *
 * B4 hardening (auditoría 2026-05-11): la página de consent vive en apps/app
 * (`apps/app/app/oauth/consent/page.tsx`) pero la URL pública canónica del
 * conector es `holded.verifactu.business`. Para que el usuario no vea un
 * cambio de dominio durante el authorization flow, proxyeamos transparente
 * desde `holded.verifactu.business/oauth/consent` hacia `app.verifactu.business`.
 *
 * Mismo patrón que `/oauth/authorize`, `/oauth/token` y `/oauth/register`.
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
  const target = new URL('/oauth/consent', APP_PUBLIC_URL);
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
