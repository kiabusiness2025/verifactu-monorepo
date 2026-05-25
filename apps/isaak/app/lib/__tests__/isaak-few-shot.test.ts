import {
  buildFewShotQuerySql,
  buildFewShotWhereClause,
} from '../isaak-few-shot-sql';
import {
  formatFewShotBlock,
  getFewShotPromptLimits,
  type FewShotExample,
} from '../isaak-few-shot-prompt';

function example(overrides: Partial<FewShotExample> = {}): FewShotExample {
  return {
    question: '¿Cuándo presento el modelo 303 del Q1?',
    response: 'El plazo es hasta el 20 de abril.',
    similarity: 0.84,
    createdAt: new Date('2026-04-01T10:00:00Z'),
    ...overrides,
  };
}

describe('buildFewShotWhereClause — tenant isolation', () => {
  it('puts tenant_id FIRST in the WHERE clause', () => {
    const where = buildFewShotWhereClause();
    expect(where.indexOf('tenant_id = $1::uuid')).toBeLessThan(where.indexOf('rating'));
  });

  it('filters to thumbs_up only (no negative examples leak in)', () => {
    expect(buildFewShotWhereClause()).toContain("rating = 'thumbs_up'");
  });

  it('requires few_shot_eligible flag', () => {
    expect(buildFewShotWhereClause()).toContain('few_shot_eligible = TRUE');
  });

  it('skips rows whose embedding has not been generated yet', () => {
    expect(buildFewShotWhereClause()).toContain('query_embedding IS NOT NULL');
  });
});

describe('buildFewShotQuerySql', () => {
  it('orders by cosine distance ascending (smallest = most similar)', () => {
    expect(buildFewShotQuerySql()).toContain('ORDER BY query_embedding <=> $2::vector ASC');
  });

  it('computes a 0..1 similarity score for the caller', () => {
    expect(buildFewShotQuerySql()).toContain('1 - (query_embedding <=> $2::vector) / 2');
  });

  it('always applies the tenant-isolation WHERE clause', () => {
    expect(buildFewShotQuerySql()).toContain('tenant_id = $1::uuid');
  });
});

describe('formatFewShotBlock', () => {
  it('returns empty string for no examples', () => {
    expect(formatFewShotBlock([])).toBe('');
  });

  it('renders header + numbered examples', () => {
    const block = formatFewShotBlock([example()]);
    expect(block).toContain('Ejemplos previos del mismo workspace');
    expect(block).toContain('👍');
    expect(block).toContain('NO los copies literalmente');
    expect(block).toContain('Ejemplo 1:');
    expect(block).toContain('Usuario:');
    expect(block).toContain('Isaak:');
  });

  it('caps at maxExamplesInPrompt', () => {
    const { maxExamplesInPrompt } = getFewShotPromptLimits();
    const examples = Array.from({ length: maxExamplesInPrompt + 3 }, (_, i) =>
      example({ question: `Q${i}`, response: `R${i}` })
    );
    const block = formatFewShotBlock(examples);
    const matches = block.match(/^Ejemplo \d+:/gm) ?? [];
    expect(matches.length).toBe(maxExamplesInPrompt);
  });

  it('truncates questions longer than the question limit', () => {
    const { maxQuestionChars } = getFewShotPromptLimits();
    const long = 'q'.repeat(maxQuestionChars + 50);
    const block = formatFewShotBlock([example({ question: long })]);
    expect(block).toMatch(/q+…/);
  });

  it('truncates responses longer than the response limit', () => {
    const { maxResponseChars } = getFewShotPromptLimits();
    const long = 'r'.repeat(maxResponseChars + 100);
    const block = formatFewShotBlock([example({ response: long })]);
    expect(block).toMatch(/r+…/);
  });
});
