// Shared loader for the authenticated chat context. Extracted from
// /api/chat so /api/chat/stream (F5) can reuse it.

import { loadIsaakBusinessContext } from './isaak-business-context';
import {
  formatWorkspaceSignalsForPrompt,
  loadIsaakWorkspaceSignals,
} from './isaak-workspace-signals';
import { getHoldedSession } from './holded-session';
import { prisma } from './prisma';
import type { AuthenticatedChatContext } from './isaak-chat-prompts';
import type { IsaakToolContext } from './isaak-tools-registry';

export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

// We narrow `session` to NonNullable because loadAuthenticatedChatContext()
// returns null when there's no session at all — by the time you have an
// IsaakAuthenticatedChat, session is guaranteed.
type LoadedSession = NonNullable<Awaited<ReturnType<typeof getHoldedSession>>>;

export type IsaakAuthenticatedChat = {
  session: LoadedSession;
  conversationScope: { tenantId: string; userId: string };
  toolContext: IsaakToolContext;
  promptContext: AuthenticatedChatContext;
};

export function describeRole(value: string | null | undefined) {
  if (!value) return 'no definido';
  switch (value) {
    case 'autonomo':
      return 'autónomo';
    case 'administrador':
      return 'administrador';
    case 'gerente':
      return 'gerente';
    case 'financiero':
      return 'responsable financiero';
    default:
      return value;
  }
}

export async function loadTenantPlanCode(tenantId: string): Promise<PlanTier> {
  try {
    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      select: { plan: { select: { code: true } }, status: true },
      orderBy: { createdAt: 'desc' },
    });
    const code = sub?.plan?.code ?? 'free';
    if (sub?.status === 'trial') return 'pro';
    return code as PlanTier;
  } catch {
    return 'free';
  }
}

export async function loadAuthenticatedChatContext(): Promise<IsaakAuthenticatedChat | null> {
  const session = await getHoldedSession().catch(() => null);

  if (!session?.tenantId || !session.userId) {
    return null;
  }

  const businessContext = await loadIsaakBusinessContext(
    {
      tenantId: session.tenantId,
      userId: session.userId,
      name: session.name,
      email: session.email,
    },
    { includeSnapshot: false }
  ).catch(() => null);

  const workspaceSignals = await loadIsaakWorkspaceSignals({
    tenantId: session.tenantId,
    context: businessContext,
  }).catch(() => null);

  const SECTOR_PROVIDERS = [
    'hotelgest',
    'revo',
    'loyverse',
    'woocommerce',
    'prestashop',
    'mindbody',
    'inmovilla',
    'nubimed',
  ] as const;

  const [bankAccountCount, googleToken, microsoftToken, sectorCount] = await Promise.all([
    prisma.seAccount
      .count({ where: { tenantId: session.tenantId, status: 'active' } })
      .catch(() => 0),
    prisma.isaakGoogleToken
      .findFirst({
        where: { tenantId: session.tenantId, userId: session.userId },
        select: { id: true },
      })
      .catch(() => null),
    prisma.isaakMicrosoftToken
      .findFirst({
        where: { tenantId: session.tenantId, userId: session.userId },
        select: { id: true },
      })
      .catch(() => null),
    prisma.externalConnection
      .count({
        where: {
          tenantId: session.tenantId,
          provider: { in: [...SECTOR_PROVIDERS] },
          connectionStatus: 'connected',
        },
      })
      .catch(() => 0),
  ]);

  const holdedApiKey = businessContext?.holded?.connection?.apiKey ?? null;
  const holdedConnected = Boolean(businessContext?.holded.hasLiveConnection);

  return {
    session,
    conversationScope: {
      tenantId: session.tenantId,
      userId: session.userId,
    },
    toolContext: {
      tenantId: session.tenantId,
      userId: session.userId,
      holdedApiKey,
      holdedConnected,
      bankConnected: bankAccountCount > 0,
      googleConnected: Boolean(googleToken),
      microsoftConnected: Boolean(microsoftToken),
      sectorConnected: sectorCount > 0,
    },
    promptContext: {
      tenantId: session.tenantId,
      userId: session.userId,
      preferredName:
        businessContext?.isaak.profile?.preferredName ||
        businessContext?.labels.firstName ||
        session.name ||
        'la persona usuaria',
      companyName: businessContext?.labels.companyName || 'tu negocio',
      contextSummary:
        businessContext?.summary ||
        'Todavía falta parte del contexto del negocio, así que conviene guiar con preguntas breves.',
      roleLabel: describeRole(
        businessContext?.isaak.profile?.roleInCompanyOther ||
          businessContext?.isaak.profile?.roleInCompany ||
          null
      ),
      sectorLabel:
        businessContext?.company.sectorLabel ||
        businessContext?.company.sectorCode ||
        'sin definir',
      communicationStyle:
        businessContext?.isaak.instructions?.communicationStyle ||
        businessContext?.isaak.profile?.communicationStyle ||
        'spanish_clear_non_technical',
      knowledgeLevel:
        businessContext?.isaak.instructions?.likelyKnowledgeLevel ||
        businessContext?.isaak.profile?.likelyKnowledgeLevel ||
        'starter',
      goals: businessContext?.isaak.profile?.mainGoals || [],
      holdedConnected,
      workspaceSignalsBlock: workspaceSignals
        ? formatWorkspaceSignalsForPrompt(workspaceSignals)
        : 'No he podido cargar el estado ampliado del workspace en este momento.',
    },
  };
}

export function resolveModelForPlan(plan: PlanTier): { provider: 'anthropic'; model: string } {
  switch (plan) {
    case 'pro':
    case 'business':
    case 'enterprise':
      return { provider: 'anthropic', model: 'claude-sonnet-4-6' };
    default:
      return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
  }
}
