/**
 * OAuth token revocation proxy (RFC 7009).
 *
 * ChatGPT (and other compliant OAuth clients) call this endpoint when the
 * user disconnects the connector to revoke refresh/access tokens. The actual
 * RFC 7009 handler lives in apps/app (which knows the JWT signing key and
 * the rate-limit store); this route is a thin proxy so the endpoint URL stays
 * on the same domain as the rest of the OAuth metadata (holded.verifactu.business),
 * which is what RFC 8414 §2 effectively requires for issuer alignment.
 *
 * Tokens are stateless JWTs, so revocation is best-effort per RFC 7009 §2.2 —
 * the server always responds 200 regardless of whether the token is recognized.
 *
 * Required env var (optional — falls back to public URL):
 *   APP_OAUTH_INTERNAL_URL  internal base URL of apps/app OAuth endpoints
 */

import { proxyUpstream } from '@/app/lib/oauth-proxy';
import { APP_PUBLIC_URL } from '@/app/lib/holded-navigation';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRevokeUrl() {
  return `${process.env.APP_OAUTH_INTERNAL_URL?.trim() || APP_PUBLIC_URL}/oauth/revoke`;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyUpstream(request, getRevokeUrl(), 'POST', body);
}

export async function OPTIONS(request: NextRequest) {
  return proxyUpstream(request, getRevokeUrl(), 'OPTIONS');
}
