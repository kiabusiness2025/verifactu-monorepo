// Engine + helper tests for the F11 Inspector AEAT.

import {
  decimalEquals,
  decimalGT,
  decimalGTE,
  descriptionContainsAny,
  evaluateContext,
  formatLegalBasis,
  normalizeText,
  type AeatRule,
  type RuleContext,
  type RuleEvaluation,
  type TaxpayerProfileSnapshot,
} from '../inspector-aeat';

describe('helpers', () => {
  describe('decimalGT / GTE / Equals', () => {
    it('compares strings as decimals', () => {
      expect(decimalGT('1200.00', '1199.99')).toBe(true);
      expect(decimalGT('1000.00', '1000.00')).toBe(false);
      expect(decimalGTE('1000.00', '1000.00')).toBe(true);
      expect(decimalGTE('999.99', '1000.00')).toBe(false);
    });

    it('decimalEquals tolerates rounding noise within 0.5 cents', () => {
      expect(decimalEquals('1.21', '1.2100001')).toBe(true);
      expect(decimalEquals('1.21', '1.22')).toBe(false);
    });
  });

  describe('normalizeText', () => {
    it('strips accents and lowercases', () => {
      expect(normalizeText('Almacén Café')).toBe('almacen cafe');
      expect(normalizeText('LIVA Sección 96')).toBe('liva seccion 96');
    });
  });

  describe('descriptionContainsAny', () => {
    it('matches accent-insensitive substrings', () => {
      expect(descriptionContainsAny('Comida con cliente', ['comida'])).toBe(true);
      expect(descriptionContainsAny('Asesoría jurídica', ['asesoria'])).toBe(true);
    });

    it('does not match unrelated text', () => {
      expect(descriptionContainsAny('Material de oficina', ['gasolina'])).toBe(false);
      expect(descriptionContainsAny('', ['x'])).toBe(false);
    });
  });

  describe('formatLegalBasis', () => {
    it('joins multiple bases with +', () => {
      expect(
        formatLegalBasis([
          { law: 'LIVA', article: 'Art. 96.Uno.5º' },
          { law: 'LIVA', article: 'Art. 95.Tres' },
        ]),
      ).toBe('Art. 96.Uno.5º LIVA + Art. 95.Tres LIVA');
    });

    it('returns a single cite for one basis', () => {
      expect(formatLegalBasis([{ law: 'Ley 7/2012', article: 'Art. 7.Uno' }])).toBe(
        'Art. 7.Uno Ley 7/2012',
      );
    });
  });
});

describe('evaluateContext (engine)', () => {
  const ALWAYS_ERROR: AeatRule = {
    id: 'X001',
    category: 'contabilidad_pgc',
    description: 'siempre dispara error',
    appliesTo: { actions: ['journal'] },
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'error',
      message: 'always',
      legalBasis: [{ law: 'Test', article: 'Art. 1' }],
    }),
  };
  const ALWAYS_WARN: AeatRule = {
    id: 'X002',
    category: 'contabilidad_pgc',
    description: 'siempre dispara warning',
    appliesTo: { actions: ['journal', 'invoice_in'] },
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'warning',
      message: 'warn',
      legalBasis: [{ law: 'Test', article: 'Art. 1' }],
    }),
  };
  const NEVER: AeatRule = {
    id: 'X003',
    category: 'contabilidad_pgc',
    description: 'nunca dispara',
    appliesTo: { actions: ['journal'] },
    check: (): RuleEvaluation => ({ applies: false }),
  };
  const SCOPED_TO_OTHER: AeatRule = {
    id: 'X004',
    category: 'contabilidad_pgc',
    description: 'aplica solo a tax_payment',
    appliesTo: { actions: ['tax_payment'] },
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'info',
      message: 'should be skipped',
      legalBasis: [{ law: 'Test', article: 'Art. 1' }],
    }),
  };

  const journalCtx: RuleContext = {
    action: 'journal',
    data: { description: 'foo', amount: '10.00' },
  };

  it('returns passed=true when no rules apply', () => {
    const report = evaluateContext([NEVER], journalCtx);
    expect(report.passed).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.infos).toEqual([]);
    expect(report.evaluatedRuleIds).toEqual(['X003']);
    expect(report.skippedByScope).toEqual([]);
  });

  it('passed=false when any error is present', () => {
    const report = evaluateContext([ALWAYS_ERROR, ALWAYS_WARN], journalCtx);
    expect(report.passed).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.warnings).toHaveLength(1);
  });

  it('skips rules whose appliesTo.actions does not include the action', () => {
    const report = evaluateContext([SCOPED_TO_OTHER, ALWAYS_WARN], journalCtx);
    expect(report.evaluatedRuleIds).toEqual(['X002']);
    expect(report.warnings).toHaveLength(1);
  });

  it('groups violations by severity (error vs warning vs info)', () => {
    const INFO: AeatRule = {
      id: 'X005',
      category: 'contabilidad_pgc',
      description: 'info',
      appliesTo: { actions: ['journal'] },
      check: (): RuleEvaluation => ({
        applies: true,
        severity: 'info',
        message: 'i',
        legalBasis: [{ law: 'Test', article: 'Art. 1' }],
      }),
    };
    const report = evaluateContext([ALWAYS_ERROR, ALWAYS_WARN, INFO], journalCtx);
    expect(report.errors.map((v) => v.ruleId)).toEqual(['X001']);
    expect(report.warnings.map((v) => v.ruleId)).toEqual(['X002']);
    expect(report.infos.map((v) => v.ruleId)).toEqual(['X005']);
  });

  it('derives citation from legalBasis when result omits it', () => {
    const report = evaluateContext([ALWAYS_WARN], journalCtx);
    expect(report.warnings[0]?.citation).toBe('Art. 1 Test');
    expect(report.warnings[0]?.legalBasis).toHaveLength(1);
  });
});

