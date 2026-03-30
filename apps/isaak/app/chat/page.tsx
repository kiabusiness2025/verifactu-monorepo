import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { IsaakInstructionProfile, IsaakOnboardingProfile } from '@verifactu/integrations';
import { buildSuggestedPrompts, recordUsageEvent } from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  buildHoldedAuthUrl,
  buildHoldedProfileOnboardingUrl,
  ISAAK_PUBLIC_URL,
} from '@/app/lib/isaak-navigation';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
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

  const context = await loadIsaakBusinessContext({
    tenantId: session.tenantId,
    userId: session.userId,
    name: session.name,
    email: session.email,
  });

  const effectiveConnection = context.holded.connection || handoff?.connection || null;

  if (!effectiveConnection?.keyMasked && !isFreshHoldedHandoff) {
    redirect(buildHoldedProfileOnboardingUrl('isaak_chat_requires_holded', chatReturnUrl));
  }

  const effectiveCompleted = context.isaak.completed || Boolean(handoff?.profile);
  const effectiveProfile = context.isaak.profile || handoff?.profile || null;
  const effectiveInstructions = context.isaak.instructions || handoff?.instructions || null;
  const analyticsSummary = context.holded.analytics;

  if (!effectiveCompleted || !effectiveProfile) {
    redirect(buildHoldedProfileOnboardingUrl('isaak_chat_requires_profile', chatReturnUrl));
  }

  await recordUsageEvent({
    prisma,
    tenantId: session.tenantId,
    userId: session.userId,
    type: 'ISAAK_CHAT_OPENED',
    source: source || 'isaak_chat',
    path: '/chat',
    metadataJson: {
      freshConnection: isFreshHoldedHandoff,
      hasConnection: Boolean(effectiveConnection?.keyMasked),
      onboardingCompleted: effectiveCompleted,
    },
  }).catch((error) => {
    console.error('[isaak/chat] usage event write failed', error);
  });

  return (
    <IsaakWorkspaceClient
      session={{
        email: session.email,
        name: session.name,
        tenantId: session.tenantId,
        tenantName:
          effectiveConnection?.tenantName ??
          context.company.tradeName ??
          handoff?.profile?.companyName ??
          null,
        legalName:
          effectiveConnection?.legalName ??
          context.company.legalName ??
          handoff?.profile?.companyName ??
          null,
        taxId: effectiveConnection?.taxId ?? context.company.taxId ?? null,
        keyMasked: effectiveConnection?.keyMasked ?? null,
        connectedAt: effectiveConnection?.connectedAt ?? null,
        lastValidatedAt: effectiveConnection?.lastValidatedAt ?? null,
        supportedModules: effectiveConnection?.supportedModules ?? [],
        validationSummary: effectiveConnection?.validationSummary ?? null,
        phone: context.company.phone ?? effectiveProfile?.phone ?? null,
        representative: context.company.representative ?? null,
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
      analyticsSummary={analyticsSummary}
      connectionSettingsUrl="/settings?section=connections"
      settingsUrl="/settings"
    />
  );
}
