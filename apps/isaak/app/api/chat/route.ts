import { callLLM, AIError } from '@verifactu/utils';
import type { AIMessage, AIProvider } from '@verifactu/utils';
import { NextRequest, NextResponse } from 'next/server';
import {
  appendConversationMessage,
  ensureHoldedConversation,
  listRecentConversationMessages,
} from '@/app/lib/holded-chat';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import {
  formatWorkspaceSignalsForPrompt,
  loadIsaakWorkspaceSignals,
} from '@/app/lib/isaak-workspace-signals';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { checkIsaakChatQuota, checkPublicChatQuota } from '@/app/lib/isaak-quota';
import {
  detectClarificationResponse,
  recordChatMetric,
} from '@/app/lib/isaak-chat-metrics';
import {
  buildAuthenticatedSystemPrompt,
  buildPublicSystemPrompt,
  type AuthenticatedChatContext,
} from '@/app/lib/isaak-chat-prompts';
import {
  buildReadOnlyToolsForContext,
  type IsaakToolContext,
} from '@/app/lib/isaak-tools-registry';
import { runIsaakToolLoop } from '@/app/lib/isaak-tool-loop';

const SHORT_MEMORY_TURNS = 8;

type RateEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateStore = new Map<string, RateEntry>();

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = rateStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  rateStore.set(ip, current);
  return { limited: false, retryAfterSeconds: 0 };
}

function describeRole(value: string | null | undefined) {
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

type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

async function loadTenantPlanCode(tenantId: string): Promise<PlanTier> {
  try {
    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      select: { plan: { select: { code: true } }, status: true },
      orderBy: { createdAt: 'desc' },
    });
    const code = sub?.plan?.code ?? 'free';
    // Trial users get pro-level model access
    if (sub?.status === 'trial') return 'pro';
    return code as PlanTier;
  } catch {
    return 'free';
  }
}

type ModelConfig = { provider: AIProvider; model: string };

function resolveModelForPlan(plan: PlanTier): ModelConfig {
  switch (plan) {
    case 'pro':
    case 'business':
    case 'enterprise':
      return { provider: 'anthropic', model: 'claude-sonnet-4-6' };
    default:
      // free + starter: Haiku (fast, cheap); GPT-4o-mini as fallback
      return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
  }
}

function generateFallbackResponse(message: string, authenticated: boolean) {
  const normalized = message.toLowerCase();

  if (normalized.includes('precio') || normalized.includes('plan')) {
    return authenticated
      ? 'Puedo orientarte con el plan actual y con lo que tienes activo ahora mismo. Si quieres, te resumo qué cubre tu modo actual y cuándo merece la pena ampliar.'
      : 'Si quieres probar sin presión, este chat abierto te orienta. Cuando necesites trabajo con datos reales, activamos la experiencia completa en tu espacio.';
  }

  if (normalized.includes('holded') || normalized.includes('erp')) {
    return authenticated
      ? 'Puedo ayudarte aunque todavía no tengas Holded conectado. Solo te lo pediré cuando la pregunta necesite datos reales, sincronizaciones o acciones sobre tu negocio.'
      : 'Holded es una compatibilidad de entrada. Aquí te ayudo con criterio fiscal y operativo general, y al conectar un sistema pasamos a recomendaciones con datos reales.';
  }

  if (normalized.includes('verifactu') || normalized.includes('factura')) {
    return 'En simple: VeriFactu busca que la facturación sea trazable y más difícil de manipular. Si quieres, te lo explico con enfoque pyme y pasos prácticos.';
  }

  if (
    normalized.includes('gastos') ||
    normalized.includes('ventas') ||
    normalized.includes('cobros') ||
    normalized.includes('caja') ||
    normalized.includes('beneficio')
  ) {
    return authenticated
      ? 'Puedo ayudarte a ordenar qué revisar primero y qué dato te falta para decidir mejor. Si necesitas cifras reales, entonces sí te propondré conectar Holded.'
      : 'En este chat abierto no veo tus datos reales, pero sí puedo ayudarte con un plan claro: qué revisar primero, qué documentar y qué decisiones tomar antes de cerrar el periodo.';
  }

  return 'Soy Isaak. Puedo ayudarte con trámites, dudas fiscales, impuestos y decisiones prácticas en lenguaje claro. Cuéntame tu caso y te propongo el siguiente paso.';
}

