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

export default async function HoldedProfileOnboardingPage({ searchParams }: PageProps) {
  const session = await getHoldedSession();
  const resolved = (await searchParams) || {};
  const source = readString(resolved.source) || 'holded_profile_onboarding';
  const next = sanitizeNext(readString(resolved.next) || undefined);

  if (!session?.tenantId || !session.userId) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(`/onboarding/profile?source=${source}&next=${encodeURIComponent(next)}`)}`
    );
  }

  const [connection, tenantProfile, onboardingState] = await Promise.all([
    getHoldedConnection(session.tenantId),
    prisma.tenantProfile.findUnique({
      where: { tenantId: session.tenantId },
      select: {
        tradeName: true,
        legalName: true,
        representative: true,
        phone: true,
        website: true,
      },
    }),
    getIsaakOnboardingState({
      prisma,
      tenantId: session.tenantId,
      userId: session.userId,
    }),
  ]);

  if (!connection?.keyMasked) {
    redirect(`/onboarding/holded?source=${encodeURIComponent(source)}`);
  }

  if (onboardingState.completed) {
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
          connection.tenantName ||
          tenantProfile?.tradeName ||
          tenantProfile?.legalName ||
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
          connection.tenantName || tenantProfile?.tradeName || tenantProfile?.legalName || '',
        website: tenantProfile?.website || '',
        phone: tenantProfile?.phone || '',
      }}
    />
  );
}
