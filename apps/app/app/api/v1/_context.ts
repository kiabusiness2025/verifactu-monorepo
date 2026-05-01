/**
 * Helper interno para construir IsaakExecutionContext desde una sesión de dashboard.
 * Usado por todos los endpoints /api/v1/*.
 */
import { requireTenantContext } from '@/lib/api/tenantAuth';
import type { IsaakExecutionContext } from '@/lib/isaak-platform/context';
import { getOrCreateRequestId } from '@/lib/isaak-platform/api/middleware/requestId';
import { ISAAK_MCP_SCOPES } from '@/lib/isaak-platform/permissions/scopes';
import type { NextRequest } from 'next/server';

export type V1AuthResult =
  | { ctx: IsaakExecutionContext; requestId: string }
  | { error: string; status: 401 | 403 };

export async function buildV1Context(req: NextRequest): Promise<V1AuthResult> {
  const requestId = getOrCreateRequestId(req);
  const auth = await requireTenantContext({ channelType: 'dashboard' });

  if ('error' in auth) {
    return { error: auth.error, status: auth.status as 401 | 403 };
  }

  const ctx: IsaakExecutionContext = {
    tenantId: auth.tenantId,
    userId: auth.session.uid,
    authSubject: auth.session.uid,
    channel: 'dashboard',
    // Dashboard sessions have all scopes
    scopes: [...ISAAK_MCP_SCOPES],
    requestId,
    source: 'cookie',
  };

  return { ctx, requestId };
}
