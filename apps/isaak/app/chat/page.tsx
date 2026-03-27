import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { IsaakInstructionProfile, IsaakOnboardingProfile } from '@verifactu/integrations';
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

function readHandoff(
  value: string | string[] | undefined
): { profile: IsaakOnboardingProfile; instructions: IsaakInstructionProfile | null } | null {
  const raw = readSource(value);
  if (!raw) return null;

  try {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as {
      profile?: IsaakOnboardingProfile | null;
      instructions?: IsaakInstructionProfile | null;
    };

    if (!parsed?.profile) return null;
    return {
      profile: parsed.profile,
      instructions: parsed.instructions ?? null,
    };
  } catch {
    return null;
  }
}

function buildFallbackProfile(input: {
  session: { name: string | null; email: string | null };
  connection: {
    tenantName: string | null;
    legalName: string | null;
  };
  tenantProfile: {
    representative: string | null;
    tradeName: string | null;
    legalName: string | null;
  } | null;
}): IsaakOnboardingProfile {
  return {
    preferredName:
      input.session.name ||
      input.tenantProfile?.representative ||
      input.session.email?.split('@')[0] ||
      'Hola',
    companyName:
      input.connection.tenantName ||
      input.tenantProfile?.tradeName ||
      input.connection.legalName ||
      input.tenantProfile?.legalName ||
      'tu empresa',
    roleInCompany: 'otro',
    roleInCompanyOther: null,
    businessSector: 'Actividad general',
    teamSize: null,
    website: null,
    phone: null,
    mainGoals: [],
    communicationStyle: 'spanish_clear_non_technical',
    likelyKnowledgeLevel: 'starter',
    onboardingCompletedAt: new Date().toISOString(),
  };
}

export default async function IsaakChatWorkspacePage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'isaak_chat';
  const handoff = readHandoff(resolved.handoff);
  const isFreshHoldedHandoff = Boolean(handoff?.profile);
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

  if (!connection?.keyMasked && !isFreshHoldedHandoff) {
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

  const effectiveCompleted = onboardingState.completed || Boolean(handoff?.profile);
  const effectiveProfile =
    onboardingState.profile ||
    handoff?.profile ||
    (effectiveCompleted
      ? buildFallbackProfile({
          session: { name: session.name, email: session.email },
          connection: {
            tenantName: connection?.tenantName ?? profile?.tradeName ?? null,
            legalName: connection?.legalName ?? profile?.legalName ?? null,
          },
          tenantProfile: profile,
        })
      : null);
  const effectiveInstructions = onboardingState.instructions || handoff?.instructions || null;

  if (!effectiveCompleted || !effectiveProfile) {
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
        tenantName:
          connection?.tenantName ?? profile?.tradeName ?? handoff?.profile?.companyName ?? null,
        legalName:
          connection?.legalName ?? profile?.legalName ?? handoff?.profile?.companyName ?? null,
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
      onboardingProfile={effectiveProfile}
      instructionProfile={effectiveInstructions}
      connectionPending={isFreshHoldedHandoff && !connection?.keyMasked}
      quickPrompts={
        effectiveProfile.mainGoals.length > 0
          ? buildSuggestedPrompts(effectiveProfile.mainGoals)
          : undefined
      }
    />
  );
}
