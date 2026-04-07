import { splitFullName } from '@/lib/personName';

export type HoldedOnboardingSummary = {
  companyName: string;
  companyLegalName: string | null;
  companyTaxId: string | null;
  companyAddress: string | null;
  companyPostalCode: string | null;
  companyCity: string | null;
  companyProvince: string | null;
  companyCountry: string | null;
  companyWebsite: string | null;
  companySectorCode: string | null;
  companySectorLabel: string | null;
  contactFirstName: string;
  contactRole: string | null;
  contactFullName: string | null;
  contactEmail: string | null;
  companyEmail: string | null;
  contactPhone: string | null;
};

export type HoldedOnboardingCompanyDraft = {
  companyLegalName: string;
  companyTaxId: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companyProvince: string;
  companyCountry: string;
  companyWebsite: string;
  companySectorCode: string;
  contactFirstName: string;
  contactLastName: string;
  contactRole: string;
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
  const normalizedCompanyLegalName = normalizeText(summary.companyLegalName);
  const effectiveCompanyLegalName =
    normalizedCompanyLegalName ||
    (normalizedCompanyName && normalizedCompanyName.toLowerCase() !== 'tu empresa'
      ? normalizedCompanyName
      : null);
  const contactNameParts = splitFullName(summary.contactFullName || summary.contactFirstName);

  return {
    companyLegalName: effectiveCompanyLegalName || '',
    companyTaxId: normalizeText(summary.companyTaxId) || '',
    companyAddress: normalizeText(summary.companyAddress) || '',
    companyPostalCode: normalizeText(summary.companyPostalCode) || '',
    companyCity: normalizeText(summary.companyCity) || '',
    companyProvince: normalizeText(summary.companyProvince) || '',
    companyCountry: normalizeText(summary.companyCountry) || 'Espana',
    companyWebsite: normalizeText(summary.companyWebsite) || '',
    companySectorCode: normalizeText(summary.companySectorCode) || '',
    contactFirstName: contactNameParts.firstName || '',
    contactLastName: contactNameParts.lastName || '',
    contactRole: normalizeText(summary.contactRole) || '',
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
    companyAddress: null,
    companyPostalCode: null,
    companyCity: null,
    companyProvince: null,
    companyCountry: null,
    companyWebsite: null,
    companySectorCode: null,
    companySectorLabel: null,
    contactFirstName: normalizeText(summary.contactFirstName) || 'Usuario',
    contactRole: normalizeText(summary.contactRole),
    contactFullName:
      normalizeText(summary.contactFullName) || normalizeText(summary.contactFirstName),
    contactEmail: normalizeText(summary.contactEmail),
    companyEmail: null,
    contactPhone: normalizeText(summary.contactPhone),
  };
}
