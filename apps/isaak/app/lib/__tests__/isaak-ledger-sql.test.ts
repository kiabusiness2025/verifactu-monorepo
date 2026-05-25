import {
  ADVISORY_LOCK_SQL,
  INSERT_ENTRY_SQL,
  LEDGER_DOC_TYPES,
  LEDGER_SOURCE_SYSTEMS,
  SELECT_LATEST_ENTRY_SQL,
  buildSelectChainSQL,
  normalizeAppendInput,
  toHashInput,
  type AppendEntryInput,
} from '../isaak-ledger-sql';

const TENANT = '11111111-1111-1111-1111-111111111111';

function baseInput(overrides: Partial<AppendEntryInput> = {}): AppendEntryInput {
  return {
    tenantId: TENANT,
    entryDate: '2026-05-01',
    docType: 'invoice_out',
    docNumber: 'F-2026-0001',
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
    holdedId: null,
    attachmentUrl: null,
    createdBy: 'user-123',
    ...overrides,
  };
}

describe('normalizeAppendInput', () => {
  it('accepts a fully-specified valid input and trims description', () => {
    const out = normalizeAppendInput(baseInput({ description: '  hola  ' }));
    expect(out.description).toBe('hola');
    expect(out.currency).toBe('EUR');
    expect(out.tenantId).toBe(TENANT);
  });

  it('defaults currency to EUR and uppercases', () => {
    const out = normalizeAppendInput(baseInput({ currency: undefined }));
    expect(out.currency).toBe('EUR');
    const out2 = normalizeAppendInput(baseInput({ currency: 'usd' }));
    expect(out2.currency).toBe('USD');
  });

  it('rejects malformed tenantId', () => {
    expect(() => normalizeAppendInput(baseInput({ tenantId: 'not-a-uuid' }))).toThrow(
      /tenantId/,
    );
    expect(() => normalizeAppendInput(baseInput({ tenantId: '' }))).toThrow(/tenantId/);
  });

  it('rejects malformed entryDate', () => {
    expect(() => normalizeAppendInput(baseInput({ entryDate: '2026/05/01' }))).toThrow(
      /entryDate/,
    );
    expect(() => normalizeAppendInput(baseInput({ entryDate: '2026-5-1' }))).toThrow(
      /entryDate/,
    );
  });

  it('rejects docType not in the whitelist', () => {
    expect(() =>
      normalizeAppendInput(baseInput({ docType: 'bogus' as unknown as AppendEntryInput['docType'] })),
    ).toThrow(/docType/);
  });

  it('rejects sourceSystem not in the whitelist', () => {
    expect(() =>
      normalizeAppendInput(
        baseInput({ sourceSystem: 'sap' as unknown as AppendEntryInput['sourceSystem'] }),
      ),
    ).toThrow(/sourceSystem/);
  });

  it('rejects non-decimal amount strings', () => {
    expect(() => normalizeAppendInput(baseInput({ amount: '12,50' }))).toThrow(/amount/);
    expect(() => normalizeAppendInput(baseInput({ amount: 'twenty' }))).toThrow(/amount/);
    expect(() => normalizeAppendInput(baseInput({ amount: '' }))).toThrow(/amount/);
  });

  it('rejects non-decimal vatBase/vatRate/vatAmount when provided', () => {
    expect(() => normalizeAppendInput(baseInput({ taxBase: 'foo' }))).toThrow(/taxBase/);
    expect(() => normalizeAppendInput(baseInput({ vatRate: '21%' }))).toThrow(/vatRate/);
    expect(() => normalizeAppendInput(baseInput({ vatAmount: 'na' }))).toThrow(/vatAmount/);
  });

  it('allows null/undefined for optional decimals', () => {
    const out = normalizeAppendInput(
      baseInput({ taxBase: null, vatRate: null, vatAmount: null }),
    );
    expect(out.taxBase).toBeNull();
    expect(out.vatRate).toBeNull();
    expect(out.vatAmount).toBeNull();
  });

  it('requires description after trimming', () => {
    expect(() => normalizeAppendInput(baseInput({ description: '   ' }))).toThrow(
      /description/,
    );
  });

  it('requires createdBy after trimming', () => {
    expect(() => normalizeAppendInput(baseInput({ createdBy: '' }))).toThrow(/createdBy/);
  });

  it('accepts every doc_type and source_system from the whitelist', () => {
    for (const docType of LEDGER_DOC_TYPES) {
      expect(() => normalizeAppendInput(baseInput({ docType }))).not.toThrow();
    }
    for (const sourceSystem of LEDGER_SOURCE_SYSTEMS) {
      expect(() => normalizeAppendInput(baseInput({ sourceSystem }))).not.toThrow();
    }
  });
});

