/**
 * GET /api/integrations/holded/api-key?tenant_id=...
 *
 * Server-to-server endpoint (holded-mcp Railway → apps/app Vercel).
 * Returns the decrypted Holded API key for a given tenant so that the
 * Railway OAuth server can auto-issue an authorization code without
 * showing the legacy consent form again.
 *
 * Auth: x-mcp-shared-secret header must match VERIFACTU_APP_SHARED_SECRET.
 */

import { getHoldedApiKeyForTenant } from '@/lib/integrations/holdedTenant';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const sharedSecret = process.env.VERIFACTU_APP_SHARED_SECRET?.trim();
  if (!sharedSecret) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const providedSecret = request.headers.get('x-mcp-shared-secret')?.trim();
  if (!providedSecret || providedSecret !== sharedSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const tenantId = request.nextUrl.searchParams.get('tenant_id')?.trim();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: 'missing_tenant_id' }, { status: 400 });
  }

  const connection = await getHoldedApiKeyForTenant(tenantId);
  if (!connection?.apiKey) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, apiKey: connection.apiKey });
}
