import {
  detectLegalForm,
  normalizeLegalName,
  normalizeSpanishNif,
  normalizeVatNumber,
  validateNifFormat,
} from '../company-intelligence-normalizers';
import { scoreCompanyMatch } from '../company-intelligence-scoring';
import {
  BormeAdapter,
  GleifAdapter,
  PlacspAdapter,
  UserProvidedAdapter,
  ViesAdapter,
} from '../company-intelligence-sources';
import {
  CompanyIntelligenceService,
  deriveCompanyWarningFlags,
  inferLikelyFiscalObligations,
  inferLikelyTaxpayerType,
} from '../company-intelligence-service';
import {
  COMPANY_INTELLIGENCE_RULES,
  runCompanyIntelligenceRules,
} from '../company-intelligence-rules';
import type {
  CompanyMatch,
  CompanyProfile,
  CompanyProfileInput,
} from '../company-intelligence-types';

// ── normalizeLegalName ────────────────────────────────────────────────────────

describe('normalizeLegalName', () => {
  test('converts to uppercase', () => {
    expect(normalizeLegalName('acme widgets')).toBe('ACME WIDGETS');
  });

  test('collapses multiple spaces', () => {
    expect(normalizeLegalName('ACME  WIDGETS   SL')).toBe('ACME WIDGETS SL');
  });

  test('normalizes S.L. suffix', () => {
    expect(normalizeLegalName('Empresa Ejemplo, S.L.')).toContain('SL');
  });

  test('normalizes SOCIEDAD LIMITADA suffix', () => {
    const result = normalizeLegalName('EMPRESA EJEMPLO SOCIEDAD LIMITADA');
    expect(result).toContain('SL');
    expect(result).not.toContain('SOCIEDAD LIMITADA');
  });

  test('normalizes S.A. suffix', () => {
    expect(normalizeLegalName('Gran Empresa, S.A.')).toContain('SA');
  });

  test('normalizes S.COOP. suffix', () => {
    expect(normalizeLegalName('Cooperativa Agricola S.COOP.')).toContain('COOP');
  });

  test('removes accents', () => {
    expect(normalizeLegalName('Fundación Española')).toBe('FUNDACION ESPANOLA');
  });
});

// ── detectLegalForm ───────────────────────────────────────────────────────────

describe('detectLegalForm', () => {
  test('detects SL from S.L. suffix', () => {
    expect(detectLegalForm('Empresa Ejemplo, S.L.')).toBe('SL');
  });

  test('detects SA from S.A. suffix', () => {
    expect(detectLegalForm('Gran Empresa, S.A.')).toBe('SA');
  });

  test('detects AUTONOMO from individual NIF (8 digits + letter)', () => {
    expect(detectLegalForm('Juan Pérez García', '12345678Z')).toBe('AUTONOMO');
  });

  test('detects SL from CIF starting with B', () => {
    expect(detectLegalForm('Empresa SL', 'B12345678')).toBe('SL');
  });

  test('detects SA from CIF starting with A', () => {
    expect(detectLegalForm('Gran SA', 'A58818501')).toBe('SA');
  });

  test('detects COOP from name pattern', () => {
    expect(detectLegalForm('Cooperativa Agrícola S.COOP.')).toBe('COOP');
  });

  test('returns UNKNOWN for unrecognized name without NIF', () => {
    expect(detectLegalForm('Empresa Sin Forma')).toBe('UNKNOWN');
  });

  test('detects AUTONOMO from NIE prefix X', () => {
    expect(detectLegalForm('John Doe', 'X1234567L')).toBe('AUTONOMO');
  });
});

// ── normalizeSpanishNif ───────────────────────────────────────────────────────

describe('normalizeSpanishNif', () => {
  test('uppercases', () => {
    expect(normalizeSpanishNif('b12345678')).toBe('B12345678');
  });

  test('removes spaces and hyphens', () => {
    expect(normalizeSpanishNif('B 12 345 678')).toBe('B12345678');
    expect(normalizeSpanishNif('B-12-345-678')).toBe('B12345678');
  });

  test('removes ES prefix', () => {
    expect(normalizeSpanishNif('ESB12345678')).toBe('B12345678');
    expect(normalizeSpanishNif('ES12345678Z')).toBe('12345678Z');
  });
});

// ── validateNifFormat ─────────────────────────────────────────────────────────

