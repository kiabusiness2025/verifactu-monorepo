// Pure helpers shared between isaak-embeddings (LLM caller) and the long-term
// memory query layer. Separated so unit tests can import them without pulling
// @verifactu/utils through babel-jest.

export const EMBEDDING_DIM = 1536;

export function vectorToPgLiteral(vector: number[]): string {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('vectorToPgLiteral: empty vector');
  }
  return `[${vector.join(',')}]`;
}

// Returns the WHERE-clause segment used by retrieveRelevantFacts. Exported so
// a unit test can assert tenant_id is always the first filter regardless of
// optional parameters (this is a critical isolation invariant).
export function buildRetrieveWhereClause(opts: { withFactTypes: boolean }): string {
  const factTypeFilter = opts.withFactTypes ? `AND fact_type = ANY($3::text[])` : '';
  return `WHERE tenant_id = $1::uuid AND embedding IS NOT NULL AND (expires_at IS NULL OR expires_at > NOW()) ${factTypeFilter}`.trim();
}