function logProvider(
  provider: AIProvider | 'fallback',
  model: string,
  messageLength: number,
  mode: 'public' | 'workspace'
) {
  console.info('[Isaak Chat] provider_selected', {
    provider,
    model,
    messageLength,
    mode,
    timestamp: new Date().toISOString(),
  });
}

async function loadAuthenticatedChatContext() {
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

  const [bankAccountCount, googleToken, microsoftToken] = await Promise.all([
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
    } satisfies IsaakToolContext,
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
      holdedConnected: Boolean(businessContext?.holded.hasLiveConnection),
      workspaceSignalsBlock: workspaceSignals
        ? formatWorkspaceSignalsForPrompt(workspaceSignals)
        : 'No he podido cargar el estado ampliado del workspace en este momento.',
    } satisfies AuthenticatedChatContext,
  };
}

type LLMResult = {
  text: string;
  provider: AIProvider;
  model: string;
  latencyMs?: number;
  usage?: { inputTokens: number; outputTokens: number };
};

async function getLLMResponse(
  message: string,
  history: AIMessage[],
  authenticatedContext: AuthenticatedChatContext | null,
  modelConfig: ModelConfig
): Promise<LLMResult | null> {
  try {
    const messages: AIMessage[] = [...history, { role: 'user', content: message }];

    const result = await callLLM({
      provider: modelConfig.provider,
      model: modelConfig.model,
      instructions: authenticatedContext
        ? buildAuthenticatedSystemPrompt(authenticatedContext)
        : buildPublicSystemPrompt(),
      messages,
      temperature: authenticatedContext ? 0.45 : 0.5,
      maxOutputTokens: authenticatedContext ? 550 : 450,
      feature: authenticatedContext ? 'workspace_chat_free' : 'public_chat',
      enableFallback: true,
    });
    return result;
  } catch (error) {
    if (error instanceof AIError) {
      console.error('[Isaak Chat] AI error:', {
        kind: error.kind,
        provider: error.provider,
        message: error.message,
      });
    } else {
      console.error('[Isaak Chat] Unexpected error:', error);
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rate = isRateLimited(ip);

  if (rate.limited) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo en un momento.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const requestedConversationId =
      typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Mensaje demasiado largo.' }, { status: 400 });
    }

    const authenticated = await loadAuthenticatedChatContext();

    // --- Quota check ---
    if (authenticated) {
      const quota = await checkIsaakChatQuota(authenticated.session.tenantId);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: 'daily_limit_reached',
            message: quota.message,
            resetsAt: quota.resetsAt,
            ctaUrl: '/pricing',
          },
          { status: 429 }
        );
      }
    } else {
      const quota = checkPublicChatQuota(ip);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: 'daily_limit_reached',
            message: quota.message,
            resetsAt: quota.resetsAt,
            ctaUrl: '/auth',
          },
          { status: 429 }
        );
      }
    }

    // --- Plan-based model selection ---
    const planCode = authenticated
      ? await loadTenantPlanCode(authenticated.session.tenantId)
      : 'free';
    const modelConfig = resolveModelForPlan(planCode);

    let conversation: Awaited<ReturnType<typeof ensureHoldedConversation>> | null = null;
    let history: AIMessage[] = [];

    if (authenticated) {
      conversation = await ensureHoldedConversation(authenticated.conversationScope, {
        conversationId: requestedConversationId || null,
        titleSeed: message,
      }).catch(() => null);

      if (conversation) {
        // Load short-term memory BEFORE persisting the new user message so we
        // don't duplicate it in the prompt.
        history = await listRecentConversationMessages(conversation.id, SHORT_MEMORY_TURNS).catch(
          () => []
        );

        await appendConversationMessage({
          conversationId: conversation.id,
          role: 'user',
          content: message,
        }).catch(() => null);
      }
    }

    // F2: if the tenant has at least one integration connected, run the
    // tool-calling loop so the LLM can fetch real data. Otherwise keep the
    // F1 single-shot flow (still valuable for fiscal advice without data).
    const toolContext = authenticated?.toolContext ?? null;
    const tools = toolContext ? buildReadOnlyToolsForContext(toolContext) : [];
    const useToolLoop = Boolean(authenticated?.promptContext && tools.length > 0);

    let result: LLMResult | null;
    let toolNamesUsed: string[] = [];
    let iterations = 0;

    if (useToolLoop && authenticated && toolContext) {
      const loop = await runIsaakToolLoop({
        systemPrompt: buildAuthenticatedSystemPrompt(authenticated.promptContext),
        history,
        userMessage: message,
        tools,
        context: toolContext,
        model: modelConfig.model,
        provider: modelConfig.provider,
        feature: 'workspace_chat_tools',
        maxOutputTokens: 1200,
      });
      result = loop.text
        ? {
            text: loop.text,
            provider: loop.provider,
            model: loop.model,
            latencyMs: loop.totalLatencyMs,
            usage: loop.totalUsage,
          }
        : null;
      toolNamesUsed = loop.toolNames;
      iterations = loop.iterations;
      if (!result) {
        console.warn('[Isaak Chat] tool loop returned empty text', {
          iterations: loop.iterations,
          stopped: loop.stoppedReason,
        });
      }
    } else {
      result = await getLLMResponse(
        message,
        history,
        authenticated?.promptContext ?? null,
        modelConfig
      );
    }

    if (result) {
      logProvider(
        result.provider,
        result.model,
        message.length,
        authenticated ? 'workspace' : 'public'
      );

      const isClarification = detectClarificationResponse(result.text);
      const isFallback = result.provider !== modelConfig.provider;

      if (conversation) {
        await appendConversationMessage({
          conversationId: conversation.id,
          role: 'assistant',
          content: result.text,
          metadata: {
            provider: result.provider,
            model: result.model,
            latencyMs: result.latencyMs ?? null,
            isClarification,
            isFallback,
            toolCallsCount: toolNamesUsed.length,
            toolNames: toolNamesUsed,
            iterations,
          },
        }).catch(() => null);
      }

      await recordChatMetric({
        tenantId: authenticated?.session.tenantId ?? null,
        userId: authenticated?.session.userId ?? null,
        conversationId: conversation?.id ?? null,
        provider: result.provider,
        modelUsed: result.model,
        feature: useToolLoop
          ? 'workspace_chat_tools'
          : authenticated
            ? 'workspace_chat_free'
            : 'public_chat',
        usage: result.usage,
        latencyMs: result.latencyMs ?? null,
        toolCalls: toolNamesUsed,
        isClarification,
        isFallback,
        historyTurns: history.length,
      }).catch((err) => {
        console.error('[Isaak Chat] recordChatMetric failed', err);
      });

      return NextResponse.json({
        response: result.text,
        reply: result.text,
        isClarification,
        conversation: conversation
          ? { id: conversation.id, title: conversation.title ?? '' }
          : null,
      });
    }

    const fallback = generateFallbackResponse(message, Boolean(authenticated));
    logProvider('fallback', 'rule-based', message.length, authenticated ? 'workspace' : 'public');

    if (conversation) {
      await appendConversationMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: fallback,
        metadata: { provider: 'fallback', model: 'rule-based', isFallback: true },
      }).catch(() => null);
    }

    await recordChatMetric({
      tenantId: authenticated?.session.tenantId ?? null,
      userId: authenticated?.session.userId ?? null,
      conversationId: conversation?.id ?? null,
      provider: 'fallback',
      modelUsed: 'rule-based',
      feature: authenticated ? 'workspace_chat_free' : 'public_chat',
      isFallback: true,
      historyTurns: history.length,
      errorCode: 'llm_unavailable',
    }).catch((err) => {
      console.error('[Isaak Chat] recordChatMetric failed', err);
    });

    return NextResponse.json({
      response: fallback,
      reply: fallback,
      conversation: conversation ? { id: conversation.id, title: conversation.title ?? '' } : null,
    });
  } catch (error) {
    console.error('[Isaak Chat]', error);
    return NextResponse.json({ response: generateFallbackResponse('', false) });
  }
}
