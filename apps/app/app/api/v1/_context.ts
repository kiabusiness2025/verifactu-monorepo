/**
 * Helper interno para construir IsaakExecutionContext.
 * Usado por todos los endpoints /api/v1/*.
 *
 * Orden de autenticación:
 *  1. Bearer isk_live_* / isk_test_*  → API key partner (Fase 4)
 *  2. Cookie __session                → Dashboard autenticado (Fase 2)
 */
import { requireTenantContext } from '@/lib/api/tenantAuth';
import type { IsaakExecutionContext } from '@/lib/isaak-platform/context';
import { getOrCreateRequestId } from '@/lib/isaak-platform/api/middleware/requestId';
import { ISAAK_MCP_SCOPES } from '@/lib/isaak-platform/permissions/scopes';
import { isIsaakApiKey, validateApiKey } from '@/lib/isaak-platform/auth/apiKeyAuth';
import type { NextRequest } from 'next/server';

export type V1AuthResult =
  | { ctx: IsaakExecutionContext; requestId: string; keyId?: string }
  | { error: string; status: 401 | 403 | 429 };

export async function buildV1Context(req: NextRequest): Promise<V1AuthResult> {
  const requestId = getOrCreateRequestId(req);

  // ── Fase 4: API key partner ──────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (bearerToken && isIsaakApiKey(bearerToken)) {
    const result = await validateApiKey(requestId, bearerToken);
    if ('error' in result) {
      return { error: result.error, status: result.status as 401 | 429 };
    }
    return { ctx: result.ctx, requestId, keyId: result.keyId };
  }

  // ── Fase 2: cookie dashboard ─────────────────────────────────────────────
  const auth = await requireTenantContext({ channelType: 'dashboard' });

  if ('error' in auth) {
    return { error: auth.error, status: auth.status as 401 | 403 };
  }

  const ctx: IsaakExecutionContext = {
    tenantId: auth.tenantId,
    userId: auth.session.uid,
    authSubject: auth.session.uid,
    channel: 'dashboard',
    scopes: [...ISAAK_MCP_SCOPES],
    requestId,
    source: 'cookie',
  };

  return { ctx, requestId };
}
