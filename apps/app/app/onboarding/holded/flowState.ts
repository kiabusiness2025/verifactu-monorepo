export type HoldedCompanySetupState = {
  hasResolvedCompany: boolean;
  needsCompanySetup: boolean;
  requiresCompanyConfirmation: boolean;
};

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function looksLikeSyntheticCompanyName(value?: string | null) {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) return true;

  return normalized === 'tu empresa' || normalized.endsWith(' workspace');
}

export function deriveHoldedCompanySetupState(input: {
  entryChannel: 'dashboard' | 'chatgpt';
  requireConnectionConfirmation: boolean;
  tenantId?: string | null;
  tenantIsDemo?: boolean | null;
  tenantNif?: string | null;
  companyName?: string | null;
}): HoldedCompanySetupState {
  const hasResolvedCompany =
    input.entryChannel !== 'chatgpt'
      ? true
      : Boolean(
          normalizeText(input.tenantId) &&
          !input.tenantIsDemo &&
          normalizeText(input.tenantNif) &&
          !looksLikeSyntheticCompanyName(input.companyName)
        );

  return {
    hasResolvedCompany,
    needsCompanySetup: input.entryChannel === 'chatgpt' && !hasResolvedCompany,
    requiresCompanyConfirmation:
      input.entryChannel === 'chatgpt' && input.requireConnectionConfirmation && hasResolvedCompany,
  };
}
