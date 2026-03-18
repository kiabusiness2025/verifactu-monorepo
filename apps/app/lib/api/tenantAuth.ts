import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { getSessionPayload } from '@/lib/session';
import { resolveTenantForOAuthSession } from '@/lib/oauth/mcp';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

export async function requireTenantContext(options?: {
  channelType?: 'dashboard' | 'chatgpt' | 'internal';
  metadata?: Record<string, unknown>;
}) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const direct = await resolveActiveTenant({
    userId: session.uid,
    sessionTenantId: session.tenantId ?? null,
  });

  const oauthResolved = await resolveTenantForOAuthSession({
    uid: session.uid,
    email: session.email ?? null,
    name: session.name ?? null,
    sessionTenantId: session.tenantId ?? null,
  });

  const tenantId = direct.tenantId ?? oauthResolved.tenantId;

  if (!tenantId) {
    return { error: 'No tenant selected', status: 400 as const };
  }

  if (oauthResolved.resolvedUserId) {
    await upsertChannelIdentity({
      userId: oauthResolved.resolvedUserId,
      tenantId,
      channelType: options?.channelType ?? 'dashboard',
      channelSubjectId: session.uid,
      email: session.email ?? null,
      displayName: session.name ?? null,
      metadata: options?.metadata ?? { source: 'requireTenantContext' },
    });
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
