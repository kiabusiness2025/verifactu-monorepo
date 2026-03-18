import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveTenantForHoldedFirstSession, resolveTenantForOAuthSession } from '@/lib/oauth/mcp';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

export async function requireTenantContext(options?: {
  channelType?: 'dashboard' | 'chatgpt' | 'internal';
  metadata?: Record<string, unknown>;
}) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  let direct = {
    tenantId: session.tenantId ?? null,
    tenant: null,
    supportMode: false,
    supportSessionId: null,
  } as Awaited<ReturnType<typeof resolveActiveTenant>>;

  try {
    direct = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
  } catch (error) {
    console.error('[requireTenantContext] direct tenant resolution failed', {
      sessionUid: session.uid,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let oauthResolved: { tenantId: string | null; resolvedUserId: string | null } = {
    tenantId: session.tenantId ?? null,
    resolvedUserId: null,
  };

  try {
    oauthResolved =
      options?.channelType === 'chatgpt'
        ? await resolveTenantForHoldedFirstSession({
            uid: session.uid,
            email: session.email ?? null,
            name: session.name ?? null,
            sessionTenantId: session.tenantId ?? null,
          })
        : await resolveTenantForOAuthSession({
            uid: session.uid,
            email: session.email ?? null,
            name: session.name ?? null,
            sessionTenantId: session.tenantId ?? null,
          });
  } catch (error) {
    console.error('[requireTenantContext] oauth tenant resolution failed', {
      sessionUid: session.uid,
      channelType: options?.channelType ?? 'dashboard',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let tenantId = direct.tenantId ?? oauthResolved.tenantId ?? session.tenantId ?? null;

  if (options?.channelType === 'chatgpt' && tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { isDemo: true },
      });

      if (tenant?.isDemo && oauthResolved.tenantId && oauthResolved.tenantId !== tenantId) {
        tenantId = oauthResolved.tenantId;
      }
    } catch (error) {
      console.error('[requireTenantContext] tenant demo check failed', {
        sessionUid: session.uid,
        tenantId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!tenantId) {
    return { error: 'No tenant selected', status: 400 as const };
  }

  if (oauthResolved.resolvedUserId) {
    try {
      await upsertChannelIdentity({
        userId: oauthResolved.resolvedUserId,
        tenantId,
        channelType: options?.channelType ?? 'dashboard',
        channelSubjectId: session.uid,
        email: session.email ?? null,
        displayName: session.name ?? null,
        metadata: options?.metadata ?? { source: 'requireTenantContext' },
      });
    } catch (error) {
      console.error('[requireTenantContext] channel identity upsert failed', {
        sessionUid: session.uid,
        tenantId,
        resolvedUserId: oauthResolved.resolvedUserId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
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
