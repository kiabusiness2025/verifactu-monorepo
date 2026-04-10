import { one, query } from '@/lib/db';
import { buildFullName } from '@/lib/personName';
import type { HoldedOnboardingAuthMethod } from '@/lib/oauth/mcp';

const HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE = 'holded_verified_email_identities';
let warnedMissingVerifiedEmailIdentitiesSchema = false;

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value?: string | null) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeAuthMethod(value?: string | null): HoldedOnboardingAuthMethod | null {
  if (value === 'google' || value === 'email' || value === 'unknown') {
    return value;
  }

  return null;
}

export type RememberedHoldedOnboardingPrefill = {
  companyName: string | null;
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
  contactFirstName: string | null;
  contactLastName: string | null;
  contactRole: string | null;
  contactFullName: string | null;
  contactEmail: string | null;
  companyEmail: string | null;
  contactPhone: string | null;
};

function normalizePrefillText(value?: string | null) {
  return normalizeText(value);
}

function normalizeRememberedPrefillRecord(
  value?: Partial<RememberedHoldedOnboardingPrefill> | null
): RememberedHoldedOnboardingPrefill | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const contactFirstName = normalizePrefillText(value.contactFirstName);
  const contactLastName = normalizePrefillText(value.contactLastName);
  const contactFullName =
    normalizePrefillText(value.contactFullName) ||
    buildFullName({
      firstName: contactFirstName,
      lastName: contactLastName,
    });

  const normalized: RememberedHoldedOnboardingPrefill = {
    companyName: normalizePrefillText(value.companyName),
    companyLegalName: normalizePrefillText(value.companyLegalName),
    companyTaxId: normalizePrefillText(value.companyTaxId)?.toUpperCase() || null,
    companyAddress: normalizePrefillText(value.companyAddress),
    companyPostalCode: normalizePrefillText(value.companyPostalCode),
    companyCity: normalizePrefillText(value.companyCity),
    companyProvince: normalizePrefillText(value.companyProvince),
    companyCountry: normalizePrefillText(value.companyCountry),
    companyWebsite: normalizePrefillText(value.companyWebsite),
    companySectorCode: normalizePrefillText(value.companySectorCode),
    companySectorLabel: normalizePrefillText(value.companySectorLabel),
    contactFirstName,
    contactLastName,
    contactRole: normalizePrefillText(value.contactRole),
    contactFullName,
    contactEmail: normalizeEmail(value.contactEmail),
    companyEmail: normalizeEmail(value.companyEmail),
    contactPhone: normalizePrefillText(value.contactPhone),
  };

  const hasMeaningfulValue = Object.values(normalized).some(Boolean);
  return hasMeaningfulValue ? normalized : null;
}

function parseRememberedPrefill(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return normalizeRememberedPrefillRecord(
        JSON.parse(value) as Partial<RememberedHoldedOnboardingPrefill>
      );
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return normalizeRememberedPrefillRecord(value as Partial<RememberedHoldedOnboardingPrefill>);
  }

  return null;
}

function isMissingVerifiedEmailIdentitiesSchemaError(error: unknown) {
  const pgCode =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  if (pgCode === '42P01' || pgCode === '42703') {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE) &&
    (message.includes('does not exist') || message.includes('column'))
  );
}

function warnMissingVerifiedEmailIdentitiesSchema(error: unknown) {
  if (warnedMissingVerifiedEmailIdentitiesSchema) {
    return;
  }

  warnedMissingVerifiedEmailIdentitiesSchema = true;
  console.warn(
    '[holdedVerifiedEmailIdentities] schema not available, skipping persistence until migration is applied',
    {
      table: HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE,
      message: error instanceof Error ? error.message : String(error),
    }
  );
}

export type VerifiedHoldedEmailIdentity = {
  uid: string;
  email: string;
  authMethod: HoldedOnboardingAuthMethod | null;
  verifiedAt: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  tenantId: string | null;
  prefill: RememberedHoldedOnboardingPrefill | null;
};

export async function readVerifiedHoldedEmailIdentity(input: {
  uid?: string | null;
  email?: string | null;
}): Promise<VerifiedHoldedEmailIdentity | null> {
  const uid = normalizeText(input.uid);
  const email = normalizeEmail(input.email);
  if (!uid || !email) {
    return null;
  }

  let row;
  try {
    row = await one<{
      uid: string;
      email: string;
      auth_method: string | null;
      first_name: string | null;
      last_name: string | null;
      full_name: string | null;
      tenant_id: string | null;
      onboarding_prefill_json: unknown;
      verified_at: string;
    }>(
      [
        `SELECT uid, email, auth_method, first_name, last_name, full_name, tenant_id, onboarding_prefill_json, verified_at`,
        `FROM ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}`,
        'WHERE uid = $1 AND email = $2',
      ].join(' '),
      [uid, email]
    );
  } catch (error) {
    if (isMissingVerifiedEmailIdentitiesSchemaError(error)) {
      warnMissingVerifiedEmailIdentitiesSchema(error);
      return null;
    }

    throw error;
  }

  if (!row) {
    return null;
  }

  return {
    uid: row.uid,
    email: row.email,
    authMethod: normalizeAuthMethod(row.auth_method),
    verifiedAt: row.verified_at,
    firstName: normalizeText(row.first_name),
    lastName: normalizeText(row.last_name),
    fullName:
      normalizeText(row.full_name) ||
      buildFullName({
        firstName: row.first_name,
        lastName: row.last_name,
      }),
    tenantId: normalizeText(row.tenant_id),
    prefill: parseRememberedPrefill(row.onboarding_prefill_json),
  };
}

