import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import {
  resolveTenantForHoldedFirstSession,
  resolveTenantForOAuthSession,
  verifyHoldedOnboardingToken,
} from '@/lib/oauth/mcp';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

export async function requireTenantContext(options?: {
  channelType?: 'dashboard' | 'chatgpt' | 'internal';
  metadata?: Record<string, unknown>;
  onboardingToken?: string | null;
}) {
  const session = await getSessionPayload();
  const onboardingPayload =
    !session?.uid && options?.channelType === 'chatgpt' && options?.onboardingToken
      ? await verifyHoldedOnboardingToken(options.onboardingToken)
      : null;

  if (!session?.uid && !onboardingPayload) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const subjectUid = session?.uid ?? onboardingPayload?.uid ?? null;
  const subjectEmail = session?.email ?? onboardingPayload?.email ?? null;
  const subjectName = session?.name ?? onboardingPayload?.name ?? null;
  const sessionTenantId = session?.tenantId ?? null;

  if (!subjectUid) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  let direct = {
    tenantId: sessionTenantId,
    tenant: null,
    supportMode: false,
    supportSessionId: null,
  } as Awaited<ReturnType<typeof resolveActiveTenant>>;

  try {
    direct = await resolveActiveTenant({
      userId: subjectUid,
      sessionTenantId,
    });
  } catch (error) {
    console.error('[requireTenantContext] direct tenant resolution failed', {
      sessionUid: subjectUid,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let oauthResolved: { tenantId: string | null; resolvedUserId: string | null } = {
    tenantId: sessionTenantId,
    resolvedUserId: null,
  };

  try {
    oauthResolved =
      options?.channelType === 'chatgpt'
        ? await resolveTenantForHoldedFirstSession({
            uid: subjectUid,
            email: subjectEmail,
            name: subjectName,
            sessionTenantId,
          })
        : await resolveTenantForOAuthSession({
            uid: subjectUid,
            email: subjectEmail,
            name: subjectName,
            sessionTenantId,
          });
  } catch (error) {
    console.error('[requireTenantContext] oauth tenant resolution failed', {
      sessionUid: subjectUid,
      channelType: options?.channelType ?? 'dashboard',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let tenantId = direct.tenantId ?? oauthResolved.tenantId ?? sessionTenantId ?? null;

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
        sessionUid: subjectUid,
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
        channelSubjectId: subjectUid,
        email: subjectEmail,
        displayName: subjectName,
        metadata: options?.metadata ?? { source: 'requireTenantContext' },
      });
    } catch (error) {
      console.error('[requireTenantContext] channel identity upsert failed', {
        sessionUid: subjectUid,
        tenantId,
        resolvedUserId: oauthResolved.resolvedUserId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    session: {
      uid: subjectUid,
      email: subjectEmail,
      name: subjectName,
      tenantId,
    },
    resolved: {
      ...direct,
      tenantId,
    },
    resolvedUserId: oauthResolved.resolvedUserId,
    tenantId,
  };
}
