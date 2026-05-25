import type { AIProvider, AIUsage } from '@verifactu/utils';
import { prisma } from './prisma';

// Pricing snapshot (USD per 1M tokens) → converted to EUR.
// Sourced from public Anthropic/OpenAI pricing pages, 2026-05-24.
// Update when providers change prices.
const USD_TO_EUR = 0.92;

const MODEL_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-haiku-4-5-20251001': { input: 0.25, output: 1.25 },
  'claude-haiku-4-5': { input: 0.25, output: 1.25 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2.5, output: 10 },
  'gpt-4.1-mini': { input: 0.15, output: 0.6 },
};

const DEFAULT_PRICING = { input: 1, output: 3 };

export function estimateCostEur(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_USD_PER_MTOK[model] ?? DEFAULT_PRICING;
  const usdInput = (inputTokens / 1_000_000) * pricing.input;
  const usdOutput = (outputTokens / 1_000_000) * pricing.output;
  return (usdInput + usdOutput) * USD_TO_EUR;
}

export type RecordChatMetricInput = {
  tenantId?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  provider: AIProvider | 'fallback';
  modelUsed: string;
  feature?: string | null;
  usage?: AIUsage;
  latencyMs?: number | null;
  firstTokenMs?: number | null;
  toolCalls?: string[];
  isClarification?: boolean;
  isFallback?: boolean;
  historyTurns?: number;
  // F3: classifier routing metadata
  classifierModel?: string | null;
  classifierLatencyMs?: number | null;
  routedTo?: 'clarify_direct' | 'sonnet_no_tools' | 'sonnet_with_tools' | 'fallback' | null;
  ambiguityType?: string | null;
  // F4: judge metrics
  judgeInvocations?: number;
  judgeBlocks?: number;
  judgeLatencyMs?: number | null;
  writeTools?: string[];
  // F6b: RAG retrieval
  factsRetrieved?: number;
  ragLatencyMs?: number | null;
  ragTopSimilarity?: number | null;
  // F7: few-shot dynamic examples
  fewShotInjected?: number;
  fewShotLatencyMs?: number | null;
  fewShotTopSimilarity?: number | null;
  errorCode?: string | null;
};

export async function recordChatMetric(input: RecordChatMetricInput): Promise<void> {
  const inputTokens = input.usage?.inputTokens ?? 0;
  const outputTokens = input.usage?.outputTokens ?? 0;
  const cost = estimateCostEur(input.modelUsed, inputTokens, outputTokens);

  await prisma.isaakChatMetric.create({
    data: {
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      conversationId: input.conversationId ?? null,
      messageId: input.messageId ?? null,
      provider: input.provider,
      modelUsed: input.modelUsed,
      feature: input.feature ?? null,
      inputTokens,
      outputTokens,
      estimatedCostEur: cost,
      latencyMs: input.latencyMs ?? 0,
      firstTokenMs: input.firstTokenMs ?? null,
      toolCallsCount: input.toolCalls?.length ?? 0,
      toolNames: input.toolCalls ?? [],
      isClarification: Boolean(input.isClarification),
      isFallback: Boolean(input.isFallback),
      historyTurns: input.historyTurns ?? 0,
      classifierModel: input.classifierModel ?? null,
      classifierLatencyMs: input.classifierLatencyMs ?? null,
      routedTo: input.routedTo ?? null,
      ambiguityType: input.ambiguityType ?? null,
      judgeInvocations: input.judgeInvocations ?? 0,
      judgeBlocks: input.judgeBlocks ?? 0,
      judgeLatencyMs: input.judgeLatencyMs ?? null,
      writeTools: input.writeTools ?? [],
      factsRetrieved: input.factsRetrieved ?? 0,
      ragLatencyMs: input.ragLatencyMs ?? null,
      ragTopSimilarity: input.ragTopSimilarity ?? null,
      fewShotInjected: input.fewShotInjected ?? 0,
      fewShotLatencyMs: input.fewShotLatencyMs ?? null,
      fewShotTopSimilarity: input.fewShotTopSimilarity ?? null,
      errorCode: input.errorCode ?? null,
    },
  });
}

const CLARIFY_KEY_REGEX = /"clarify"\s*:\s*true/;

export function detectClarificationResponse(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return false;
  return CLARIFY_KEY_REGEX.test(trimmed);
}
