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
import {
  detectClarificationResponse,
  recordChatMetric,
} from '@/app/lib/isaak-chat-metrics';
import {
  buildAuthenticatedSystemPrompt,
} from '@/app/lib/isaak-chat-prompts';
import {
  buildReadOnlyToolsForContext,
} from '@/app/lib/isaak-tools-registry';
import { classifyIntent } from '@/app/lib/isaak-intent-classifier';
import {
  loadAuthenticatedChatContext,
  loadTenantPlanCode,
  resolveModelForPlan,
} from '@/app/lib/isaak-chat-context';
import { streamIsaakChat, type ChatStreamMetrics } from '@/app/lib/isaak-chat-stream';
import { retrieveFactsForChat } from '@/app/lib/isaak-rag';

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
      controller.enqueue(enc.encode(`event: text-delta\ndata: ${JSON.stringify({ delta: input.text })}\n\n`));
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
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).message === 'string'
      ? (body as { message: string }).message.trim()
      : '';
  const requestedConversationId =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).conversationId === 'string'
      ? ((body as { conversationId: string }).conversationId.trim() || null)
      : null;

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

  // F6b: classifier + RAG retrieval run in parallel.
  const [classification, ragResult] = await Promise.all([
    classifyIntent({
      message,
      history,
      context: {
        holdedConnected: authenticated.toolContext.holdedConnected,
        bankConnected: authenticated.toolContext.bankConnected,
        googleConnected: authenticated.toolContext.googleConnected,
        microsoftConnected: authenticated.toolContext.microsoftConnected,
      },
    }),
    retrieveFactsForChat({
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

  // Decide tools
  let tools: ReturnType<typeof buildReadOnlyToolsForContext> = [];
  let routedTo: 'sonnet_no_tools' | 'sonnet_with_tools' = 'sonnet_no_tools';
  let allowWrites = false;

  if (classification.needsTools && classification.relevantCategories.length > 0) {
    allowWrites = classification.hasWriteIntent;
    const filtered = buildReadOnlyToolsForContext(authenticated.toolContext, {
      only: classification.relevantCategories,
      allowWrites,
    });
    if (filtered.length > 0) {
      tools = filtered;
      routedTo = 'sonnet_with_tools';
    }
  }

  const { stream, metricsPromise } = streamIsaakChat({
    systemPrompt: buildAuthenticatedSystemPrompt(authenticated.promptContext, {
      factsBlock: ragResult.factsBlock,
    }),
    history,
    userMessage: message,
    tools,
    context: authenticated.toolContext,
    model: modelConfig.model,
    allowWrites,
    maxTokens: 1500,
  });

  // Fire-and-forget metrics + persistence after the stream finishes.
  metricsPromise
    .then((metrics) =>
      persistAndMetric({
        text: metrics.text,
        metrics,
        routedTo,
        feature: allowWrites ? 'workspace_chat_stream_write' : 'workspace_chat_stream',
        isClarification: detectClarificationResponse(metrics.text),
      })
    )
    .catch((err) => {
      console.error('[Isaak Chat Stream] post-stream tasks failed', err);
    });

  return new Response(stream, { headers: sseHeaders() });
}
