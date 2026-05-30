// F5 streaming chat endpoint.
//
// Returns Server-Sent Events. Same auth + classifier + tool wiring as the
// JSON /api/chat endpoint, but the LLM response streams token-by-token to
// the client.
//
// Routing:
//   - clarify_direct  → emit a single `text-delta` with the clarify JSON
//                       and a `done` event. No Anthropic stream call.
//   - sonnet_*        → stream via Anthropic Messages API; tool calls are
//                       executed between turns and reported as
//                       tool-use-start / tool-use-result events.

import { NextRequest } from 'next/server';
import {
  appendConversationMessage,
  ensureHoldedConversation,
  listRecentConversationMessages,
} from '@/app/lib/holded-chat';
import { checkIsaakChatQuota } from '@/app/lib/isaak-quota';
import { detectClarificationResponse, recordChatMetric } from '@/app/lib/isaak-chat-metrics';
import { buildAuthenticatedSystemPrompt } from '@/app/lib/isaak-chat-prompts';
import { buildReadOnlyToolsForContext } from '@/app/lib/isaak-tools-registry';
import { classifyIntent } from '@/app/lib/isaak-intent-classifier';
import {
  loadAuthenticatedChatContext,
  loadTenantPlanCode,
  resolveModelForPlan,
} from '@/app/lib/isaak-chat-context';
import { streamIsaakChat, type ChatStreamMetrics } from '@/app/lib/isaak-chat-stream';
import { retrieveFactsForChat } from '@/app/lib/isaak-rag';
import { retrieveFewShotForChat } from '@/app/lib/isaak-few-shot';
import { getSubAgent, pickSubAgent, type SubAgentId } from '@/app/lib/isaak-sub-agents';
import { isWriteTokenEnforced, verifyWriteToken } from '@/app/lib/isaak-write-token';

const SHORT_MEMORY_TURNS = 8;

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

function singleEventResponse(event: string, data: object): Response {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new Response(payload, { headers: sseHeaders() });
}

