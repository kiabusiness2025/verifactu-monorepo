// Demo streaming chat — /api/demo/chat/stream
//
// Igual que /api/chat/stream pero:
//   • Usa el contexto de la empresa demo (Nova Gestión, HOLDED_DEMO_API_KEY)
//   • El userId/tenantId real del usuario se mantiene para conversación y métricas
//   • allowWrites = false siempre (modo sandbox, nunca modifica datos demo)
//   • Sin RAG ni few-shot (la empresa demo no tiene historial de usuario)
//   • Cuota independiente: 20 msgs/día en feature='demo_chat'
//
// ⚠️ ALINEACIÓN CON /api/chat/stream:
//   El frontend ya está alineado — ambas rutas usan IsaakChatSection (mismo
//   componente, streamEndpoint diferente). Para el backend, cuando se añada
//   una funcionalidad significativa a /api/chat/stream, evaluar si debe
//   replicarse aquí:
//     • Nuevos eventos SSE (artifact, tool-use-result, etc.) → sí, automático vía streamIsaakChat
//     • Nuevas tool categories → depende (demo solo Holded read)
//     • RAG / few-shot para la empresa demo → no necesario (no hay historial)
//     • Sub-agentes → considerar si añade valor al demo

import { NextRequest } from 'next/server';
import {
  appendConversationMessage,
  ensureHoldedConversation,
  listRecentConversationMessages,
} from '@/app/lib/holded-chat';
import { detectClarificationResponse, recordChatMetric } from '@/app/lib/isaak-chat-metrics';
import { buildAuthenticatedSystemPrompt } from '@/app/lib/isaak-chat-prompts';
import { buildReadOnlyToolsForContext } from '@/app/lib/isaak-tools-registry';
import { classifyIntent } from '@/app/lib/isaak-intent-classifier';
import { resolveModelForPlan } from '@/app/lib/isaak-chat-context';
import { streamIsaakChat, type ChatStreamMetrics } from '@/app/lib/isaak-chat-stream';
import {
  loadDemoChatContext,
  checkDemoQuota,
  DEMO_COMPANY_NAME,
} from '@/app/lib/isaak-demo-context';

const SHORT_MEMORY_TURNS = 8;
const DEMO_SYSTEM_SUFFIX = `\n\n[MODO DEMO] Estás mostrando Isaak con datos de ${DEMO_COMPANY_NAME}. No ejecutes acciones de escritura. Al final de respuestas útiles puedes mencionar brevemente que el usuario puede conectar su propio Holded para ver sus datos reales.`;

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

function singleEvent(event: string, data: object): Response {
  return new Response(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`, {
    headers: sseHeaders(),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return singleEvent('error', { message: 'invalid_json' });
  }

  const message =
    body &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).message === 'string'
      ? (body as { message: string }).message.trim()
      : '';
  const requestedConversationId =
    body &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).conversationId === 'string'
      ? (body as { conversationId: string }).conversationId.trim() || null
      : null;

  if (!message) return singleEvent('error', { message: 'empty_message' });
  if (message.length > 1000) return singleEvent('error', { message: 'message_too_long' });

  const demo = await loadDemoChatContext();
  if (!demo) {
    return singleEvent('error', { message: 'unauthenticated' });
  }

  // Demo quota (independent from plan quota)
  const quota = await checkDemoQuota(demo.session.userId!);
  if (!quota.allowed) {
    return singleEvent('error', {
      message: `Has alcanzado el límite de ${quota.used} mensajes diarios en la demo. Reinicia mañana o conecta tu Holded para usar Isaak sin límites.`,
      code: 'demo_limit_reached',
      resetsAt: quota.resetsAt,
    });
  }

  // Pro model for demo (good first impression)
  const modelConfig = resolveModelForPlan('pro');

  // Per-user demo conversation history
  const conversation = await ensureHoldedConversation(demo.conversationScope, {
    conversationId: requestedConversationId,
    titleSeed: message,
  }).catch(() => null);

  let history: { role: 'user' | 'assistant'; content: string }[] = [];
  if (conversation) {
    history = await listRecentConversationMessages(conversation.id, SHORT_MEMORY_TURNS).catch(
      () => []
    );
    await appendConversationMessage({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    }).catch(() => null);
  }

  // Intent classifier (reuse same logic)
  const classification = await classifyIntent({
    message,
    history,
    context: {
      holdedConnected: true,
      bankConnected: false,
      googleConnected: false,
      microsoftConnected: false,
      sectorConnected: false,
    },
  });

  // Only Holded read tools + fiscal corpus (no banking, google, microsoft, sector, no writes)
  const tools = buildReadOnlyToolsForContext(demo.toolContext, {
    only: ['holded'],
    allowWrites: false,
  });

  const systemPrompt =
    buildAuthenticatedSystemPrompt(demo.promptContext, {
      factsBlock: undefined,
      fewShotBlock: undefined,
    }) + DEMO_SYSTEM_SUFFIX;

  const { stream, metricsPromise } = streamIsaakChat({
    systemPrompt,
    history,
    userMessage: message,
    tools,
    context: demo.toolContext,
    model: modelConfig.model,
    allowWrites: false,
    maxTokens: 1200,
  });

  const persistAndMetric = async (metrics: ChatStreamMetrics | null, text: string) => {
    if (conversation && text) {
      await appendConversationMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: text,
        metadata: { provider: 'anthropic', model: modelConfig.model, stream: true },
      }).catch(() => null);
    }
    await recordChatMetric({
      tenantId: demo.session.tenantId,
      userId: demo.session.userId,
      conversationId: conversation?.id ?? null,
      provider: 'anthropic',
      modelUsed: modelConfig.model,
      feature: 'demo_chat',
      usage: metrics
        ? { inputTokens: metrics.inputTokens, outputTokens: metrics.outputTokens }
        : undefined,
      latencyMs: metrics?.totalLatencyMs ?? 0,
      firstTokenMs: metrics?.firstTokenMs ?? null,
      toolCalls: metrics?.toolNames ?? [],
      isClarification: detectClarificationResponse(text),
      isFallback: false,
      historyTurns: history.length,
      classifierModel: classification.modelUsed,
      classifierLatencyMs: classification.latencyMs,
      routedTo: tools.length > 0 ? 'sonnet_with_tools' : 'sonnet_no_tools',
      ambiguityType: classification.ambiguityType,
      judgeInvocations: 0,
      judgeBlocks: 0,
      judgeLatencyMs: null,
      writeTools: [],
      factsRetrieved: 0,
      ragLatencyMs: 0,
      ragTopSimilarity: null,
      fewShotInjected: 0,
      fewShotLatencyMs: 0,
      fewShotTopSimilarity: null,
      subAgent: null,
      inspectorRuns: 0,
      inspectorBlocks: 0,
      inspectorWarnings: 0,
    }).catch((err) => console.error('[demo/chat/stream] recordChatMetric failed', err));
  };

  metricsPromise
    .then((m) => persistAndMetric(m, m.text))
    .catch((err) => console.error('[demo/chat/stream] post-stream failed', err));

  const enc = new TextEncoder();
  const convChunk = enc.encode(
    `event: conversation\ndata: ${JSON.stringify({ id: conversation?.id ?? null })}\n\n`
  );
  const wrapped = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(convChunk);
      const reader = stream.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          break;
        }
        controller.enqueue(value);
      }
    },
  });

  return new Response(wrapped, { headers: sseHeaders() });
}
