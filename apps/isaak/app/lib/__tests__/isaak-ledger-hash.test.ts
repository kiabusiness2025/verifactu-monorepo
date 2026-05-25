import {
  computeEntryHash,
  validateChain,
  type LedgerHashInput,
} from '../isaak-ledger-hash';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function baseInput(overrides: Partial<LedgerHashInput> = {}): LedgerHashInput {
  return {
    tenantId: TENANT_A,
    entryDate: '2026-05-01',
    docNumber: 'F-2026-0001',
    docType: 'invoice_out',
    counterpartyNif: 'B12345678',
    counterpartyName: 'Acme SL',
    amount: '1210.00',
    currency: 'EUR',
    taxBase: '1000.00',
    vatRate: '21.00',
    vatAmount: '210.00',
    accountDebit: '430',
    accountCredit: '700',
    description: 'Servicios consultoría mayo',
    sourceSystem: 'manual',
    prevHash: null,
    ...overrides,
  };
}

describe('computeEntryHash', () => {
  it('produces a stable 64-char hex digest for identical input', () => {
    const a = computeEntryHash(baseInput());
    const b = computeEntryHash(baseInput());
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes when any field changes', () => {
    const baseline = computeEntryHash(baseInput());
    const changedAmount = computeEntryHash(baseInput({ amount: '1210.01' }));
    const changedDesc = computeEntryHash(baseInput({ description: 'algo distinto' }));
    const changedDate = computeEntryHash(baseInput({ entryDate: '2026-05-02' }));
    const changedTenant = computeEntryHash(baseInput({ tenantId: TENANT_B }));
    expect(changedAmount).not.toBe(baseline);
    expect(changedDesc).not.toBe(baseline);
    expect(changedDate).not.toBe(baseline);
    expect(changedTenant).not.toBe(baseline);
  });

  it('changes when prevHash changes (chain dependency)', () => {
    const genesis = computeEntryHash(baseInput());
    const linked = computeEntryHash(baseInput({ prevHash: genesis }));
    const wrongLink = computeEntryHash(baseInput({ prevHash: 'a'.repeat(64) }));
    expect(linked).not.toBe(genesis);
    expect(linked).not.toBe(wrongLink);
  });

  it('does not depend on object key ordering at the JS level', () => {
    const reordered: LedgerHashInput = {
      prevHash: null,
      sourceSystem: 'manual',
      description: 'Servicios consultoría mayo',
      accountCredit: '700',
      accountDebit: '430',
      vatAmount: '210.00',
      vatRate: '21.00',
      taxBase: '1000.00',
      currency: 'EUR',
      amount: '1210.00',
      counterpartyName: 'Acme SL',
      counterpartyNif: 'B12345678',
      docType: 'invoice_out',
      docNumber: 'F-2026-0001',
      entryDate: '2026-05-01',
      tenantId: TENANT_A,
    };
    expect(computeEntryHash(reordered)).toBe(computeEntryHash(baseInput()));
  });

  it('rejects empty tenantId', () => {
    expect(() => computeEntryHash(baseInput({ tenantId: '' }))).toThrow(/tenantId/);
  });

  it('rejects malformed prevHash', () => {
    expect(() => computeEntryHash(baseInput({ prevHash: 'too-short' }))).toThrow(
      /prevHash/,
    );
  });
});

describe('validateChain', () => {
  function buildLinkedChain(count: number): Array<{
    hash: string;
    prevHash: string | null;
    input: LedgerHashInput;
  }> {
    const nodes: Array<{
      hash: string;
      prevHash: string | null;
      input: LedgerHashInput;
    }> = [];
    let prev: string | null = null;
    for (let i = 0; i < count; i++) {
      const input = baseInput({
        docNumber: `F-2026-${String(i + 1).padStart(4, '0')}`,
        amount: `${100 + i}.00`,
        prevHash: prev,
      });
      const hash = computeEntryHash(input);
      nodes.push({ hash, prevHash: prev, input });
      prev = hash;
    }
    return nodes;
  }

  it('accepts a well-formed 3-node chain', () => {
    const chain = buildLinkedChain(3);
    expect(validateChain(chain)).toEqual({ ok: true });
  });

  it('accepts a single-node chain (genesis with null prev)', () => {
    const chain = buildLinkedChain(1);
    expect(validateChain(chain)).toEqual({ ok: true });
  });

  it('rejects a chain whose genesis has non-null prev_hash', () => {
    const chain = buildLinkedChain(2);
    chain[0].prevHash = 'a'.repeat(64);
    chain[0].hash = computeEntryHash({ ...chain[0].input, prevHash: 'a'.repeat(64) });
    const result = validateChain(chain);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.brokenAt).toBe(0);
      expect(result.reason).toBe('genesis_must_have_null_prev');
    }
  });

  it('detects tampering with an amount mid-chain', () => {
    const chain = buildLinkedChain(3);
    // Mutate the input but keep stored hash → re-hash will not match.
    chain[1].input.amount = '999999.00';
    const result = validateChain(chain);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.brokenAt).toBe(1);
      expect(result.reason).toBe('hash_mismatch');
    }
  });

  it('detects a broken prev_hash link', () => {
    const chain = buildLinkedChain(3);
    chain[2].prevHash = 'b'.repeat(64);
    const result = validateChain(chain);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.brokenAt).toBe(2);
      expect(result.reason).toBe('prev_hash_mismatch');
    }
  });

  it('detects a malformed (non-hex / wrong length) stored hash', () => {
    const chain = buildLinkedChain(2);
    chain[1].hash = 'not-a-real-hash';
    const result = validateChain(chain);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // prevHash check happens before hash check; tampered hash here is
      // really a mismatch against the recomputed value.
      expect(result.brokenAt).toBe(1);
      expect(['hash_mismatch', 'prev_hash_mismatch']).toContain(result.reason);
    }
  });
});
