import prisma from '@/lib/prisma';
import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { buildLoginUrl, resolveTenantForOAuthSession } from '@/lib/oauth/mcp';
import { getSessionPayload } from '@/lib/session';
import { getAppUrl } from '@verifactu/utils';
import { redirect } from 'next/navigation';
import HoldedOnboardingClient from './HoldedOnboardingClient';

export const dynamic = 'force-dynamic';

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

  const resolved = await resolveTenantForOAuthSession({
    uid: session.uid,
    email: session.email ?? null,
    name: session.name ?? null,
    sessionTenantId: session.tenantId ?? null,
  });

  if (!resolved.tenantId) {
    redirect('/dashboard/onboarding');
  }

  const hasHoldedConnection = await hasSharedHoldedConnectionForTenant(resolved.tenantId);
  if (hasHoldedConnection) {
    redirect(nextUrl);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: resolved.tenantId },
    select: { name: true, legalName: true },
  });

  const tenantName = tenant?.legalName || tenant?.name || 'tu empresa';

  return <HoldedOnboardingClient nextUrl={nextUrl} tenantName={tenantName} />;
}
