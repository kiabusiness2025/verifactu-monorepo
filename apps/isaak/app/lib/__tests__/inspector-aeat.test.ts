// Engine + helper tests for the F11 Inspector AEAT.

import {
  decimalEquals,
  decimalGT,
  decimalGTE,
  descriptionContainsAny,
  evaluateContext,
  normalizeText,
  type AeatRule,
  type RuleContext,
  type RuleEvaluation,
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
      expect(descriptionContainsAny('Compra de portátil', ['portatil'])).toBe(true);
    });

    it('does not match unrelated text', () => {
      expect(descriptionContainsAny('Material de oficina', ['gasolina'])).toBe(false);
      expect(descriptionContainsAny('', ['x'])).toBe(false);
    });
  });
});

describe('evaluateContext (engine)', () => {
  const ALWAYS_ERROR: AeatRule = {
    id: 'X001',
    category: 'contabilidad_pgc',
    description: 'siempre dispara error',
    appliesTo: ['journal'],
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'error',
      message: 'always',
      citation: 'test',
    }),
  };
  const ALWAYS_WARN: AeatRule = {
    id: 'X002',
    category: 'contabilidad_pgc',
    description: 'siempre dispara warning',
    appliesTo: ['journal', 'invoice_in'],
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'warning',
      message: 'warn',
      citation: 'test',
    }),
  };
  const NEVER: AeatRule = {
    id: 'X003',
    category: 'contabilidad_pgc',
    description: 'nunca dispara',
    appliesTo: ['journal'],
    check: (): RuleEvaluation => ({ applies: false }),
  };
  const SCOPED_TO_OTHER: AeatRule = {
    id: 'X004',
    category: 'contabilidad_pgc',
    description: 'aplica solo a tax_payment',
    appliesTo: ['tax_payment'],
    check: (): RuleEvaluation => ({
      applies: true,
      severity: 'info',
      message: 'should be skipped',
      citation: 'test',
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
  });

  it('passed=false when any error is present', () => {
    const report = evaluateContext([ALWAYS_ERROR, ALWAYS_WARN], journalCtx);
    expect(report.passed).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.warnings).toHaveLength(1);
  });

  it('skips rules whose appliesTo does not include the action', () => {
    const report = evaluateContext([SCOPED_TO_OTHER, ALWAYS_WARN], journalCtx);
    expect(report.evaluatedRuleIds).toEqual(['X002']);
    expect(report.warnings).toHaveLength(1);
  });

  it('groups violations by severity (error vs warning vs info)', () => {
    const INFO: AeatRule = {
      id: 'X005',
      category: 'contabilidad_pgc',
      description: 'info',
      appliesTo: ['journal'],
      check: (): RuleEvaluation => ({
        applies: true,
        severity: 'info',
        message: 'i',
        citation: 't',
      }),
    };
    const report = evaluateContext([ALWAYS_ERROR, ALWAYS_WARN, INFO], journalCtx);
    expect(report.errors.map((v) => v.ruleId)).toEqual(['X001']);
    expect(report.warnings.map((v) => v.ruleId)).toEqual(['X002']);
    expect(report.infos.map((v) => v.ruleId)).toEqual(['X005']);
  });

  it('carries through suggestedAction when the rule provides one', () => {
    const RULE: AeatRule = {
      id: 'X006',
      category: 'contabilidad_pgc',
      description: '',
      appliesTo: ['journal'],
      check: (): RuleEvaluation => ({
        applies: true,
        severity: 'warning',
        message: 'm',
        citation: 'c',
        suggestedAction: 'do x',
      }),
    };
    const report = evaluateContext([RULE], journalCtx);
    expect(report.warnings[0]?.suggestedAction).toBe('do x');
  });
});
