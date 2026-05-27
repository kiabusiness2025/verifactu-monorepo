import {
  CORE_PROFILE_FIELDS,
  R000_PROFILE_CHECK,
  evaluateProfile,
} from '../inspector-aeat-profile';
import { evaluateContext, type RuleContext, type TaxpayerProfileSnapshot } from '../inspector-aeat';

describe('CORE_PROFILE_FIELDS catalog', () => {
  it('exposes the three required core fields', () => {
    const required = CORE_PROFILE_FIELDS.filter((f) => f.required).map((f) => f.field);
    expect(required).toContain('taxpayerType');
    expect(required).toContain('territory');
    expect(required).toContain('vatRegime');
  });

  it('every field has a non-empty label and recommendation', () => {
    for (const f of CORE_PROFILE_FIELDS) {
      expect(f.label.length).toBeGreaterThan(5);
      expect(f.recommendation.length).toBeGreaterThan(20);
    }
  });
});

describe('evaluateProfile', () => {
  it('null profile → completeness=0, warning, all gaps listed', () => {
    const r = evaluateProfile(null);
    expect(r.completeness).toBe(0);
    expect(r.isComplete).toBe(false);
    expect(r.severity).toBe('warning');
    expect(r.gaps.length).toBe(CORE_PROFILE_FIELDS.length);
  });

  it('empty object profile behaves the same as null', () => {
    const r = evaluateProfile({});
    expect(r.completeness).toBe(0);
    expect(r.isComplete).toBe(false);
    expect(r.severity).toBe('warning');
  });

  it('only required fields filled → isComplete=true, severity=info, opcional gaps remain', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'sl',
      territory: 'comun',
      vatRegime: 'general',
    };
    const r = evaluateProfile(profile);
    expect(r.isComplete).toBe(true);
    expect(r.severity).toBe('info');
    expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.completeness).toBeGreaterThan(0);
    expect(r.completeness).toBeLessThan(1);
  });

  it('all fields filled → completeness=1, info OK', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'sl',
      territory: 'comun',
      vatRegime: 'general',
      corporateTaxSubject: true,
      hasEmployees: true,
      hasRentWithholding: false,
      hasProfessionalInvoices: true,
      hasIntraEUOperations: false,
      hasRelatedParties: true,
      usesBillingSoftware: true,
      annualTurnover: 250000,
      sector: 'consultoria',
    };
    const r = evaluateProfile(profile);
    expect(r.completeness).toBe(1);
    expect(r.gaps).toEqual([]);
    expect(r.isComplete).toBe(true);
    expect(r.severity).toBe('info');
  });

  it('missing a required field → warning, gaps include that field', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'autonomo',
      // territory missing
      vatRegime: 'general',
    };
    const r = evaluateProfile(profile);
    expect(r.isComplete).toBe(false);
    expect(r.severity).toBe('warning');
    expect(r.gaps.map((g) => g.field)).toContain('territory');
  });

  it('treats empty string as missing', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'sl',
      territory: 'comun',
      vatRegime: 'general',
      sector: '',
    };
    const r = evaluateProfile(profile);
    // sector vacío → cuenta como gap pero NO es required
    expect(r.gaps.some((g) => g.field === 'sector')).toBe(true);
    expect(r.isComplete).toBe(true);
  });
});

describe('R000 — Profile check rule wiring', () => {
  it('engine fires R000 only on action=profile_check', () => {
    const ctxProfile: RuleContext = {
      action: 'profile_check',
      data: { reason: 'onboarding' },
      profile: null,
    };
    const reportProfile = evaluateContext([R000_PROFILE_CHECK], ctxProfile);
    expect(reportProfile.warnings).toHaveLength(1);
    expect(reportProfile.warnings[0]?.ruleId).toBe('R000');

    const ctxOther: RuleContext = {
      action: 'invoice_in',
      data: {
        amount: '100.00',
        description: 'x',
        date: '2026-01-01',
      },
    };
    const reportOther = evaluateContext([R000_PROFILE_CHECK], ctxOther);
    expect(reportOther.warnings).toEqual([]);
    expect(reportOther.evaluatedRuleIds).toEqual([]);
  });

  it('R000 silencioso si perfil está completo', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'sl',
      territory: 'comun',
      vatRegime: 'general',
      corporateTaxSubject: true,
      hasEmployees: true,
      hasRentWithholding: false,
      hasProfessionalInvoices: true,
      hasIntraEUOperations: false,
      hasRelatedParties: true,
      usesBillingSoftware: true,
      annualTurnover: 1000,
      sector: 'x',
    };
    const ctx: RuleContext = {
      action: 'profile_check',
      data: { reason: 'pre_action' },
      profile,
    };
    const report = evaluateContext([R000_PROFILE_CHECK], ctx);
    expect(report.warnings).toEqual([]);
    expect(report.infos).toEqual([]);
  });

  it('R000 info-grade cuando solo faltan campos opcionales', () => {
    const profile: TaxpayerProfileSnapshot = {
      taxpayerType: 'sl',
      territory: 'comun',
      vatRegime: 'general',
    };
    const ctx: RuleContext = {
      action: 'profile_check',
      data: { reason: 'onboarding' },
      profile,
    };
    const report = evaluateContext([R000_PROFILE_CHECK], ctx);
    expect(report.warnings).toEqual([]);
    expect(report.infos).toHaveLength(1);
    expect(report.infos[0]?.ruleId).toBe('R000');
  });
});