describe('toHashInput', () => {
  it('drops non-fiscal fields and carries through prevHash', () => {
    const norm = normalizeAppendInput(baseInput({ holdedId: 'h-1', attachmentUrl: 'x' }));
    const hashInput = toHashInput(norm, null);
    expect(hashInput.prevHash).toBeNull();
    // @ts-expect-error — holdedId is not on LedgerHashInput
    expect(hashInput.holdedId).toBeUndefined();
    // @ts-expect-error — attachmentUrl is not on LedgerHashInput
    expect(hashInput.attachmentUrl).toBeUndefined();
    expect(hashInput.tenantId).toBe(TENANT);
    expect(hashInput.amount).toBe('1210.00');
  });

  it('mapping omits createdBy (auditoría, no contenido fiscal)', () => {
    const norm = normalizeAppendInput(baseInput({ createdBy: 'isaak-auto' }));
    const hashInput = toHashInput(norm, null);
    // @ts-expect-error — createdBy is not on LedgerHashInput
    expect(hashInput.createdBy).toBeUndefined();
  });
});

describe('SQL builders', () => {
  it('SELECT_LATEST_ENTRY_SQL filters by tenant_id first', () => {
    expect(SELECT_LATEST_ENTRY_SQL).toMatch(/WHERE tenant_id = \$1::uuid/);
    expect(SELECT_LATEST_ENTRY_SQL).toMatch(/ORDER BY sequence DESC/);
    expect(SELECT_LATEST_ENTRY_SQL).toMatch(/LIMIT 1/);
  });

  it('ADVISORY_LOCK_SQL uses hashtext on the tenant_id parameter', () => {
    expect(ADVISORY_LOCK_SQL).toMatch(/pg_advisory_xact_lock\(hashtext\(\$1::text\)\)/);
  });

  it('INSERT_ENTRY_SQL writes to isaak_ledger_entries and returns hash + sequence', () => {
    expect(INSERT_ENTRY_SQL).toMatch(/INSERT INTO isaak_ledger_entries/);
    expect(INSERT_ENTRY_SQL).toMatch(/RETURNING id, hash, prev_hash AS "prevHash", sequence/);
    // 20 parameters expected (tenant, date, doc_number, doc_type,
    // 2 counterparty, 5 amount/tax, 2 accounts, description, attachment,
    // 2 source, 2 hash, created_by) → ensure all $1..$20 are present.
    for (let i = 1; i <= 20; i++) {
      expect(INSERT_ENTRY_SQL).toContain(`$${i}`);
    }
    expect(INSERT_ENTRY_SQL).not.toContain('$21');
  });

  it('buildSelectChainSQL filters by tenant_id and orders by sequence ASC', () => {
    const sql = buildSelectChainSQL();
    expect(sql).toMatch(/WHERE tenant_id = \$1::uuid/);
    expect(sql).toMatch(/ORDER BY sequence ASC/);
    // It should select all canonical hash-input fields so the validator
    // can re-hash. tax_base / vat_amount / amount cast to text so JS gets
    // exact decimal strings (no float drift).
    expect(sql).toMatch(/amount::text AS "amount"/);
    expect(sql).toMatch(/tax_base::text AS "taxBase"/);
  });
});
