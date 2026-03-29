import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getIsaakOnboardingState } from '@verifactu/integrations';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  buildHoldedAuthUrl,
  buildHoldedProfileOnboardingUrl,
  ISAAK_PUBLIC_URL,
} from '@/app/lib/isaak-navigation';
import { prisma } from '@/app/lib/prisma';
import IsaakSettingsClient from './IsaakSettingsClient';

export const metadata: Metadata = {
  title: 'Settings | Isaak',
  description: 'Perfil, empresa, conexiones y personalizacion de Isaak.',
};

function takeFirstName(value: string | null | undefined) {
  const normalized = (value || '').trim();
  if (!normalized) return '';
  return normalized.split(' ')[0]?.trim() || normalized;
}

function employeesToLabel(value: number | null | undefined) {
  if (!value || value <= 1) return 'Solo yo';
  if (value <= 5) return '2-5 personas';
  if (value <= 20) return '6-20 personas';
  return 'Mas de 20';
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IsaakSettingsPage({ searchParams }: PageProps) {
  const session = await getHoldedSession();
  const sectionParam = (await searchParams)?.section;
  const section = Array.isArray(sectionParam) ? sectionParam[0] : sectionParam;
  const settingsUrl = `${ISAAK_PUBLIC_URL}/settings${section ? `?section=${encodeURIComponent(section)}` : ''}`;

  if (!session?.tenantId || !session.userId) {
    redirect(buildHoldedAuthUrl('isaak_settings_requires_session', settingsUrl));
  }

  const [user, tenantProfile, connection, onboardingState, subscription, activeMembers] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, image: true },
      }),
      prisma.tenantProfile.findUnique({
        where: { tenantId: session.tenantId },
        select: {
          tradeName: true,
          legalName: true,
          cnaeText: true,
          cnae: true,
          address: true,
          postalCode: true,
          city: true,
          province: true,
          country: true,
          taxId: true,
          representative: true,
          website: true,
          phone: true,
          employees: true,
        },
      }),
      getHoldedConnection(session.tenantId),
      getIsaakOnboardingState({
        prisma,
        tenantId: session.tenantId,
        userId: session.userId,
      }),
      prisma.tenantSubscription.findFirst({
        where: { tenantId: session.tenantId },
        include: { plan: true },
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.membership.count({
        where: {
          tenantId: session.tenantId,
          status: 'active',
        },
      }),
    ]);

  const onboarding = onboardingState.profile;
  const instructions = onboardingState.instructions;

  return (
    <IsaakSettingsClient
      initialSection={section || 'profile'}
      settingsData={{
        profile: {
          photoUrl: user?.image ?? null,
          firstName:
            takeFirstName(onboarding?.preferredName) ||
            takeFirstName(user?.name) ||
            takeFirstName(tenantProfile?.representative) ||
            '',
          email: user?.email ?? session.email ?? '',
          phone: onboarding?.phone ?? null,
          roleInCompany: onboarding?.roleInCompanyOther || onboarding?.roleInCompany || null,
        },
        company: {
          tradeName: tenantProfile?.tradeName ?? connection?.tenantName ?? '',
          legalName: tenantProfile?.legalName ?? connection?.legalName ?? '',
          activityMain: tenantProfile?.cnaeText ?? onboarding?.businessSector ?? '',
          sector: tenantProfile?.cnae ?? '',
          address: tenantProfile?.address ?? '',
          postalCode: tenantProfile?.postalCode ?? '',
          city: tenantProfile?.city ?? '',
          province: tenantProfile?.province ?? '',
          country: tenantProfile?.country ?? 'ES',
          taxId: tenantProfile?.taxId ?? connection?.taxId ?? '',
          representative: tenantProfile?.representative ?? user?.name ?? '',
          website: tenantProfile?.website ?? onboarding?.website ?? '',
          phone: tenantProfile?.phone ?? '',
          teamSize: onboarding?.teamSize || employeesToLabel(tenantProfile?.employees),
        },
        connection: {
          status: connection?.status ?? 'disconnected',
          tenantName: connection?.tenantName ?? tenantProfile?.tradeName ?? null,
          keyMasked: connection?.keyMasked ?? null,
          connectedAt: connection?.connectedAt ?? null,
          lastValidatedAt: connection?.lastValidatedAt ?? null,
          validationSummary: connection?.validationSummary ?? null,
          supportedModules: connection?.supportedModules ?? [],
        },
        isaak: {
          preferredName: onboarding?.preferredName || takeFirstName(user?.name) || '',
          communicationStyle:
            instructions?.communicationStyle ||
            onboarding?.communicationStyle ||
            'spanish_clear_non_technical',
          likelyKnowledgeLevel:
            instructions?.likelyKnowledgeLevel || onboarding?.likelyKnowledgeLevel || 'starter',
          mainGoals: onboarding?.mainGoals ?? [],
          resetUrl: buildHoldedProfileOnboardingUrl(
            'isaak_settings_repersonalize',
            `${ISAAK_PUBLIC_URL}/chat?source=isaak_settings`
          ),
        },
        plan: {
          name: subscription?.plan?.name ?? 'Plan gratuito',
          code: subscription?.plan?.code ?? 'free',
          status: subscription?.status ?? 'active',
        },
        team: {
          enabled: false,
          activeMembers,
        },
      }}
    />
  );
}