describe('validateNifFormat', () => {
  // Valid individual NIFs (real-world checksum)
  test('accepts valid individual NIF', () => {
    // 00000000T — 0 mod 23 = T
    expect(validateNifFormat('00000000T')).toBe(true);
  });

  test('rejects NIF with wrong control letter', () => {
    expect(validateNifFormat('12345678A')).toBe(false);
  });

  test('rejects too-short string', () => {
    expect(validateNifFormat('1234')).toBe(false);
  });

  // NIE
  test('accepts valid NIE X0000000T', () => {
    // X0000000 → 00000000 → mod23=0 → T
    expect(validateNifFormat('X0000000T')).toBe(true);
  });

  test('rejects NIE with bad control letter', () => {
    expect(validateNifFormat('X0000000A')).toBe(false);
  });

  // CIF — A58818501 is a well-known real CIF (Inditex old)
  test('accepts well-formed CIF A58818501', () => {
    // A58818501 — standard test CIF used widely in Spanish dev docs
    expect(validateNifFormat('A58818501')).toBe(true);
  });

  test('rejects CIF with wrong control character', () => {
    expect(validateNifFormat('A58818509')).toBe(false);
  });
});

// ── normalizeVatNumber ────────────────────────────────────────────────────────

describe('normalizeVatNumber', () => {
  test('adds ES prefix for ES country', () => {
    expect(normalizeVatNumber('B12345678')).toBe('ESB12345678');
  });

  test('does not double-add ES prefix', () => {
    expect(normalizeVatNumber('ESB12345678')).toBe('ESB12345678');
  });

  test('cleans spaces', () => {
    expect(normalizeVatNumber('ES B12 345 678')).toBe('ESB12345678');
  });

  test('returns as-is for non-ES country', () => {
    expect(normalizeVatNumber('DE123456789', 'DE')).toBe('DE123456789');
  });
});

// ── scoreCompanyMatch ─────────────────────────────────────────────────────────

