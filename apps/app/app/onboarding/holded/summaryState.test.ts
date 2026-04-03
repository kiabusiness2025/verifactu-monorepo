/** @jest-environment node */

import { createCompanyDraftFromSummary, createSummaryForFreshApiValidation } from './summaryState';

describe('holded onboarding summary state', () => {
  it('builds the company draft from an existing tenant summary', () => {
    const draft = createCompanyDraftFromSummary({
      companyName: 'ALVILS ESP',
      companyLegalName: 'ALVILS ESP SL',
      companyTaxId: 'B12345678',
      contactFirstName: 'Ksenia',
      contactFullName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      companyEmail: 'admin@alvils.es',
      contactPhone: '600000000',
    });

    expect(draft).toEqual({
      companyLegalName: 'ALVILS ESP SL',
      companyTaxId: 'B12345678',
      contactName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      contactPhone: '600000000',
    });
  });

  it('clears the previous company data for a fresh API validation', () => {
    const summary = createSummaryForFreshApiValidation({
      companyName: 'ALVILS ESP',
      companyLegalName: 'ALVILS ESP SL',
      companyTaxId: 'B12345678',
      contactFirstName: 'Ksenia',
      contactFullName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      companyEmail: 'admin@alvils.es',
      contactPhone: '600000000',
    });

    expect(summary).toEqual({
      companyName: 'Tu empresa',
      companyLegalName: null,
      companyTaxId: null,
      contactFirstName: 'Ksenia',
      contactFullName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      companyEmail: null,
      contactPhone: null,
    });

    expect(createCompanyDraftFromSummary(summary)).toEqual({
      companyLegalName: '',
      companyTaxId: '',
      contactName: 'Ksenia Ivanova Lopez',
      contactEmail: 'kiabusiness2025@gmail.com',
      contactPhone: '',
    });
  });
});
