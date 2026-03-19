import prisma from '@/lib/prisma';
import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import {
  mintHoldedOnboardingToken,
  resolveTenantForHoldedFirstSession,
  verifyHoldedOnboardingToken,
} from '@/lib/oauth/mcp';
import { getSessionPayload } from '@/lib/session';
import { getAppUrl, getLandingUrl } from '@verifactu/utils';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import HoldedOnboardingClient from './HoldedOnboardingClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Conectar Holded | Isaak',
  icons: {
    icon: '/brand/holded/holded-diamond-logo.png',
    shortcut: '/brand/holded/holded-diamond-logo.png',
    apple: '/brand/holded/holded-diamond-logo.png',
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeNextUrl(nextUrl: string | undefined) {
  const fallback = new URL('/holded', getLandingUrl()).toString();
  if (!nextUrl) return fallback;

  try {
    const parsed = new URL(nextUrl, getAppUrl());
    const appOrigin = new URL(getAppUrl()).origin;
    const landingOrigin = new URL(getLandingUrl()).origin;
    return parsed.origin === appOrigin || parsed.origin === landingOrigin ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

function attachOnboardingToken(nextUrl: string, onboardingToken: string | null) {
  if (!onboardingToken) return nextUrl;

  try {
    const parsed = new URL(nextUrl);
    if (parsed.origin === new URL(getAppUrl()).origin && parsed.pathname === '/oauth/authorize') {
      parsed.searchParams.set('onboarding_token', onboardingToken);
    }
    return parsed.toString();
  } catch {
    return nextUrl;
  }
}

export default async function HoldedOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await getSessionPayload();
  const existingToken = firstValue(params.onboarding_token)?.trim() || null;
  const onboardingToken =
    existingToken ||
    (!session?.uid
      ? await mintHoldedOnboardingToken({
          seed: `holded-onboarding:${Date.now()}:${Math.random()}`,
        })
      : null);
  const onboardingPayload =
    !session?.uid && onboardingToken ? await verifyHoldedOnboardingToken(onboardingToken) : null;
  const nextUrl = attachOnboardingToken(normalizeNextUrl(firstValue(params.next)), onboardingToken);

  const subject = session?.uid
    ? {
        uid: session.uid,
        email: session.email ?? null,
        name: session.name ?? null,
        sessionTenantId: session.tenantId ?? null,
      }
    : onboardingPayload
      ? {
          uid: onboardingPayload.uid,
          email: onboardingPayload.email ?? null,
          name: onboardingPayload.name ?? null,
          sessionTenantId: null,
        }
      : null;

  let tenantId: string | null = subject?.sessionTenantId ?? null;
  let tenantName = 'tu empresa';

  if (subject) {
    try {
      const resolved = await resolveTenantForHoldedFirstSession(subject);
      tenantId = resolved.tenantId;

      if (tenantId) {
        try {
          const hasHoldedConnection = await hasSharedHoldedConnectionForTenant(tenantId);
          if (hasHoldedConnection) {
            redirect(nextUrl);
          }
        } catch (error) {
          console.error('[onboarding/holded] holded connection lookup failed', {
            tenantId,
            message: error instanceof Error ? error.message : String(error),
          });
        }

        try {
          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, legalName: true },
          });

          tenantName = tenant?.legalName || tenant?.name || tenantName;
        } catch (error) {
          console.error('[onboarding/holded] tenant lookup failed', {
            tenantId,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      console.error('[onboarding/holded] tenant resolution failed', {
        sessionUid: subject.uid,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return <HoldedOnboardingClient nextUrl={nextUrl} tenantName={tenantName} onboardingToken={onboardingToken} />;
}
