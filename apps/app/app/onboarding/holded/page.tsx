import prisma from '@/lib/prisma';
import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { buildLoginUrl, resolveTenantForHoldedFirstSession } from '@/lib/oauth/mcp';
import { getSessionPayload } from '@/lib/session';
import { getAppUrl } from '@verifactu/utils';
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
  const fallback = new URL('/dashboard/integrations/isaak-for-holded', getAppUrl()).toString();
  if (!nextUrl) return fallback;

  try {
    const parsed = new URL(nextUrl, getAppUrl());
    const appOrigin = new URL(getAppUrl()).origin;
    return parsed.origin === appOrigin ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

export default async function HoldedOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const nextUrl = normalizeNextUrl(firstValue(params.next));
  const session = await getSessionPayload();

  if (!session?.uid) {
    redirect(buildLoginUrl(nextUrl));
  }

  let tenantId: string | null = session.tenantId ?? null;
  let tenantName = 'tu empresa';

  try {
    const resolved = await resolveTenantForHoldedFirstSession({
      uid: session.uid,
      email: session.email ?? null,
      name: session.name ?? null,
      sessionTenantId: session.tenantId ?? null,
    });

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
      sessionUid: session.uid,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return <HoldedOnboardingClient nextUrl={nextUrl} tenantName={tenantName} />;
}
