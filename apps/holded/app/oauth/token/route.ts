/**
 * OAuth token proxy.
 *
 * Proxies authorization_code → access_token exchange to apps/app.
 * ChatGPT calls this endpoint (discovered from AS metadata) after the user
 * completes the authorize flow on the holded domain.
 *
 * Required env var (optional — falls back to public URL):
 *   APP_OAUTH_INTERNAL_URL  internal base URL of apps/app OAuth endpoints
 */

import { proxyUpstream } from '@/app/lib/oauth-proxy';
import { APP_PUBLIC_URL } from '@/app/lib/holded-navigation';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getTokenUrl() {
  return `${process.env.APP_OAUTH_INTERNAL_URL?.trim() || APP_PUBLIC_URL}/oauth/token`;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyUpstream(request, getTokenUrl(), 'POST', body);
}

export async function OPTIONS(request: NextRequest) {
  return proxyUpstream(request, getTokenUrl(), 'OPTIONS');
}
