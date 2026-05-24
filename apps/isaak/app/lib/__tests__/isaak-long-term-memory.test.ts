// Import from the pure helpers module — isaak-long-term-memory itself
// transitively imports @verifactu/utils (which babel-jest can't transform).
import {
  buildRetrieveWhereClause,
  vectorToPgLiteral,
} from '../isaak-vector-utils';

describe('vectorToPgLiteral', () => {
  it('serializes a vector as the pgvector text format', () => {
    expect(vectorToPgLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  it('handles negative values', () => {
    expect(vectorToPgLiteral([-1, 0, 1])).toBe('[-1,0,1]');
  });

  it('throws on empty vector', () => {
    expect(() => vectorToPgLiteral([])).toThrow();
  });
});

describe('buildRetrieveWhereClause — tenant isolation', () => {
  it('always filters by tenant_id FIRST in the WHERE clause', () => {
    const sql = buildRetrieveWhereClause({ withFactTypes: false });
    expect(sql.indexOf('tenant_id = $1::uuid')).toBeLessThan(sql.indexOf('embedding IS NOT NULL'));
  });

  it('puts the fact_type filter LAST (never before tenant_id)', () => {
    const sql = buildRetrieveWhereClause({ withFactTypes: true });
    const tenantIdx = sql.indexOf('tenant_id = $1::uuid');
    const factTypeIdx = sql.indexOf('fact_type = ANY');
    expect(tenantIdx).toBeGreaterThanOrEqual(0);
    expect(factTypeIdx).toBeGreaterThan(tenantIdx);
  });

  it('omits the fact_type filter when not requested', () => {
    const sql = buildRetrieveWhereClause({ withFactTypes: false });
    expect(sql).not.toContain('fact_type = ANY');
  });

  it('always excludes expired facts', () => {
    expect(buildRetrieveWhereClause({ withFactTypes: false })).toContain('expires_at IS NULL');
    expect(buildRetrieveWhereClause({ withFactTypes: true })).toContain('expires_at IS NULL');
  });
});
