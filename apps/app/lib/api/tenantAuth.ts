import { getSessionPayload } from '@/lib/session';
import { resolveTenantForOAuthSession } from '@/lib/oauth/mcp';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

export async function requireTenantContext() {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const direct = await resolveActiveTenant({
    userId: session.uid,
    sessionTenantId: session.tenantId ?? null,
  });

  const tenantId =
    direct.tenantId ??
    (
      await resolveTenantForOAuthSession({
        uid: session.uid,
        email: session.email ?? null,
        name: session.name ?? null,
        sessionTenantId: session.tenantId ?? null,
      })
    ).tenantId;

  if (!tenantId) {
    return { error: 'No tenant selected', status: 400 as const };
  }

  return {
    session,
    resolved: {
      ...direct,
      tenantId,
    },
    tenantId,
  };
}