describe('scoreCompanyMatch', () => {
  const baseInput: CompanyProfileInput = {
    legalName: 'Empresa Ejemplo SL',
    nif: 'B12345678',
    province: 'MADRID',
  };

  test('NIF exact match yields high score', () => {
    const candidate: CompanyMatch = {
      source: 'BORME',
      legalName: 'Empresa Ejemplo SL',
      nif: 'B12345678',
    };
    const result = scoreCompanyMatch(baseInput, candidate);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.confidence).toBe('HIGH');
    expect(result.reasons).toContain('NIF exact match');
  });

  test('NIF mismatch penalizes score heavily', () => {
    const candidate: CompanyMatch = {
      source: 'GLEIF',
      legalName: 'Empresa Ejemplo SL',
      nif: 'B99999999',
    };
    const result = scoreCompanyMatch(baseInput, candidate);
    expect(result.score).toBeLessThan(40);
  });

  test('name-only match yields medium confidence', () => {
    const input: CompanyProfileInput = { legalName: 'Empresa Ejemplo SL' };
    const candidate: CompanyMatch = {
      source: 'GLEIF',
      legalName: 'Empresa Ejemplo SL',
    };
    const result = scoreCompanyMatch(input, candidate);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.reasons.some((r) => r.includes('Legal name'))).toBe(true);
  });

  test('province match adds to score', () => {
    const candidate: CompanyMatch = {
      source: 'BORME',
      legalName: 'Empresa Ejemplo SL',
      nif: 'B12345678',
      province: 'MADRID',
    };
    const withProvince = scoreCompanyMatch(baseInput, candidate);
    const withoutProvince = scoreCompanyMatch({ ...baseInput, province: undefined }, candidate);
    expect(withProvince.score).toBeGreaterThan(withoutProvince.score);
  });

  test('score is clamped to 0–100', () => {
    const candidate: CompanyMatch = {
      source: 'BORME',
      legalName: 'Empresa Ejemplo SL',
      nif: 'B12345678',
      vatNumber: 'ESB12345678',
      province: 'MADRID',
    };
    const result = scoreCompanyMatch({ ...baseInput, vatNumber: 'ESB12345678' }, candidate);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ── UserProvidedAdapter ───────────────────────────────────────────────────────

describe('UserProvidedAdapter', () => {
  const adapter = new UserProvidedAdapter();

  test('returns empty when no input', async () => {
    expect(await adapter.search({})).toHaveLength(0);
  });

  test('returns one match when legalName given', async () => {
    const matches = await adapter.search({ legalName: 'Test SL', nif: 'B12345678' });
    expect(matches).toHaveLength(1);
    expect(matches[0].source).toBe('USER');
    expect(matches[0].confidence).toBe('HIGH');
  });
});

// ── ViesAdapter (mocked fetch) ────────────────────────────────────────────────

function makeFetch(body: unknown, status = 200): typeof fetch {
  return async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response;
}

describe('ViesAdapter', () => {
  test('search returns empty when no vat/nif', async () => {
    const adapter = new ViesAdapter({ fetchFn: makeFetch({}) });
    expect(await adapter.search({})).toHaveLength(0);
  });

  test('search returns match for valid VIES response', async () => {
    const adapter = new ViesAdapter({
      fetchFn: makeFetch({ valid: true, name: 'EMPRESA EJEMPLO SL', address: 'CALLE X 1' }),
    });
    const matches = await adapter.search({ vatNumber: 'ESB12345678' });
    expect(matches).toHaveLength(1);
    expect(matches[0].source).toBe('VIES');
    expect(matches[0].legalName).toBe('EMPRESA EJEMPLO SL');
  });

  test('search returns empty for invalid VIES response', async () => {
    const adapter = new ViesAdapter({ fetchFn: makeFetch({ valid: false }) });
    const matches = await adapter.search({ vatNumber: 'ESB12345678' });
    expect(matches).toHaveLength(0);
  });

  test('checkVat returns ViesSignal for valid response', async () => {
    const adapter = new ViesAdapter({
      fetchFn: makeFetch({ valid: true, name: 'EMPRESA EJEMPLO SL' }),
    });
    const signal = await adapter.checkVat('B12345678');
    expect(signal).not.toBeNull();
    expect(signal?.valid).toBe(true);
    expect(signal?.vatNumber).toBe('ESB12345678');
  });

  test('checkVat returns null on fetch error', async () => {
    const errorFetch: typeof fetch = async () => {
      throw new Error('network error');
    };
    const adapter = new ViesAdapter({ fetchFn: errorFetch });
    expect(await adapter.checkVat('B12345678')).toBeNull();
  });
});

// ── GleifAdapter (mocked fetch) ───────────────────────────────────────────────

describe('GleifAdapter', () => {
  test('search returns empty when no input', async () => {
    const adapter = new GleifAdapter({ fetchFn: makeFetch({ data: [] }) });
    expect(await adapter.search({})).toHaveLength(0);
  });

  test('search returns up to 3 matches', async () => {
    const adapter = new GleifAdapter({
      fetchFn: makeFetch({
        data: [
          { attributes: { value: 'EMPRESA A' } },
          { attributes: { value: 'EMPRESA B' } },
          { attributes: { value: 'EMPRESA C' } },
          { attributes: { value: 'EMPRESA D' } },
        ],
      }),
    });
    const matches = await adapter.search({ legalName: 'EMPRESA' });
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  test('lookupLei returns LeiSignal on valid response', async () => {
    const adapter = new GleifAdapter({
      fetchFn: makeFetch({
        data: [
          {
            attributes: {
              lei: '549300ABCDEF123456XX',
              entity: { status: 'ACTIVE', legalName: { name: 'EMPRESA SA' }, jurisdiction: 'ES' },
            },
          },
        ],
      }),
    });
    const signal = await adapter.lookupLei('EMPRESA SA');
    expect(signal?.lei).toBe('549300ABCDEF123456XX');
    expect(signal?.status).toBe('ACTIVE');
  });
});

// ── BormeAdapter ──────────────────────────────────────────────────────────────

describe('BormeAdapter', () => {
  test('search always returns empty (no public search API)', async () => {
    const adapter = new BormeAdapter();
    expect(await adapter.search({ legalName: 'Test SL' })).toHaveLength(0);
  });
});

// ── PlacspAdapter ─────────────────────────────────────────────────────────────

describe('PlacspAdapter', () => {
  test('search always returns empty', async () => {
    const adapter = new PlacspAdapter();
    expect(await adapter.search({ nif: 'B12345678' })).toHaveLength(0);
  });
});

// ── inferLikelyTaxpayerType ───────────────────────────────────────────────────

describe('inferLikelyTaxpayerType', () => {
  test('AUTONOMO → AUTONOMO', () => expect(inferLikelyTaxpayerType('AUTONOMO')).toBe('AUTONOMO'));
  test('SL → SOCIEDAD', () => expect(inferLikelyTaxpayerType('SL')).toBe('SOCIEDAD'));
  test('SA → SOCIEDAD', () => expect(inferLikelyTaxpayerType('SA')).toBe('SOCIEDAD'));
  test('COOP → SOCIEDAD', () => expect(inferLikelyTaxpayerType('COOP')).toBe('SOCIEDAD'));
  test('ASOCIACION → ENTIDAD', () => expect(inferLikelyTaxpayerType('ASOCIACION')).toBe('ENTIDAD'));
  test('FUNDACION → ENTIDAD', () => expect(inferLikelyTaxpayerType('FUNDACION')).toBe('ENTIDAD'));
  test('UNKNOWN → UNKNOWN', () => expect(inferLikelyTaxpayerType('UNKNOWN')).toBe('UNKNOWN'));
  test('undefined → UNKNOWN', () => expect(inferLikelyTaxpayerType(undefined)).toBe('UNKNOWN'));
});

// ── inferLikelyFiscalObligations ──────────────────────────────────────────────

describe('inferLikelyFiscalObligations', () => {
  test('autónomo with employees and rent gets 303+111+115+130', () => {
    const input: CompanyProfileInput = {
      hasEmployees: true,
      hasRentWithholding: true,
    };
    const obs = inferLikelyFiscalObligations(input, 'AUTONOMO', 'GENERAL');
    expect(obs).toContain('MODEL_303');
    expect(obs).toContain('MODEL_111');
    expect(obs).toContain('MODEL_115');
    expect(obs).toContain('MODEL_130');
  });

  test('sociedad with high turnover gets 200+202', () => {
    const input: CompanyProfileInput = { annualTurnover: 10_000_000 };
    const obs = inferLikelyFiscalObligations(input, 'SOCIEDAD', 'GENERAL');
    expect(obs).toContain('MODEL_200');
    expect(obs).toContain('MODEL_202');
  });

  test('intraEU ops trigger 349', () => {
    const input: CompanyProfileInput = { hasIntraEUOperations: true };
    const obs = inferLikelyFiscalObligations(input, 'SOCIEDAD', 'GENERAL');
    expect(obs).toContain('MODEL_349');
  });

  test('billing software triggers VERIFACTU_SIF', () => {
    const input: CompanyProfileInput = { usesBillingSoftware: true };
    const obs = inferLikelyFiscalObligations(input, 'SOCIEDAD', 'GENERAL');
    expect(obs).toContain('VERIFACTU_SIF');
  });

  test('EXENTO vat regime skips 303', () => {
    const obs = inferLikelyFiscalObligations({}, 'AUTONOMO', 'EXENTO');
    expect(obs).not.toContain('MODEL_303');
  });

  test('no duplicate obligations', () => {
    const input: CompanyProfileInput = {
      hasEmployees: true,
      hasRentWithholding: true,
      usesBillingSoftware: true,
    };
    const obs = inferLikelyFiscalObligations(input, 'AUTONOMO', 'GENERAL');
    const unique = [...new Set(obs)];
    expect(obs).toHaveLength(unique.length);
  });
});

// ── deriveCompanyWarningFlags ─────────────────────────────────────────────────

describe('deriveCompanyWarningFlags', () => {
  test('flags MISSING_NIF when no NIF', () => {
    const flags = deriveCompanyWarningFlags({}, null, 'GENERAL');
    expect(flags).toContain('MISSING_NIF');
  });

  test('flags INVALID_NIF_FORMAT for bad NIF', () => {
    const flags = deriveCompanyWarningFlags({ nif: 'INVALIDO' }, null, 'GENERAL');
    expect(flags).toContain('INVALID_NIF_FORMAT');
  });

  test('no NIF flags for valid NIF', () => {
    // 00000000T is a valid NIF (0 mod 23 = T)
    const flags = deriveCompanyWarningFlags({ nif: '00000000T' }, null, 'GENERAL');
    expect(flags).not.toContain('MISSING_NIF');
    expect(flags).not.toContain('INVALID_NIF_FORMAT');
  });

  test('flags MISSING_TAX_RESIDENCE when not declared', () => {
    const flags = deriveCompanyWarningFlags({}, null, 'GENERAL');
    expect(flags).toContain('MISSING_TAX_RESIDENCE');
  });

  test('no MISSING_TAX_RESIDENCE when declared', () => {
    const flags = deriveCompanyWarningFlags(
      { declaredTaxResidence: 'REGIMEN_COMUN' },
      null,
      'GENERAL'
    );
    expect(flags).not.toContain('MISSING_TAX_RESIDENCE');
  });

  test('flags MISSING_VAT_REGIME for UNKNOWN regime', () => {
    const flags = deriveCompanyWarningFlags({}, null, 'UNKNOWN');
    expect(flags).toContain('MISSING_VAT_REGIME');
  });

  test('flags LOW_CONFIDENCE_COMPANY_MATCH for low-confidence match', () => {
    const match: CompanyMatch = { source: 'GLEIF', confidence: 'LOW' };
    const flags = deriveCompanyWarningFlags({}, match, 'GENERAL');
    expect(flags).toContain('LOW_CONFIDENCE_COMPANY_MATCH');
  });
});

// ── CompanyIntelligenceService ────────────────────────────────────────────────

describe('CompanyIntelligenceService', () => {
  function makeService(fetchFn?: typeof fetch) {
    return new CompanyIntelligenceService({
      adapters: [
        new UserProvidedAdapter(),
        new ViesAdapter({ fetchFn: fetchFn ?? makeFetch({ valid: false }) }),
        new GleifAdapter({ fetchFn: fetchFn ?? makeFetch({ data: [] }) }),
      ],
      minScore: 30,
    });
  }

  test('buildProfile returns a CompanyProfile shape', async () => {
    const service = makeService();
    const profile = await service.buildProfile({ legalName: 'Empresa Test SL', nif: 'B12345678' });
    expect(profile).toHaveProperty('identity');
    expect(profile).toHaveProperty('registry');
    expect(profile).toHaveProperty('fiscal');
    expect(profile).toHaveProperty('businessSignals');
    expect(profile).toHaveProperty('provenance');
  });

  test('legalName is preserved in profile identity', async () => {
    const service = makeService();
    const profile = await service.buildProfile({ legalName: 'Mi Empresa SL' });
    expect(profile.identity.legalName).toBe('Mi Empresa SL');
  });

  test('NIF is propagated to profile identity', async () => {
    const service = makeService();
    const profile = await service.buildProfile({ legalName: 'Empresa SA', nif: 'A58818501' });
    expect(profile.identity.nif).toBe('A58818501');
  });

  test('registry has ACTIVE_ASSUMED status signal', async () => {
    const service = makeService();
    const profile = await service.buildProfile({ legalName: 'Empresa Test SL' });
    expect(profile.registry.statusSignals).toContain('ACTIVE_ASSUMED');
  });

  test('provenance includes USER when user data provided', async () => {
    const service = makeService();
    const profile = await service.buildProfile({ legalName: 'Test SL', nif: 'B12345678' });
    expect(profile.provenance.some((p) => p.source === 'USER')).toBe(true);
  });
});

// ── Company Intelligence Rules ────────────────────────────────────────────────

function makeProfile(overrides?: Partial<CompanyProfile>): CompanyProfile {
  return {
    identity: {
      legalName: 'Empresa Test SL',
      normalizedLegalName: 'EMPRESA TEST SL',
      nif: '00000000T',
      country: 'ES',
    },
    registry: { events: [], statusSignals: ['ACTIVE_ASSUMED'] },
    fiscal: {
      likelyTaxpayerType: 'SOCIEDAD',
      likelyVatRegime: 'GENERAL',
      likelyObligations: ['VERIFACTU_SIF'],
      warningFlags: [],
    },
    businessSignals: {},
    provenance: [],
    ...overrides,
  };
}

describe('COMPANY_INTELLIGENCE_RULES', () => {
  test('9 rules total (C001-C007 + R040A + R040B)', () => {
    expect(COMPANY_INTELLIGENCE_RULES).toHaveLength(9);
  });

  test('C001 fires for MISSING_NIF', () => {
    const profile = makeProfile({
      fiscal: {
        likelyObligations: [],
        warningFlags: ['MISSING_NIF'],
      },
    });
    const results = runCompanyIntelligenceRules(profile);
    const c001 = results.find((r) => r.ruleId === 'C001');
    expect(c001).toBeDefined();
    expect(c001?.severity).toBe('ERROR');
  });

  test('C001 does NOT fire when NIF present and valid', () => {
    const profile = makeProfile();
    const results = runCompanyIntelligenceRules(profile);
    expect(results.find((r) => r.ruleId === 'C001')).toBeUndefined();
  });

  test('C002 fires for INVALID_NIF_FORMAT', () => {
    const profile = makeProfile({
      identity: { legalName: 'Test', normalizedLegalName: 'TEST', nif: 'INVALIDO' },
      fiscal: { likelyObligations: [], warningFlags: ['INVALID_NIF_FORMAT'] },
    });
    const results = runCompanyIntelligenceRules(profile);
    expect(results.find((r) => r.ruleId === 'C002')).toBeDefined();
  });

  test('C003 fires for MISSING_LEGAL_FORM', () => {
    const profile = makeProfile({
      fiscal: { likelyObligations: [], warningFlags: ['MISSING_LEGAL_FORM'] },
    });
    expect(runCompanyIntelligenceRules(profile).find((r) => r.ruleId === 'C003')).toBeDefined();
  });

  test('C004 fires for MISSING_VAT_REGIME', () => {
    const profile = makeProfile({
      fiscal: { likelyObligations: [], warningFlags: ['MISSING_VAT_REGIME'] },
    });
    expect(runCompanyIntelligenceRules(profile).find((r) => r.ruleId === 'C004')).toBeDefined();
  });

  test('C005 fires for MISSING_TAX_RESIDENCE', () => {
    const profile = makeProfile({
      fiscal: { likelyObligations: [], warningFlags: ['MISSING_TAX_RESIDENCE'] },
    });
    expect(runCompanyIntelligenceRules(profile).find((r) => r.ruleId === 'C005')).toBeDefined();
  });

  test('C006 fires for LOW_CONFIDENCE_COMPANY_MATCH', () => {
    const profile = makeProfile({
      fiscal: { likelyObligations: [], warningFlags: ['LOW_CONFIDENCE_COMPANY_MATCH'] },
    });
    expect(runCompanyIntelligenceRules(profile).find((r) => r.ruleId === 'C006')).toBeDefined();
  });

  test('C007 fires for VIES_INVALID', () => {
    const profile = makeProfile({
      fiscal: { likelyObligations: [], warningFlags: ['VIES_INVALID'] },
    });
    expect(runCompanyIntelligenceRules(profile).find((r) => r.ruleId === 'C007')).toBeDefined();
  });

  test('R040A fires INFO for SOCIEDAD with VERIFACTU_SIF obligation', () => {
    const profile = makeProfile();
    const results = runCompanyIntelligenceRules(profile);
    const r040a = results.find((r) => r.ruleId === 'R040A');
    expect(r040a).toBeDefined();
    // Date is still future, should be INFO or WARNING
    expect(['INFO', 'WARNING', 'ERROR']).toContain(r040a?.severity);
  });

  test('R040A does NOT fire for AUTONOMO', () => {
    const profile = makeProfile({
      fiscal: {
        likelyTaxpayerType: 'AUTONOMO',
        likelyObligations: ['VERIFACTU_SIF'],
        warningFlags: [],
      },
    });
    const results = runCompanyIntelligenceRules(profile);
    expect(results.find((r) => r.ruleId === 'R040A')).toBeUndefined();
  });

  test('R040B fires for AUTONOMO with VERIFACTU_SIF obligation', () => {
    const profile = makeProfile({
      fiscal: {
        likelyTaxpayerType: 'AUTONOMO',
        likelyObligations: ['VERIFACTU_SIF'],
        warningFlags: [],
      },
    });
    const results = runCompanyIntelligenceRules(profile);
    const r040b = results.find((r) => r.ruleId === 'R040B');
    expect(r040b).toBeDefined();
    expect(['INFO', 'WARNING', 'ERROR']).toContain(r040b?.severity);
  });

  test('R040B does NOT fire for SOCIEDAD', () => {
    const profile = makeProfile();
    const results = runCompanyIntelligenceRules(profile);
    expect(results.find((r) => r.ruleId === 'R040B')).toBeUndefined();
  });

  test('R040A message includes daysUntil or past-date indication', () => {
    const profile = makeProfile();
    const results = runCompanyIntelligenceRules(profile);
    const r040a = results.find((r) => r.ruleId === 'R040A');
    expect(r040a?.message).toMatch(/2027|días/);
  });

  test('no rules fire for a clean profile with no obligations', () => {
    const cleanProfile = makeProfile({
      fiscal: {
        likelyTaxpayerType: 'SOCIEDAD',
        likelyVatRegime: 'GENERAL',
        likelyObligations: [],
        warningFlags: [],
      },
    });
    expect(runCompanyIntelligenceRules(cleanProfile)).toHaveLength(0);
  });

  test('runCompanyIntelligenceRules returns array (never throws)', () => {
    const emptyProfile = makeProfile({
      identity: { legalName: '', normalizedLegalName: '' },
      fiscal: { likelyObligations: [], warningFlags: [] },
    });
    expect(() => runCompanyIntelligenceRules(emptyProfile)).not.toThrow();
    expect(Array.isArray(runCompanyIntelligenceRules(emptyProfile))).toBe(true);
  });
});
