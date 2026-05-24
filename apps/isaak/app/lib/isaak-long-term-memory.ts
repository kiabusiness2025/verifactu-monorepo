// F6: Long-term memory store + retrieval with strict tenant isolation.
//
// CRITICAL SECURITY INVARIANT: every retrieve query must filter by tenant_id
// BEFORE the cosine-similarity operator. Tenants must never see each other's
// facts even by similarity collision.
//
// The pgvector cosine-distance operator is `<=>`. A distance of 0 means
// identical, 2 means opposite. Similarity = 1 - distance/2 normalized to [0,1].

import { prisma } from './prisma';
import { embedText } from './isaak-embeddings';
import { buildRetrieveWhereClause, vectorToPgLiteral } from './isaak-vector-utils';

export type FactType = 'preference' | 'history' | 'decision' | 'profile' | 'other';
export type FactSource = 'user' | 'tool_result' | 'feedback' | 'admin';

export type StoreFactInput = {
  tenantId: string;
  userId?: string | null;
  conversationId?: string | null;
  fact: string;
  factType: FactType;
  source: FactSource;
  sourceMsgId?: string | null;
  confidence?: number;
  expiresAt?: Date | null;
};

export type StoredFact = {
  id: string;
  fact: string;
  factType: FactType;
  similarity: number; // [0..1], 1 = identical
  createdAt: Date;
};

export type RetrieveFactsInput = {
  tenantId: string;
  queryText: string;
  topK?: number;
  minSimilarity?: number; // [0..1] floor
  factTypes?: FactType[]; // optional filter
};

export async function storeMemoryFact(input: StoreFactInput): Promise<{ id: string }> {
  if (!input.tenantId) throw new Error('storeMemoryFact: tenantId required');
  const trimmed = input.fact.trim();
  if (!trimmed) throw new Error('storeMemoryFact: empty fact');

  const embedding = await embedText(trimmed);
  const literal = vectorToPgLiteral(embedding.vector);

  // Insert via raw SQL because Prisma doesn't generate a typed setter for the
  // Unsupported("vector(1536)") column. The cast :: vector is required.
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO isaak_long_term_memory
       (tenant_id, user_id, conversation_id, fact, fact_type, embedding,
        source, source_msg_id, confidence, expires_at)
     VALUES
       ($1::uuid, $2, $3::uuid, $4, $5, $6::vector, $7, $8, $9, $10)
     RETURNING id`,
    input.tenantId,
    input.userId ?? null,
    input.conversationId ?? null,
    trimmed,
    input.factType,
    literal,
    input.source,
    input.sourceMsgId ?? null,
    input.confidence ?? 1.0,
    input.expiresAt ?? null
  );

  return { id: rows[0]?.id ?? '' };
}

const MIN_SIMILARITY_DEFAULT = 0.5;
const TOP_K_DEFAULT = 5;
const TOP_K_MAX = 25;

export async function retrieveRelevantFacts(
  input: RetrieveFactsInput
): Promise<StoredFact[]> {
  if (!input.tenantId) throw new Error('retrieveRelevantFacts: tenantId required');
  const query = input.queryText.trim();
  if (!query) return [];

  const topK = Math.max(1, Math.min(TOP_K_MAX, input.topK ?? TOP_K_DEFAULT));
  const minSimilarity = Math.max(0, Math.min(1, input.minSimilarity ?? MIN_SIMILARITY_DEFAULT));

  const embedding = await embedText(query);
  const literal = vectorToPgLiteral(embedding.vector);

  // pgvector cosine distance: 0 (identical) → 2 (opposite). We convert to a
  // [0..1] similarity score so callers don't need to know the operator's
  // semantics. tenant_id MUST stay the first filter (isolation invariant
  // pinned by buildRetrieveWhereClause + unit tests).
  const withFactTypes = !!(input.factTypes && input.factTypes.length > 0);
  const whereClause = buildRetrieveWhereClause({ withFactTypes });

  const params: unknown[] = [input.tenantId, literal];
  if (withFactTypes) params.push(input.factTypes);
  params.push(topK);

  const sql = `
    SELECT
      id,
      fact,
      fact_type AS "factType",
      created_at AS "createdAt",
      1 - (embedding <=> $2::vector) / 2 AS similarity
    FROM isaak_long_term_memory
    ${whereClause}
    ORDER BY embedding <=> $2::vector ASC
    LIMIT $${params.length}::int
  `;

  type Row = {
    id: string;
    fact: string;
    factType: FactType;
    createdAt: Date;
    similarity: number;
  };

  const rows = await prisma.$queryRawUnsafe<Row[]>(sql, ...params);

  return rows
    .map((r) => ({
      id: r.id,
      fact: r.fact,
      factType: r.factType,
      similarity: Number(r.similarity),
      createdAt: r.createdAt,
    }))
    .filter((f) => f.similarity >= minSimilarity);
}

export async function deleteMemoryFact(input: {
  tenantId: string;
  factId: string;
}): Promise<{ deleted: number }> {
  const result = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `DELETE FROM isaak_long_term_memory
       WHERE tenant_id = $1::uuid AND id = $2::uuid
       RETURNING id`,
    input.tenantId,
    input.factId
  );
  return { deleted: result.length };
}

