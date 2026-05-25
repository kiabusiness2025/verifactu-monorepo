// F6b RAG orchestrator. Calls retrieveRelevantFacts with the user's last
// message and formats the result for the system prompt. Designed to NEVER
// throw — the chat must keep working even if pgvector/OpenAI fail.

import { retrieveRelevantFacts } from './isaak-long-term-memory';
import { formatFactsBlock, type RagFact } from './isaak-rag-prompt';

export type RetrieveForChatInput = {
  tenantId: string;
  queryText: string;
  topK?: number;
  minSimilarity?: number;
};

export type RetrieveForChatResult = {
  factsBlock: string;
  factsRetrieved: number;
  topSimilarity: number | null;
  latencyMs: number;
  error?: string;
};

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SIM = 0.6; // higher floor than the admin endpoint — chat wants high-precision recall

export async function retrieveFactsForChat(
  input: RetrieveForChatInput
): Promise<RetrieveForChatResult> {
  const start = Date.now();
  if (!input.tenantId || !input.queryText.trim()) {
    return {
      factsBlock: '',
      factsRetrieved: 0,
      topSimilarity: null,
      latencyMs: 0,
    };
  }

  try {
    const facts = await retrieveRelevantFacts({
      tenantId: input.tenantId,
      queryText: input.queryText,
      topK: input.topK ?? DEFAULT_TOP_K,
      minSimilarity: input.minSimilarity ?? DEFAULT_MIN_SIM,
    });
    const ragFacts: RagFact[] = facts.map((f) => ({
      fact: f.fact,
      factType: f.factType,
      similarity: f.similarity,
      createdAt: f.createdAt,
    }));
    return {
      factsBlock: formatFactsBlock(ragFacts),
      factsRetrieved: ragFacts.length,
      topSimilarity: ragFacts[0]?.similarity ?? null,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    console.error('[isaak-rag] retrieve failed', err);
    return {
      factsBlock: '',
      factsRetrieved: 0,
      topSimilarity: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