describe('evaluateContext — profile scoping', () => {
  const SL_ONLY: AeatRule = {
    id: 'X100',
    category: 'sociedades',
    description: 'solo aplica a SL/SA',
    appliesTo: { actions: ['invoice_out'], taxpayerType: ['sl', 'sa'] },
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'warning',
      message: 'sl rule',
      legalBasis: [{ law: 'LIS', article: 'Art. 1' }],
    }),
  };
  const CANARIAS_ONLY: AeatRule = {
    id: 'X101',
    category: 'iva_repercutido',
    description: 'solo aplica a Canarias',
    appliesTo: { actions: ['invoice_out'], territory: ['canarias'] },
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'info',
      message: 'igic',
      legalBasis: [{ law: 'IGIC', article: 'Art. 1' }],
    }),
  };

  const baseInvoiceOut: RuleContext = {
    action: 'invoice_out',
    data: {
      amount: '100.00',
      description: 'Servicios',
      date: '2026-06-01',
      docType: 'invoice',
    },
  };

  it('without profile, rules fire regardless of dimension constraints (back-compat)', () => {
    const report = evaluateContext([SL_ONLY, CANARIAS_ONLY], baseInvoiceOut);
    expect(report.warnings.map((v) => v.ruleId)).toEqual(['X100']);
    expect(report.infos.map((v) => v.ruleId)).toEqual(['X101']);
    expect(report.skippedByScope).toEqual([]);
  });

  it('SL profile skips Canarias rule but matches SL rule', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'sl',
      territory: 'comun',
    };
    const ctx: RuleContext = { ...baseInvoiceOut, profile };
    const report = evaluateContext([SL_ONLY, CANARIAS_ONLY], ctx);
    expect(report.warnings.map((v) => v.ruleId)).toEqual(['X100']);
    expect(report.infos).toEqual([]);
    expect(report.skippedByScope).toEqual(['X101']);
  });

  it('autónomo profile in Canarias skips SL rule and matches Canarias rule', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'autonomo',
      territory: 'canarias',
    };
    const ctx: RuleContext = { ...baseInvoiceOut, profile };
    const report = evaluateContext([SL_ONLY, CANARIAS_ONLY], ctx);
    expect(report.warnings).toEqual([]);
    expect(report.infos.map((v) => v.ruleId)).toEqual(['X101']);
    expect(report.skippedByScope).toEqual(['X100']);
  });

  it('profile missing a dimension is treated permissively (matches)', () => {
    // No territory in profile → Canarias rule still applies (conservative).
    const profile: TaxpayerProfileSnapshot = { taxpayerType: 'sl' };
    const ctx: RuleContext = { ...baseInvoiceOut, profile };
    const report = evaluateContext([CANARIAS_ONLY], ctx);
    expect(report.infos).toHaveLength(1);
  });
});
