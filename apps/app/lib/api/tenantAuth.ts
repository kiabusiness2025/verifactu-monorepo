import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

export async function requireTenantContext() {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const resolved = await resolveActiveTenant({
    userId: session.uid,
    sessionTenantId: session.tenantId ?? null,
  });

  if (!resolved.tenantId) {
    return { error: 'No tenant selected', status: 400 as const };
  }

  return {
    session,
    resolved,
    tenantId: resolved.tenantId,
  };
}
