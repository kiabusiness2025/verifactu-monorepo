/** @jest-environment node */

import { createCompanyDraftFromSummary, createSummaryForFreshApiValidation } from './summaryState';

describe('holded onboarding summary state', () => {
  it('builds the company draft from an existing tenant summary', () => {
    const draft = createCompanyDraftFromSummary({
      companyName: 'ALVILS ESP',
      companyLegalName: 'ALVILS ESP SL',
      companyTaxId: 'B12345678',
      companyAddress: 'Calle Mayor 1',
      companyPostalCode: '28001',
      companyCity: 'Madrid',
      companyProvince: 'Madrid',
      companyCountry: 'Espana',
      companyWebsite: 'https://alvils.es',
      companySectorCode: 'M',
      companySectorLabel: 'Actividades profesionales, cientificas y tecnicas',
      contactFirstName: 'Ksenia',
      contactRole: 'owner',
      contactFullName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      companyEmail: 'admin@alvils.es',
      contactPhone: '600000000',
    });

    expect(draft).toEqual({
      companyLegalName: 'ALVILS ESP SL',
      companyTaxId: 'B12345678',
      companyAddress: 'Calle Mayor 1',
      companyPostalCode: '28001',
      companyCity: 'Madrid',
      companyProvince: 'Madrid',
      companyCountry: 'Espana',
      companyWebsite: 'https://alvils.es',
      companySectorCode: 'M',
      contactFirstName: 'Ksenia',
      contactLastName: 'Ivanova Lopez',
      contactRole: 'owner',
      contactEmail: 'kiabusiness2025@gmail.com',
      contactPhone: '600000000',
    });
  });

  it('clears the previous company data for a fresh API validation', () => {
    const summary = createSummaryForFreshApiValidation({
      companyName: 'ALVILS ESP',
      companyLegalName: 'ALVILS ESP SL',
      companyTaxId: 'B12345678',
      companyAddress: 'Calle Mayor 1',
      companyPostalCode: '28001',
      companyCity: 'Madrid',
      companyProvince: 'Madrid',
      companyCountry: 'Espana',
      companyWebsite: 'https://alvils.es',
      companySectorCode: 'M',
      companySectorLabel: 'Actividades profesionales, cientificas y tecnicas',
      contactFirstName: 'Ksenia',
      contactRole: 'owner',
      contactFullName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      companyEmail: 'admin@alvils.es',
      contactPhone: '600000000',
    });

    expect(summary).toEqual({
      companyName: 'Tu empresa',
      companyLegalName: null,
      companyTaxId: null,
      companyAddress: null,
      companyPostalCode: null,
      companyCity: null,
      companyProvince: null,
      companyCountry: null,
      companyWebsite: null,
      companySectorCode: null,
      companySectorLabel: null,
      contactFirstName: 'Ksenia',
      contactRole: 'owner',
      contactFullName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      companyEmail: null,
      contactPhone: '600000000',
    });

    expect(createCompanyDraftFromSummary(summary)).toEqual({
      companyLegalName: '',
      companyTaxId: '',
      companyAddress: '',
      companyPostalCode: '',
      companyCity: '',
      companyProvince: '',
      companyCountry: 'Espana',
      companyWebsite: '',
      companySectorCode: '',
      contactFirstName: 'Ksenia',
      contactLastName: 'Ivanova Lopez',
      contactRole: 'owner',
      contactEmail: 'kiabusiness2025@gmail.com',
      contactPhone: '600000000',
    });
  });
});