function clarifyStreamResponse(input: {
  text: string;
  classifierModel: string;
  classifierLatencyMs: number;
}): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        enc.encode(`event: text-delta\ndata: ${JSON.stringify({ delta: input.text })}\n\n`)
      );
      controller.enqueue(
        enc.encode(
          `event: done\ndata: ${JSON.stringify({
            firstTokenMs: 0,
            totalLatencyMs: input.classifierLatencyMs,
            stopReason: 'clarify_direct',
            classifierModel: input.classifierModel,
            isClarification: true,
          })}\n\n`
        )
      );
      controller.close();
    },
  });
  return new Response(body, { headers: sseHeaders() });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return singleEventResponse('error', { message: 'invalid_json' });
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
  // SEC C5: token de autorización de escrituras (opcional). Sin token
  // válido, allowWrites se fuerza a false aunque el classifier diga lo
  // contrario.
  const writeToken =
    body &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).writeToken === 'string'
      ? (body as { writeToken: string }).writeToken.trim()
      : '';

  if (!message) {
    return singleEventResponse('error', { message: 'empty_message' });
  }
  if (message.length > 1000) {
    return singleEventResponse('error', { message: 'message_too_long' });
  }

  const authenticated = await loadAuthenticatedChatContext();
  if (!authenticated) {
    return singleEventResponse('error', { message: 'unauthenticated' });
  }

  // Quota check
  const quota = await checkIsaakChatQuota(authenticated.session.tenantId);
  if (!quota.allowed) {
    return singleEventResponse('error', {
      message: quota.message,
      code: 'daily_limit_reached',
      resetsAt: quota.resetsAt,
    });
  }

  const planCode = await loadTenantPlanCode(authenticated.session.tenantId);
  const modelConfig = resolveModelForPlan(planCode);

  // Conversation + short-term memory
  const conversation = await ensureHoldedConversation(authenticated.conversationScope, {
    conversationId: requestedConversationId,
    titleSeed: message,
  }).catch(() => null);

  let history: { role: 'user' | 'assistant'; content: string }[] = [];
  // V1.3.3 — Summary de turnos antiguos (compactación). Para conversaciones
  // largas, los turnos viejos se han comprimido en una sola entrada que se
  // inyecta al system prompt — los últimos SHORT_MEMORY_TURNS van en raw.
  let conversationSummaryBlock = '';
  if (conversation) {
    const [recent, summary] = await Promise.all([
      listRecentConversationMessages(conversation.id, SHORT_MEMORY_TURNS).catch(() => []),
      import('@/app/lib/isaak-conversation-summarizer')
        .then((mod) => mod.loadConversationSummary(conversation.id))
        .catch(() => null),
    ]);
    history = recent;
    if (summary) {
      const { formatSummaryForPrompt } = await import('@/app/lib/isaak-conversation-summarizer');
      conversationSummaryBlock = formatSummaryForPrompt(summary);
    }
    await appendConversationMessage({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    }).catch(() => null);
  }

  // F7: classifier + RAG facts + few-shot examples in parallel.
  const [classification, ragResult, fewShotResult] = await Promise.all([
    classifyIntent({
      message,
      history,
      context: {
        holdedConnected: authenticated.toolContext.holdedConnected,
        bankConnected: authenticated.toolContext.bankConnected,
        googleConnected: authenticated.toolContext.googleConnected,
        microsoftConnected: authenticated.toolContext.microsoftConnected,
        sectorConnected: authenticated.toolContext.sectorConnected,
      },
    }),
    retrieveFactsForChat({
      tenantId: authenticated.session.tenantId,
      queryText: message,
    }),
    retrieveFewShotForChat({
      tenantId: authenticated.session.tenantId,
      queryText: message,
    }),
  ]);

  const persistAndMetric = async (input: {
    text: string;
    metrics: ChatStreamMetrics | null;
    routedTo: 'clarify_direct' | 'sonnet_no_tools' | 'sonnet_with_tools' | 'fallback';
    feature: string;
    isClarification: boolean;
  }) => {
    const usage = input.metrics
      ? { inputTokens: input.metrics.inputTokens, outputTokens: input.metrics.outputTokens }
      : undefined;
    if (conversation && input.text) {
      await appendConversationMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: input.text,
        metadata: {
          provider: 'anthropic',
          model: input.metrics?.text ? modelConfig.model : classification.modelUsed,
          stream: true,
          firstTokenMs: input.metrics?.firstTokenMs ?? null,
          isClarification: input.isClarification,
        },
      }).catch(() => null);
    }
    await recordChatMetric({
      tenantId: authenticated.session.tenantId,
      userId: authenticated.session.userId,
      conversationId: conversation?.id ?? null,
      provider: 'anthropic',
      modelUsed: input.metrics ? modelConfig.model : classification.modelUsed,
      feature: input.feature,
      usage,
      latencyMs: input.metrics?.totalLatencyMs ?? classification.latencyMs,
      firstTokenMs: input.metrics?.firstTokenMs ?? null,
      toolCalls: input.metrics?.toolNames ?? [],
      isClarification: input.isClarification,
      isFallback: false,
      historyTurns: history.length,
      classifierModel: classification.modelUsed,
      classifierLatencyMs: classification.latencyMs,
      routedTo: input.routedTo,
      ambiguityType: classification.ambiguityType,
      judgeInvocations: input.metrics?.judgeInvocations ?? 0,
      judgeBlocks: input.metrics?.judgeBlocks ?? 0,
      judgeLatencyMs: input.metrics?.judgeTotalLatencyMs ?? null,
      writeTools: input.metrics?.writeToolNames ?? [],
      factsRetrieved: ragResult.factsRetrieved,
      ragLatencyMs: ragResult.latencyMs,
      ragTopSimilarity: ragResult.topSimilarity,
      fewShotInjected: fewShotResult.injected,
      fewShotLatencyMs: fewShotResult.latencyMs,
      fewShotTopSimilarity: fewShotResult.topSimilarity,
      subAgent: subAgentId,
      inspectorRuns: input.metrics?.inspectorRuns ?? 0,
      inspectorBlocks: input.metrics?.inspectorBlocks ?? 0,
      inspectorWarnings: input.metrics?.inspectorWarnings ?? 0,
    }).catch((err) => {
      console.error('[Isaak Chat Stream] recordChatMetric failed', err);
    });
  };

  // Clarify direct (no LLM stream needed)
  if (classification.ambiguous && classification.suggestedClarification) {
    const clarifyText = JSON.stringify({
      clarify: true,
      question: classification.suggestedClarification,
      options: classification.suggestedOptions ?? [],
    });
    await persistAndMetric({
      text: clarifyText,
      metrics: null,
      routedTo: 'clarify_direct',
      feature: 'workspace_chat_stream',
      isClarification: true,
    });
    return clarifyStreamResponse({
      text: clarifyText,
      classifierModel: classification.modelUsed,
      classifierLatencyMs: classification.latencyMs,
    });
  }

  // F8: optionally route to a sub-agent for fiscal queries.
  const subAgentId: SubAgentId | null = pickSubAgent({
    message,
    classifierCategories: classification.relevantCategories,
    hasWriteIntent: classification.hasWriteIntent,
  });

  // Decide tools
  let tools: ReturnType<typeof buildReadOnlyToolsForContext> = [];
  let routedTo: 'sonnet_no_tools' | 'sonnet_with_tools' = 'sonnet_no_tools';
  let allowWrites = false;

  // F12: en main chat (no sub-agent) siempre añadimos las tools de
  // ledger (incluyen inspector_consult e inspector_search_aeat) aunque
  // el classifier diga needsTools=false. El LLM decide si invocarlas.
  // Esto permite que consultas informativas fiscales se beneficien
  // del Inspector (citas BOE) sin requerir cambios al classifier.
  const wantsTools =
    (classification.needsTools && classification.relevantCategories.length > 0) || !subAgentId;
  if (wantsTools) {
    // SEC C5 (2026): allowWrites NO se decide únicamente por el LLM
    // classifier. Para que se habilite hace falta que el cliente
    // adjunte un writeToken HMAC válido. Si se quiere endurecer la
    // política a producción, setear ISAAK_WRITES_REQUIRE_TOKEN=true:
    //   * con la flag: writes solo con token válido (cero confianza
    //     en el classifier para autorización)
    //   * sin la flag: comportamiento legacy (classifier decide) +
    //     warn por console.warn para detectar invocaciones en log
    const classifierSaysWrite = classification.hasWriteIntent;
    let tokenValid = false;
    const sessUserId = authenticated.session.userId;
    const sessTenantId = authenticated.session.tenantId;
    if (writeToken && sessUserId && sessTenantId) {
      const v = verifyWriteToken(writeToken, {
        userId: sessUserId,
        tenantId: sessTenantId,
      });
      tokenValid = v.ok;
    }
    if (isWriteTokenEnforced()) {
      allowWrites = tokenValid;
      if (classifierSaysWrite && !tokenValid) {
        console.warn('[chat/stream] write intent suprimido: token ausente o inválido', {
          userId: authenticated.session.userId,
          hasToken: Boolean(writeToken),
        });
      }
    } else {
      allowWrites = classifierSaysWrite;
      if (classifierSaysWrite && !tokenValid) {
        console.warn('[chat/stream] write intent SIN token (legacy mode)', {
          userId: authenticated.session.userId,
        });
      }
    }
    const mainCategories = classification.relevantCategories.includes('ledger')
      ? classification.relevantCategories
      : ([
          ...classification.relevantCategories,
          'ledger',
        ] as typeof classification.relevantCategories);
    const onlyCategories = subAgentId ? getSubAgent(subAgentId).toolCategories : mainCategories;
    const filtered = buildReadOnlyToolsForContext(authenticated.toolContext, {
      only: onlyCategories,
      allowWrites,
    });
    if (filtered.length > 0) {
      tools = filtered;
      routedTo = 'sonnet_with_tools';
    }
  }

  const summarySuffix = conversationSummaryBlock ? `\n\n${conversationSummaryBlock}` : '';
  const systemPrompt = subAgentId
    ? `${getSubAgent(subAgentId).systemPrompt}${
        ragResult.factsBlock ? `\n\n${ragResult.factsBlock.trim()}` : ''
      }${fewShotResult.examplesBlock ? `\n\n${fewShotResult.examplesBlock.trim()}` : ''}${summarySuffix}`
    : `${buildAuthenticatedSystemPrompt(authenticated.promptContext, {
        factsBlock: ragResult.factsBlock,
        fewShotBlock: fewShotResult.examplesBlock,
      })}${summarySuffix}`;

  const { stream, metricsPromise } = streamIsaakChat({
    systemPrompt,
    history,
    userMessage: message,
    tools,
    context: authenticated.toolContext,
    model: modelConfig.model,
    allowWrites,
    maxTokens: subAgentId ? getSubAgent(subAgentId).maxOutputTokens : 1500,
  });

  // Fire-and-forget metrics + persistence after the stream finishes.
  metricsPromise
    .then(async (metrics) => {
      await persistAndMetric({
        text: metrics.text,
        metrics,
        routedTo,
        feature: allowWrites ? 'workspace_chat_stream_write' : 'workspace_chat_stream',
        isClarification: detectClarificationResponse(metrics.text),
      });
      // V1.3.2 — Auto-memoria. Tras responder, intentamos extraer hechos
      // memorables del turno y persistirlos. No bloquea ni afecta al usuario.
      try {
        const { autoExtractAndStoreFacts } = await import('@/app/lib/isaak-memory-extractor');
        const result = await autoExtractAndStoreFacts({
          tenantId: authenticated.toolContext.tenantId,
          userId: authenticated.toolContext.userId,
          conversationId: conversation?.id ?? null,
          userMessage: message,
          assistantText: metrics.text,
        });
        if (result.inserted > 0 || result.error) {
          console.info('[Isaak Auto-Memory]', {
            tenantId: authenticated.toolContext.tenantId,
            ...result,
          });
        }
      } catch (e) {
        console.error('[Isaak Auto-Memory] failed', e);
      }
      // V1.3.3 — Compactación. Si la conversación supera el umbral,
      // regenera el summary cubriendo todos los turnos menos los últimos.
      if (conversation?.id) {
        try {
          const { summarizeOlderTurns } = await import(
            '@/app/lib/isaak-conversation-summarizer'
          );
          const sumResult = await summarizeOlderTurns(conversation.id);
          if (sumResult.triggered) {
            console.info('[Isaak Compaction]', {
              conversationId: conversation.id,
              ...sumResult,
            });
          }
        } catch (e) {
          console.error('[Isaak Compaction] failed', e);
        }
      }
    })
    .catch((err) => {
      console.error('[Isaak Chat Stream] post-stream tasks failed', err);
    });

  // Prepend a conversation event so the client can track conversationId.
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
