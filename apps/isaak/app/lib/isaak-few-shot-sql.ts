// Pure SQL helpers for the few-shot retrieve. Extracted so tests can pin
// the tenant-isolation invariant without pulling @verifactu/utils.

export function buildFewShotWhereClause(): string {
  return [
    'WHERE tenant_id = $1::uuid',
    "  AND rating = 'thumbs_up'",
    '  AND few_shot_eligible = TRUE',
    '  AND query_embedding IS NOT NULL',
  ].join('\n');
}

export function buildFewShotQuerySql(): string {
  return `
    SELECT
      id,
      question,
      response,
      created_at AS "createdAt",
      1 - (query_embedding <=> $2::vector) / 2 AS similarity
    FROM isaak_feedback
    ${buildFewShotWhereClause()}
    ORDER BY query_embedding <=> $2::vector ASC
    LIMIT $3::int
  `;
}
