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
import IsaakChatRecovery from './IsaakChatRecovery';
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

function readBooleanFlag(value: string | string[] | undefined) {
  return readSource(value) === '1';
}

function readHandoff(value: string | string[] | undefined): {
  profile: IsaakOnboardingProfile;
  instructions: IsaakInstructionProfile | null;
  connection: {
    status: string | null;
    keyMasked: string | null;
    connectedAt: string | null;
    lastValidatedAt: string | null;
    supportedModules: string[];
    validationSummary: string | null;
    tenantName: string | null;
    legalName: string | null;
    taxId: string | null;
  } | null;
} | null {
  const raw = readSource(value);
  if (!raw) return null;

  try {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as {
      profile?: IsaakOnboardingProfile | null;
      instructions?: IsaakInstructionProfile | null;
      connection?: {
        status?: string | null;
        keyMasked?: string | null;
        connectedAt?: string | null;
        lastValidatedAt?: string | null;
        supportedModules?: string[];
        validationSummary?: string | null;
        tenantName?: string | null;
        legalName?: string | null;
        taxId?: string | null;
      } | null;
    };

    if (!parsed?.profile) return null;
    return {
      profile: parsed.profile,
      instructions: parsed.instructions ?? null,
      connection: parsed.connection
        ? {
            status: parsed.connection.status ?? null,
            keyMasked: parsed.connection.keyMasked ?? null,
            connectedAt: parsed.connection.connectedAt ?? null,
            lastValidatedAt: parsed.connection.lastValidatedAt ?? null,
            supportedModules: Array.isArray(parsed.connection.supportedModules)
              ? parsed.connection.supportedModules
              : [],
            validationSummary: parsed.connection.validationSummary ?? null,
            tenantName: parsed.connection.tenantName ?? null,
            legalName: parsed.connection.legalName ?? null,
            taxId: parsed.connection.taxId ?? null,
          }
        : null,
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
  const freshConnection = readBooleanFlag(resolved.freshConnection);
  const isFreshHoldedHandoff = Boolean(handoff?.profile) || freshConnection;
  const chatReturnUrl = `${ISAAK_PUBLIC_URL}/chat?source=${encodeURIComponent(source)}`;

  let session: Awaited<ReturnType<typeof getHoldedSession>> | null = null;
  try {
    session = await getHoldedSession();
  } catch (error) {
    console.error('[isaak/chat] session resolution failed', error);
    return (
      <IsaakChatRecovery
        title="No he podido recuperar tu acceso a Isaak"
        description="Tu cuenta puede estar entre dos pasos de autenticacion o con una sesion compartida a medias. Repite el acceso y deberias poder continuar."
        primaryHref={buildHoldedAuthUrl('isaak_chat_requires_session', chatReturnUrl)}
        primaryLabel="Volver a acceder"
        secondaryHref={buildHoldedProfileOnboardingUrl('isaak_chat_recovery', chatReturnUrl)}
        secondaryLabel="Revisar conexion y perfil"
        supportHref="/support?source=isaak_chat_recovery"
      />
    );
  }

  if (!session?.tenantId || !session.userId) {
    redirect(buildHoldedAuthUrl('isaak_chat_requires_session', chatReturnUrl));
  }

  const [connection, profile] = await Promise.all([
    getHoldedConnection(session.tenantId).catch((error) => {
      console.error('[isaak/chat] holded connection read failed', error);
      return null;
    }),
    prisma.tenantProfile
      .findUnique({
        where: { tenantId: session.tenantId },
        select: {
          representative: true,
          tradeName: true,
          legalName: true,
        },
      })
      .catch((error) => {
        console.error('[isaak/chat] tenant profile read failed', error);
        return null;
      }),
  ]);

  const effectiveConnection = connection || handoff?.connection || null;

  if (!effectiveConnection?.keyMasked && !isFreshHoldedHandoff) {
    redirect(buildHoldedProfileOnboardingUrl('isaak_chat_requires_holded', chatReturnUrl));
  }

  const onboardingState = await getIsaakOnboardingState({
    prisma,
    tenantId: session.tenantId,
    userId: session.userId,
  }).catch((error) => {
    console.error('[isaak/chat] onboarding state read failed', error);
    return {
      completed: false,
      profile: null,
      draft: null,
      instructions: null,
    };
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
    redirect(buildHoldedProfileOnboardingUrl('isaak_chat_requires_profile', chatReturnUrl));
  }

  return (
    <IsaakWorkspaceClient
      session={{
        email: session.email,
        name: session.name,
        tenantId: session.tenantId,
        tenantName:
          effectiveConnection?.tenantName ??
          profile?.tradeName ??
          handoff?.profile?.companyName ??
          null,
        legalName:
          effectiveConnection?.legalName ??
          profile?.legalName ??
          handoff?.profile?.companyName ??
          null,
        taxId: effectiveConnection?.taxId ?? null,
        keyMasked: effectiveConnection?.keyMasked ?? null,
        connectedAt: effectiveConnection?.connectedAt ?? null,
        lastValidatedAt: effectiveConnection?.lastValidatedAt ?? null,
        supportedModules: effectiveConnection?.supportedModules ?? [],
        validationSummary: effectiveConnection?.validationSummary ?? null,
        phone: effectiveProfile?.phone ?? null,
        representative: profile?.representative ?? null,
        isAdmin: false,
      }}
      onboardingProfile={effectiveProfile}
      instructionProfile={effectiveInstructions}
      connectionPending={isFreshHoldedHandoff && !effectiveConnection?.keyMasked}
      quickPrompts={
        effectiveProfile.mainGoals.length > 0
          ? buildSuggestedPrompts(effectiveProfile.mainGoals)
          : undefined
      }
      connectionSettingsUrl={buildHoldedProfileOnboardingUrl('isaak_chat_settings', chatReturnUrl)}
    />
  );
}
