import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getIsaakOnboardingState } from '@verifactu/integrations';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildDashboardUrl } from '@/app/lib/holded-navigation';
import { prisma } from '@/app/lib/prisma';
import HoldedConversationalOnboardingClient from './HoldedConversationalOnboardingClient';

export const metadata: Metadata = {
  title: 'Preparar a Isaak | Holded',
  description: 'Configura rapidamente a Isaak con el contexto minimo de tu empresa.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function readBooleanFlag(value: string | string[] | undefined) {
  return readString(value) === '1';
}

function appendQueryFlag(target: string, key: string, value: string) {
  try {
    const url = new URL(target);
    url.searchParams.set(key, value);
    return url.toString();
  } catch {
    const separator = target.includes('?') ? '&' : '?';
    return `${target}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

function sanitizeNext(value: string | undefined) {
  const fallback = buildDashboardUrl('holded_profile_complete');
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (
      url.origin === 'https://isaak.verifactu.business' ||
      url.origin === 'https://holded.verifactu.business'
    ) {
      return url.toString();
    }
  } catch {
    if (value.startsWith('/')) {
      return `https://holded.verifactu.business${value}`;
    }
  }
  return fallback;
}

async function readTenantProfileSafe(tenantId: string) {
  try {
    return await prisma.tenantProfile.findUnique({
      where: { tenantId },
      select: {
        tradeName: true,
        legalName: true,
        representative: true,
        phone: true,
        website: true,
      },
    });
  } catch (error) {
    console.error('holded tenant profile read failed', error);
    return null;
  }
}

export default async function HoldedProfileOnboardingPage({ searchParams }: PageProps) {
  const session = await getHoldedSession();
  const resolved = (await searchParams) || {};
  const source = readString(resolved.source) || 'holded_profile_onboarding';
  const fresh = readBooleanFlag(resolved.fresh);
  const justConnected = fresh || source === 'holded_connection_complete';
  const next = sanitizeNext(readString(resolved.next) || undefined);

  if (!session?.tenantId || !session.userId) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(`/onboarding/profile?source=${source}&fresh=${fresh ? '1' : '0'}&next=${encodeURIComponent(next)}`)}`
    );
  }

  const [connection, tenantProfile] = await Promise.all([
    getHoldedConnection(session.tenantId),
    readTenantProfileSafe(session.tenantId),
  ]);

  const onboardingState = await getIsaakOnboardingState({
    prisma,
    tenantId: session.tenantId,
    userId: session.userId,
  }).catch((error) => {
    console.error('holded profile onboarding state failed', error);
    return {
      completed: false,
      profile: null,
      draft: null,
      instructions: null,
    };
  });

  if (!connection?.keyMasked && !justConnected) {
    redirect(`/onboarding/holded?source=${encodeURIComponent(source)}`);
  }

  if (onboardingState.completed) {
    if (!connection?.keyMasked && justConnected) {
      redirect(appendQueryFlag(next, 'freshConnection', '1'));
    }
    redirect(next);
  }

  return (
    <HoldedConversationalOnboardingClient
      nextUrl={next}
      initialData={{
        preferredName:
          onboardingState.draft?.preferredName ||
          onboardingState.profile?.preferredName ||
          session.name ||
          tenantProfile?.representative ||
          session.email?.split('@')[0] ||
          '',
        companyName:
          onboardingState.draft?.companyName ||
          onboardingState.profile?.companyName ||
          tenantProfile?.tradeName ||
          tenantProfile?.legalName ||
          connection?.tenantName ||
          '',
        roleInCompany:
          onboardingState.draft?.roleInCompany || onboardingState.profile?.roleInCompany || null,
        roleInCompanyOther:
          onboardingState.draft?.roleInCompanyOther ||
          onboardingState.profile?.roleInCompanyOther ||
          '',
        businessSector:
          onboardingState.draft?.businessSector || onboardingState.profile?.businessSector || '',
        teamSize: onboardingState.draft?.teamSize || onboardingState.profile?.teamSize || '',
        website:
          onboardingState.draft?.website ||
          onboardingState.profile?.website ||
          tenantProfile?.website ||
          '',
        phone:
          onboardingState.draft?.phone ||
          onboardingState.profile?.phone ||
          tenantProfile?.phone ||
          '',
        mainGoals: onboardingState.draft?.mainGoals || onboardingState.profile?.mainGoals || [],
      }}
      detectedContext={{
        companyName:
          tenantProfile?.tradeName || tenantProfile?.legalName || connection?.tenantName || '',
        website: tenantProfile?.website || '',
        phone: tenantProfile?.phone || '',
      }}
    />
  );
}
