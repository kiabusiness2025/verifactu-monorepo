import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { resolveHoldedOnboardingSession } from '@/lib/integrations/holdedOnboardingSession';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveTenantForHoldedFirstSession, resolveTenantForOAuthSession } from '@/lib/oauth/mcp';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

export async function requireTenantContext(options?: {
  channelType?: 'dashboard' | 'chatgpt' | 'internal';
  metadata?: Record<string, unknown>;
  tenantIdHint?: string | null;
  onboardingToken?: string | null;
}) {
  const session = await getSessionPayload();
  const onboardingSession =
    options?.channelType === 'chatgpt' && options?.onboardingToken?.trim()
      ? await resolveHoldedOnboardingSession(options.onboardingToken)
      : null;
  if (!session?.uid && !onboardingSession?.uid) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const prefersOnboardingSubject =
    options?.channelType === 'chatgpt' && Boolean(onboardingSession?.uid);
  const subjectUid = prefersOnboardingSubject
    ? (onboardingSession?.uid ?? null)
    : (session?.uid ?? onboardingSession?.uid ?? null);
  const subjectEmail = prefersOnboardingSubject
    ? (onboardingSession?.email ?? session?.email ?? null)
    : (session?.email ?? onboardingSession?.email ?? null);
  const subjectName = prefersOnboardingSubject
    ? (onboardingSession?.name ?? session?.name ?? null)
    : (session?.name ?? onboardingSession?.name ?? null);
  const sessionTenantId = prefersOnboardingSubject
    ? (onboardingSession?.tenantId ?? session?.tenantId ?? null)
    : (session?.tenantId ?? onboardingSession?.tenantId ?? null);

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
            tenantIdHint: options?.tenantIdHint ?? onboardingSession?.tenantId ?? null,
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

  const prefersOauthResolved = options?.channelType === 'chatgpt';
  let tenantId = prefersOauthResolved
    ? (oauthResolved.tenantId ?? direct.tenantId ?? sessionTenantId ?? null)
    : (direct.tenantId ?? oauthResolved.tenantId ?? sessionTenantId ?? null);

  if (
    options?.channelType === 'chatgpt' &&
    onboardingSession?.tenantBound === true &&
    onboardingSession.tenantId
  ) {
    tenantId = onboardingSession.tenantId;
  }

  const normalizedTenantIdHint =
    options?.tenantIdHint?.trim() || onboardingSession?.tenantId?.trim() || null;
  if (normalizedTenantIdHint) {
    try {
      const hintMembership = await prisma.membership.findFirst({
        where: {
          userId: subjectUid,
          tenantId: normalizedTenantIdHint,
          status: 'active',
        },
        select: { tenantId: true },
      });

      if (hintMembership || oauthResolved.tenantId === normalizedTenantIdHint) {
        tenantId = normalizedTenantIdHint;
      }
    } catch (error) {
      console.error('[requireTenantContext] tenant hint resolution failed', {
        sessionUid: subjectUid,
        tenantIdHint: normalizedTenantIdHint,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

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
      authMethod: onboardingSession?.authMethod ?? null,
      emailVerified: onboardingSession?.emailVerified ?? false,
      firstName: onboardingSession?.firstName ?? null,
      lastName: onboardingSession?.lastName ?? null,
      verifiedAt: onboardingSession?.verifiedAt ?? null,
    },
    resolved: {
      ...direct,
      tenantId,
    },
    resolvedUserId: oauthResolved.resolvedUserId,
    tenantId,
  };
}
