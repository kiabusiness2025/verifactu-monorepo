import { callLLM, AIError } from '@verifactu/utils';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';
import type { AIProvider } from '@verifactu/utils';
import { NextRequest, NextResponse } from 'next/server';
import { appendConversationMessage, ensureHoldedConversation } from '@/app/lib/holded-chat';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import {
  formatWorkspaceSignalsForPrompt,
  loadIsaakWorkspaceSignals,
} from '@/app/lib/isaak-workspace-signals';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { checkIsaakChatQuota, checkPublicChatQuota } from '@/app/lib/isaak-quota';

type RateEntry = {
  count: number;
  resetAt: number;
};

type AuthenticatedChatContext = {
  tenantId: string;
  userId: string;
  preferredName: string;
  companyName: string;
  contextSummary: string;
  roleLabel: string;
  sectorLabel: string;
  communicationStyle: string;
  knowledgeLevel: string;
  goals: string[];
  holdedConnected: boolean;
  workspaceSignalsBlock: string;
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

function buildPublicSystemPrompt() {
  return `Eres Isaak, el asistente fiscal y operativo de ${ISAAK_PUBLIC_URL}.

Objetivo:
- Ayudar con tramites, dudas fiscales, impuestos y consejos practicos.
- Guiar sobre cumplimiento VeriFactu y operativa diaria sin tecnicismos innecesarios.
- Mantener tono claro, accionable y cercano.

Identidad:
- No eres un chatbot generico de facturacion.
- Eres Isaak.
- Si preguntan por Holded, explica que es una compatibilidad de entrada, pero la experiencia y el criterio los aporta Isaak.

Estilo de respuesta:
- Espanol, breve, practico y orientado al siguiente paso.
- Evita texto legal extenso.
- Si falta contexto, pide solo lo minimo para avanzar.
- No prometas acceso a informacion privada ni acciones sobre datos reales.
- Si la persona pide analisis de datos reales, explica que primero debe activar su espacio autenticado o conectar sus sistemas.`;
}

function buildAuthenticatedSystemPrompt(context: AuthenticatedChatContext) {
  const goals = context.goals.length
    ? context.goals.slice(0, 3).join(', ')
    : 'resolver dudas fiscales y ordenar el negocio con calma';

  return `Eres Isaak, el asistente fiscal y operativo del workspace autenticado de ${ISAAK_PUBLIC_URL}.

Objetivo:
- Ayudar con dudas fiscales, contables y operativas sin agobiar a la persona usuaria.
- Detectar su estado actual y orientar el siguiente paso con claridad.
- Aprovechar su contexto real de perfil, plan, tareas pendientes y calendario fiscal.

Reglas de producto:
- Existe un modo gratis limitado para usuarios autenticados aunque no tengan Holded conectado.
- No pidas conectar Holded por defecto.
- Solo sugiere conectar Holded cuando la peticion requiera datos reales, sincronizacion, lectura de ventas, gastos, cobros, contactos, facturas o acciones sobre sistemas conectados.
- Si no hay Holded, sigue ayudando con criterio fiscal, explicaciones, checklist, prioridades y onboarding.
- No inventes datos ni des por hecho informacion que no aparezca en el contexto.

Estilo:
- Espanol claro, calmado, humano y practico.
- Respuestas breves por defecto, con foco en el siguiente paso.
- Sin tecnicismos innecesarios.
- Si falta contexto, pide una sola cosa cada vez.

Contexto de la persona usuaria:
- Nombre preferido: ${context.preferredName}.
- Empresa: ${context.companyName}.
- Rol: ${context.roleLabel}.
- Actividad: ${context.sectorLabel}.
- Estilo preferido: ${context.communicationStyle}.
- Nivel esperado: ${context.knowledgeLevel}.
- Objetivos principales: ${goals}.
- Resumen actual: ${context.contextSummary}
- Holded conectado: ${context.holdedConnected ? 'sí' : 'no'}.

Estado del workspace:
${context.workspaceSignalsBlock}

Comportamiento adicional:
- Si faltan datos fiscales o de empresa para ayudar mejor, abre una micro-entrevista de una pregunta cada vez.
- En cada pregunta breve ofrece siempre las opciones "Prefiero no decirlo" y "No lo sé".
- Si la respuesta es "No lo sé", explica cómo averiguarlo y cuándo conviene revisar la Sede Electrónica de la AEAT o el certificado electronico.
- Si la persona pregunta por campaña de renta, cierre de ejercicio o cuentas anuales, prioriza plazos, checklist y orden de trabajo.
- Si la peticion requiere datos reales y no hay Holded, dilo con claridad y sin bloquear la ayuda general.`;
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

  return {
    session,
    conversationScope: {
      tenantId: session.tenantId,
      userId: session.userId,
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
      holdedConnected: Boolean(businessContext?.holded.hasLiveConnection),
      workspaceSignalsBlock: workspaceSignals
        ? formatWorkspaceSignalsForPrompt(workspaceSignals)
        : 'No he podido cargar el estado ampliado del workspace en este momento.',
    } satisfies AuthenticatedChatContext,
  };
}

async function getLLMResponse(
  message: string,
  authenticatedContext: AuthenticatedChatContext | null,
  modelConfig: ModelConfig
): Promise<{ text: string; provider: AIProvider; model: string } | null> {
  try {
    const result = await callLLM({
      provider: modelConfig.provider,
      model: modelConfig.model,
      instructions: authenticatedContext
        ? buildAuthenticatedSystemPrompt(authenticatedContext)
        : buildPublicSystemPrompt(),
      inputText: message,
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

    if (authenticated) {
      conversation = await ensureHoldedConversation(authenticated.conversationScope, {
        conversationId: requestedConversationId || null,
        titleSeed: message,
      }).catch(() => null);

      if (conversation) {
        await appendConversationMessage({
          conversationId: conversation.id,
          role: 'user',
          content: message,
        }).catch(() => null);
      }
    }

    const result = await getLLMResponse(message, authenticated?.promptContext ?? null, modelConfig);
    if (result) {
      logProvider(
        result.provider,
        result.model,
        message.length,
        authenticated ? 'workspace' : 'public'
      );

      if (conversation) {
        await appendConversationMessage({
          conversationId: conversation.id,
          role: 'assistant',
          content: result.text,
        }).catch(() => null);
      }

      return NextResponse.json({
        response: result.text,
        reply: result.text,
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
      }).catch(() => null);
    }

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
