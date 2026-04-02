/** @jest-environment node */

import { deriveHoldedCompanySetupState } from './flowState';

describe('deriveHoldedCompanySetupState', () => {
  it('requires company confirmation for a real chatgpt tenant when confirmation is requested', () => {
    expect(
      deriveHoldedCompanySetupState({
        entryChannel: 'chatgpt',
        requireConnectionConfirmation: true,
        tenantId: 'tenant-1',
        tenantIsDemo: false,
        tenantNif: 'B12345678',
        companyName: 'ALVILS',
      })
    ).toEqual({
      hasResolvedCompany: true,
      needsCompanySetup: false,
      requiresCompanyConfirmation: true,
    });
  });

  it('requires company setup when chatgpt only has a synthetic workspace', () => {
    expect(
      deriveHoldedCompanySetupState({
        entryChannel: 'chatgpt',
        requireConnectionConfirmation: true,
        tenantId: 'tenant-1',
        tenantIsDemo: false,
        tenantNif: null,
        companyName: 'Isaak Workspace',
      })
    ).toEqual({
      hasResolvedCompany: false,
      needsCompanySetup: true,
      requiresCompanyConfirmation: false,
    });
  });

  it('does not block dashboard entries with a company setup step', () => {
    expect(
      deriveHoldedCompanySetupState({
        entryChannel: 'dashboard',
        requireConnectionConfirmation: false,
        tenantId: null,
        tenantIsDemo: null,
        tenantNif: null,
        companyName: 'Tu empresa',
      })
    ).toEqual({
      hasResolvedCompany: true,
      needsCompanySetup: false,
      requiresCompanyConfirmation: false,
    });
  });
});
