// F6: OpenAI text-embedding-3-small caller.
//
// Returns a 1536-dim vector for arbitrary text. Used by the long-term
// memory store on write (to embed the fact) and on read (to embed the
// query before cosine-similarity lookup).
//
// Pricing snapshot (2026-05): $0.020 / MTok. A 50-token fact costs ~1µ$,
// so we don't bother caching individual embeddings in v1.

import { resolveAIConfig, AIError } from '@verifactu/utils';
import { EMBEDDING_DIM, vectorToPgLiteral } from './isaak-vector-utils';

export { EMBEDDING_DIM, vectorToPgLiteral };

export const EMBEDDING_MODEL = 'text-embedding-3-small';

export type EmbedResult = {
  vector: number[];
  tokens: number;
  latencyMs: number;
  model: string;
};

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  usage?: { prompt_tokens?: number; total_tokens?: number };
  error?: { message?: string };
};

export async function embedText(text: string): Promise<EmbedResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AIError('embedText: empty input', 'openai', 'unknown');
  }

  const config = resolveAIConfig(process.env);
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new AIError('Missing OPENAI_API_KEY for embeddings', 'openai', 'auth');
  }

  const start = Date.now();
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: trimmed,
    }),
  });

  if (!response.ok) {
    const body = (await response.text().catch(() => '')).trim();
    throw new AIError(
      `OpenAI embeddings ${response.status}: ${body.slice(0, 200)}`,
      'openai',
      response.status === 429 ? 'rate_limit' : response.status >= 500 ? 'network' : 'unknown',
      response.status
    );
  }

  const data = (await response.json()) as OpenAIEmbeddingResponse;
  if (data.error?.message) {
    throw new AIError(data.error.message, 'openai', 'unknown');
  }

  const vector = data.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIM) {
    throw new AIError(
      `OpenAI returned malformed embedding (got ${vector?.length ?? 'undefined'} dims, expected ${EMBEDDING_DIM})`,
      'openai',
      'empty_response'
    );
  }

  return {
    vector,
    tokens: data.usage?.prompt_tokens ?? data.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - start,
    model: EMBEDDING_MODEL,
  };
}

