// Tests puros del servicio de perfil fiscal R000.

import {
  TAXPAYER_TYPES,
  TERRITORIES,
  VAT_REGIMES,
  mapCompanyProfileToTaxpayerInput,
  toSnapshot,
  validateTaxpayerProfileInput,
} from '../isaak-taxpayer-profile';

const TENANT = '11111111-1111-1111-1111-111111111111';

describe('catalog constants', () => {
  it('exposes 6 taxpayer types', () => {
    expect(TAXPAYER_TYPES.length).toBe(6);
    expect(TAXPAYER_TYPES).toContain('autonomo');
    expect(TAXPAYER_TYPES).toContain('sl');
  });

  it('exposes 5 territories', () => {
    expect(TERRITORIES.length).toBe(5);
    expect(TERRITORIES).toContain('canarias');
    expect(TERRITORIES).toContain('pais_vasco');
  });

  it('exposes 7 VAT regimes', () => {
    expect(VAT_REGIMES.length).toBe(7);
    expect(VAT_REGIMES).toContain('general');
    expect(VAT_REGIMES).toContain('recargo_equivalencia');
  });
});

describe('validateTaxpayerProfileInput', () => {
  it('accepts a fully filled valid input', () => {
    const out = validateTaxpayerProfileInput({
      tenantId: TENANT,
      taxpayerType: 'sl',
      territory: 'comun',
      vatRegime: 'general',
      sector: 'Consultoría',
      corporateTaxSubject: true,
      hasEmployees: true,
      hasRentWithholding: false,
      hasProfessionalInvoices: true,
      hasIntraEUOperations: false,
      hasRelatedParties: true,
      usesBillingSoftware: true,
      annualTurnover: 250000,
      notes: '  algo  ',
      confirmedByUser: true,
      confirmedBy: 'user-1',
    });
    expect(out.taxpayerType).toBe('sl');
    expect(out.sector).toBe('consultoría');
    expect(out.annualTurnover).toBe('250000.00');
    expect(out.notes).toBe('algo');
    expect(out.confirmedByUser).toBe(true);
  });

  it('accepts a minimal input with only tenantId', () => {
    const out = validateTaxpayerProfileInput({ tenantId: TENANT });
    expect(out.taxpayerType).toBeNull();
    expect(out.territory).toBeNull();
    expect(out.annualTurnover).toBeNull();
    expect(out.confirmedByUser).toBe(false);
  });

  it('rejects invalid UUID', () => {
    expect(() => validateTaxpayerProfileInput({ tenantId: 'x' })).toThrow(/UUID/);
  });

  it('rejects unknown taxpayerType / territory / vatRegime', () => {
    expect(() =>
      validateTaxpayerProfileInput({
        tenantId: TENANT,
        taxpayerType: 'wrong' as 'sl',
      }),
    ).toThrow(/taxpayerType/);
    expect(() =>
      validateTaxpayerProfileInput({
        tenantId: TENANT,
        territory: 'mars' as 'comun',
      }),
    ).toThrow(/territory/);
    expect(() =>
      validateTaxpayerProfileInput({
        tenantId: TENANT,
        vatRegime: 'wrong' as 'general',
      }),
    ).toThrow(/vatRegime/);
  });

  it('rejects negative annualTurnover', () => {
    expect(() =>
      validateTaxpayerProfileInput({ tenantId: TENANT, annualTurnover: -1000 }),
    ).toThrow(/annualTurnover/);
  });

  it('accepts annualTurnover as string', () => {
    const out = validateTaxpayerProfileInput({
      tenantId: TENANT,
      annualTurnover: '125000.50',
    });
    expect(out.annualTurnover).toBe('125000.50');
  });

  it('trims and lowercases sector; trims notes', () => {
    const out = validateTaxpayerProfileInput({
      tenantId: TENANT,
      sector: '  HOSTELERIA  ',
      notes: '  pyme familiar  ',
    });
    expect(out.sector).toBe('hosteleria');
    expect(out.notes).toBe('pyme familiar');
  });
});

describe('mapCompanyProfileToTaxpayerInput (CI → Inspector)', () => {
  it('translates UPPER_CASE CI shape to lower-case Inspector shape', () => {
    const out = mapCompanyProfileToTaxpayerInput({
      tenantId: TENANT,
      ci: {
        legalForm: 'SL',
        taxResidence: 'CANARIAS',
        vatRegime: 'GENERAL',
        sector: 'consultoria',
        corporateTaxSubject: true,
        hasIntraEUOperations: false,
        annualTurnover: 100000,
      },
    });
    expect(out.tenantId).toBe(TENANT);
    expect(out.taxpayerType).toBe('sl');
    expect(out.territory).toBe('canarias');
    expect(out.vatRegime).toBe('general');
    expect(out.prefilledFromCi).toBe(true);
    expect(out.confirmedByUser).toBe(false);
  });

  it('maps AUTONOMO → autonomo and PAIS_VASCO → pais_vasco', () => {
    const out = mapCompanyProfileToTaxpayerInput({
      tenantId: TENANT,
      ci: { legalForm: 'AUTONOMO', taxResidence: 'PAIS_VASCO' },
    });
    expect(out.taxpayerType).toBe('autonomo');
    expect(out.territory).toBe('pais_vasco');
  });

  it('maps COOP → asociacion (no hay forma cooperativa en inspector)', () => {
    const out = mapCompanyProfileToTaxpayerInput({
      tenantId: TENANT,
      ci: { legalForm: 'COOP' },
    });
    expect(out.taxpayerType).toBe('asociacion');
  });

  it('returns null fields when CI dimension is null/unknown', () => {
    const out = mapCompanyProfileToTaxpayerInput({
      tenantId: TENANT,
      ci: { legalForm: 'UNKNOWN' as 'SL' },
    });
    expect(out.taxpayerType).toBeNull();
  });
});

describe('toSnapshot', () => {
  it('converts normalized row to TaxpayerProfileSnapshot', () => {
    const snap = toSnapshot({
      tenantId: TENANT,
      taxpayerType: 'sl',
      territory: 'comun',
      vatRegime: 'general',
      sector: 'consultoria',
      corporateTaxSubject: true,
      hasEmployees: true,
      hasRentWithholding: false,
      hasProfessionalInvoices: true,
      hasIntraEUOperations: false,
      hasRelatedParties: true,
      usesBillingSoftware: true,
      annualTurnover: '250000.00',
      notes: null,
      confirmedByUser: true,
      confirmedBy: 'u-1',
      prefilledFromCi: false,
    });
    expect(snap.taxpayerType).toBe('sl');
    expect(snap.annualTurnover).toBe(250000);
  });

  it('keeps annualTurnover as null when row has none', () => {
    const snap = toSnapshot({
      tenantId: TENANT,
      taxpayerType: null,
      territory: null,
      vatRegime: null,
      sector: null,
      corporateTaxSubject: null,
      hasEmployees: null,
      hasRentWithholding: null,
      hasProfessionalInvoices: null,
      hasIntraEUOperations: null,
      hasRelatedParties: null,
      usesBillingSoftware: null,
      annualTurnover: null,
      notes: null,
      confirmedByUser: false,
      confirmedBy: null,
      prefilledFromCi: false,
    });
    expect(snap.annualTurnover).toBeNull();
  });
});
