// F7 Few-shot dynamic retrieval.
//
// On thumbs-up: we embed the user's original question and mark the row as
// eligible for future few-shot injection. Strict tenant isolation: a 👍 from
// tenant A NEVER becomes a few-shot example for tenant B.
//
// On chat: we embed the new user message and retrieve the top examples by
// cosine similarity, then format them into a system-prompt block.

import { prisma } from './prisma';
import { embedText } from './isaak-embeddings';
import { vectorToPgLiteral } from './isaak-vector-utils';
import { buildFewShotQuerySql } from './isaak-few-shot-sql';
import {
  formatFewShotBlock,
  type FewShotExample,
} from './isaak-few-shot-prompt';

const DEFAULT_TOP_K = 3;
const DEFAULT_MIN_SIM = 0.7; // higher than RAG — copying style is more sensitive to relevance
const TOP_K_MAX = 5;

export type StoreThumbsUpInput = {
  tenantId: string;
  feedbackId: string;
  question: string;
};

// Called asynchronously after a thumbs_up row is inserted. We embed the
// question and flip few_shot_eligible. Failures are logged but never
// thrown — feedback recording must not fail because the embedding service
// is down.
export async function markFeedbackEligibleAsync(input: StoreThumbsUpInput): Promise<void> {
  if (!input.tenantId || !input.feedbackId) return;
  const trimmed = input.question.trim();
  if (!trimmed) return;

  try {
    const embedding = await embedText(trimmed);
    const literal = vectorToPgLiteral(embedding.vector);
    await prisma.$executeRawUnsafe(
      `UPDATE isaak_feedback
         SET query_embedding = $1::vector,
             few_shot_eligible = TRUE
         WHERE id = $2::uuid AND tenant_id = $3::uuid AND rating = 'thumbs_up'`,
      literal,
      input.feedbackId,
      input.tenantId
    );
  } catch (err) {
    console.error('[isaak-few-shot] mark eligible failed', err);
  }
}

export type RetrieveFewShotInput = {
  tenantId: string;
  queryText: string;
  topK?: number;
  minSimilarity?: number;
};

export type RetrieveFewShotResult = {
  examplesBlock: string;
  injected: number;
  topSimilarity: number | null;
  latencyMs: number;
  error?: string;
};

export async function retrieveFewShotForChat(
  input: RetrieveFewShotInput
): Promise<RetrieveFewShotResult> {
  const start = Date.now();
  if (!input.tenantId || !input.queryText.trim()) {
    return { examplesBlock: '', injected: 0, topSimilarity: null, latencyMs: 0 };
  }

  const topK = Math.max(1, Math.min(TOP_K_MAX, input.topK ?? DEFAULT_TOP_K));
  const minSimilarity = Math.max(0, Math.min(1, input.minSimilarity ?? DEFAULT_MIN_SIM));

  try {
    const embedding = await embedText(input.queryText.trim());
    const literal = vectorToPgLiteral(embedding.vector);

    type Row = {
      id: string;
      question: string;
      response: string;
      createdAt: Date;
      similarity: number;
    };

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      buildFewShotQuerySql(),
      input.tenantId,
      literal,
      topK
    );

    const filtered = rows
      .map<FewShotExample>((r) => ({
        question: r.question,
        response: r.response,
        similarity: Number(r.similarity),
        createdAt: r.createdAt,
      }))
      .filter((ex) => ex.similarity >= minSimilarity);

    return {
      examplesBlock: formatFewShotBlock(filtered),
      injected: filtered.length,
      topSimilarity: filtered[0]?.similarity ?? null,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    console.error('[isaak-few-shot] retrieve failed', err);
    return {
      examplesBlock: '',
      injected: 0,
      topSimilarity: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
