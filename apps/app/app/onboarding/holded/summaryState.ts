export type HoldedOnboardingSummary = {
  companyName: string;
  companyLegalName: string | null;
  companyTaxId: string | null;
  contactFirstName: string;
  contactFullName: string | null;
  contactEmail: string | null;
  companyEmail: string | null;
  contactPhone: string | null;
};

export type HoldedOnboardingCompanyDraft = {
  companyName: string;
  companyLegalName: string;
  companyTaxId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function createCompanyDraftFromSummary(
  summary: HoldedOnboardingSummary
): HoldedOnboardingCompanyDraft {
  const normalizedCompanyName = normalizeText(summary.companyName);
  const hasRealCompany =
    !!normalizedCompanyName && normalizedCompanyName.toLowerCase() !== 'tu empresa';

  return {
    companyName: hasRealCompany ? normalizedCompanyName : '',
    companyLegalName:
      normalizeText(summary.companyLegalName) || (hasRealCompany ? normalizedCompanyName : ''),
    companyTaxId: normalizeText(summary.companyTaxId) || '',
    contactName:
      normalizeText(summary.contactFullName) || normalizeText(summary.contactFirstName) || '',
    contactEmail: normalizeText(summary.contactEmail) || '',
    contactPhone: normalizeText(summary.contactPhone) || '',
  };
}

export function createSummaryForFreshApiValidation(
  summary: HoldedOnboardingSummary
): HoldedOnboardingSummary {
  return {
    companyName: 'Tu empresa',
    companyLegalName: null,
    companyTaxId: null,
    contactFirstName: normalizeText(summary.contactFirstName) || 'Usuario',
    contactFullName:
      normalizeText(summary.contactFullName) || normalizeText(summary.contactFirstName),
    contactEmail: normalizeText(summary.contactEmail),
    companyEmail: null,
    contactPhone: null,
  };
}
