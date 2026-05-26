import { canonicalJson, hashPayload } from '../isaak-aeat-submission';

describe('canonicalJson', () => {
  it('orders object keys alphabetically', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('produces identical output for objects with same content, different key order', () => {
    const a = { tenantId: 'x', model: '303', amount: 100 };
    const b = { amount: 100, model: '303', tenantId: 'x' };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it('serializes nested objects deterministically', () => {
    const a = { outer: { y: 2, x: 1 }, list: [1, 2, 3] };
    const b = { list: [1, 2, 3], outer: { x: 1, y: 2 } };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it('preserves array order', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles null and undefined', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(undefined)).toBe('null');
  });

  it('handles primitives', () => {
    expect(canonicalJson('hola')).toBe('"hola"');
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson(true)).toBe('true');
  });

  it('handles empty object and array', () => {
    expect(canonicalJson({})).toBe('{}');
    expect(canonicalJson([])).toBe('[]');
  });
});

describe('hashPayload', () => {
  it('returns a 64-char hex SHA-256', () => {
    const hash = hashPayload({ a: 1, b: 'x' });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for equal payloads regardless of key order', () => {
    const h1 = hashPayload({ tenantId: 'A', model: '303', period: '2T-2026' });
    const h2 = hashPayload({ period: '2T-2026', model: '303', tenantId: 'A' });
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different payloads', () => {
    const h1 = hashPayload({ a: 1 });
    const h2 = hashPayload({ a: 2 });
    expect(h1).not.toBe(h2);
  });

  it('matches the SHA-256 of the canonical JSON', () => {
    // SHA-256 of {"a":1,"b":2} = 43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777
    expect(hashPayload({ b: 2, a: 1 })).toBe(
      '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777',
    );
  });
});
