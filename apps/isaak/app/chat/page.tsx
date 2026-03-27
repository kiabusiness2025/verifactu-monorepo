import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildSuggestedPrompts, getIsaakOnboardingState } from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import {
  buildHoldedAuthUrl,
  buildHoldedProfileOnboardingUrl,
  ISAAK_PUBLIC_URL,
} from '@/app/lib/isaak-navigation';
import { prisma } from '@/app/lib/prisma';
import IsaakWorkspaceClient from './IsaakWorkspaceClient';

export const metadata: Metadata = {
  title: 'Chat | Isaak',
  description: 'Workspace principal de Isaak con chat, memoria y conexion Holded.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function IsaakChatWorkspacePage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'isaak_chat';
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    const chatReturnUrl = `${ISAAK_PUBLIC_URL}/chat?source=${encodeURIComponent(source)}`;
    redirect(buildHoldedAuthUrl('isaak_chat_requires_session', chatReturnUrl));
  }

  const [connection, profile] = await Promise.all([
    getHoldedConnection(session.tenantId),
    prisma.tenantProfile.findUnique({
      where: { tenantId: session.tenantId },
      select: {
        representative: true,
        phone: true,
        tradeName: true,
        legalName: true,
      },
    }),
  ]);

  if (!connection?.keyMasked) {
    redirect(
      buildHoldedProfileOnboardingUrl(
        'isaak_chat_requires_holded',
        `${ISAAK_PUBLIC_URL}/chat?source=${encodeURIComponent(source)}`
      )
    );
  }

  const onboardingState = await getIsaakOnboardingState({
    prisma,
    tenantId: session.tenantId,
    userId: session.userId,
  });

  if (!onboardingState.completed || !onboardingState.profile) {
    redirect(
      buildHoldedProfileOnboardingUrl(
        'isaak_chat_requires_profile',
        `${ISAAK_PUBLIC_URL}/chat?source=${encodeURIComponent(source)}`
      )
    );
  }

  return (
    <IsaakWorkspaceClient
      session={{
        email: session.email,
        name: session.name,
        tenantId: session.tenantId,
        tenantName: connection?.tenantName ?? profile?.tradeName ?? null,
        legalName: connection?.legalName ?? profile?.legalName ?? null,
        taxId: connection?.taxId ?? null,
        keyMasked: connection?.keyMasked ?? null,
        connectedAt: connection?.connectedAt ?? null,
        lastValidatedAt: connection?.lastValidatedAt ?? null,
        supportedModules: connection?.supportedModules ?? [],
        validationSummary: connection?.validationSummary ?? null,
        phone: profile?.phone ?? null,
        representative: profile?.representative ?? null,
        isAdmin: false,
      }}
      onboardingProfile={onboardingState.profile}
      instructionProfile={onboardingState.instructions}
      quickPrompts={buildSuggestedPrompts(onboardingState.profile.mainGoals)}
    />
  );
}