export async function rememberVerifiedHoldedEmailIdentity(input: {
  uid: string;
  email: string;
  authMethod?: HoldedOnboardingAuthMethod | null;
  verifiedAt?: string | Date | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  tenantId?: string | null;
  prefill?: Partial<RememberedHoldedOnboardingPrefill> | null;
}) {
  const uid = normalizeText(input.uid);
  const email = normalizeEmail(input.email);
  const firstName = normalizeText(input.firstName);
  const lastName = normalizeText(input.lastName);
  const fullName =
    normalizeText(input.fullName) ||
    buildFullName({
      firstName,
      lastName,
    });
  const tenantId = normalizeText(input.tenantId);
  const prefill = normalizeRememberedPrefillRecord(input.prefill);
  const verifiedAtInput = input.verifiedAt;
  const verifiedAt =
    verifiedAtInput instanceof Date
      ? verifiedAtInput.toISOString()
      : normalizeText(verifiedAtInput) || new Date().toISOString();

  if (!uid || !email) {
    return null;
  }

  let row;
  try {
    row = await one<{
      uid: string;
      email: string;
      auth_method: string | null;
      first_name: string | null;
      last_name: string | null;
      full_name: string | null;
      tenant_id: string | null;
      onboarding_prefill_json: unknown;
      verified_at: string;
    }>(
      [
        `INSERT INTO ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE} (`,
        'uid, email, auth_method, first_name, last_name, full_name, tenant_id, onboarding_prefill_json, verified_at',
        ')',
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)',
        'ON CONFLICT (uid, email) DO UPDATE',
        `SET auth_method = COALESCE(EXCLUDED.auth_method, ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}.auth_method),`,
        `    first_name = COALESCE(EXCLUDED.first_name, ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}.first_name),`,
        `    last_name = COALESCE(EXCLUDED.last_name, ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}.last_name),`,
        `    full_name = COALESCE(EXCLUDED.full_name, ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}.full_name),`,
        `    tenant_id = COALESCE(EXCLUDED.tenant_id, ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}.tenant_id),`,
        `    onboarding_prefill_json = COALESCE(EXCLUDED.onboarding_prefill_json, ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}.onboarding_prefill_json),`,
        '    verified_at = EXCLUDED.verified_at',
        'RETURNING uid, email, auth_method, first_name, last_name, full_name, tenant_id, onboarding_prefill_json, verified_at',
      ].join(' '),
      [
        uid,
        email,
        normalizeAuthMethod(input.authMethod),
        firstName,
        lastName,
        fullName,
        tenantId,
        prefill ? JSON.stringify(prefill) : null,
        verifiedAt,
      ]
    );
  } catch (error) {
    if (isMissingVerifiedEmailIdentitiesSchemaError(error)) {
      warnMissingVerifiedEmailIdentitiesSchema(error);
      return null;
    }

    throw error;
  }

  if (!row) {
    return null;
  }

  return {
    uid: row.uid,
    email: row.email,
    authMethod: normalizeAuthMethod(row.auth_method),
    verifiedAt: row.verified_at,
    firstName: normalizeText(row.first_name),
    lastName: normalizeText(row.last_name),
    fullName:
      normalizeText(row.full_name) ||
      buildFullName({
        firstName: row.first_name,
        lastName: row.last_name,
      }),
    tenantId: normalizeText(row.tenant_id),
    prefill: parseRememberedPrefill(row.onboarding_prefill_json),
  } satisfies VerifiedHoldedEmailIdentity;
}

export async function forgetVerifiedHoldedEmailIdentity(input: {
  uid?: string | null;
  email?: string | null;
  clearAllForUid?: boolean;
}) {
  const uid = normalizeText(input.uid);
  const email = normalizeEmail(input.email);
  if (!uid) {
    return 0;
  }

  const clearAllForUid = input.clearAllForUid !== false;

  try {
    if (clearAllForUid) {
      const result = await query<{ uid: string }>(
        `DELETE FROM ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE} WHERE uid = $1 RETURNING uid`,
        [uid]
      );
      return result.length;
    }

    if (!email) {
      return 0;
    }

    const result = await query<{ uid: string }>(
      `DELETE FROM ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE} WHERE uid = $1 AND email = $2 RETURNING uid`,
      [uid, email]
    );
    return result.length;
  } catch (error) {
    if (isMissingVerifiedEmailIdentitiesSchemaError(error)) {
      warnMissingVerifiedEmailIdentitiesSchema(error);
      return 0;
    }

    throw error;
  }
}
