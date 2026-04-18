/**
 * OAuth DCR proxy — RFC 7591 Dynamic Client Registration.
 *
 * ChatGPT probes holded.verifactu.business/oauth/register during connector
 * creation. This route proxies all DCR requests to the apps/app registration
 * endpoint which contains the full validation and deterministic client_id logic.
 *
 * Required env var (optional — falls back to public URL):
 *   APP_OAUTH_INTERNAL_URL  internal base URL of apps/app OAuth endpoints
 */

import { proxyUpstream } from '@/app/lib/oauth-proxy';
import { APP_PUBLIC_URL } from '@/app/lib/holded-navigation';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRegisterUrl() {
  return `${process.env.APP_OAUTH_INTERNAL_URL?.trim() || APP_PUBLIC_URL}/oauth/register`;
}

export async function GET(request: NextRequest) {
  return proxyUpstream(request, getRegisterUrl(), 'GET');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyUpstream(request, getRegisterUrl(), 'POST', body);
}

export async function OPTIONS(request: NextRequest) {
  return proxyUpstream(request, getRegisterUrl(), 'OPTIONS');
}
