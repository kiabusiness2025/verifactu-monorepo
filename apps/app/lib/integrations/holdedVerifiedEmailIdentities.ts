import { one, query } from '@/lib/db';
import type { HoldedOnboardingAuthMethod } from '@/lib/oauth/mcp';

const HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE = 'holded_verified_email_identities';

let verifiedEmailIdentitiesTableEnsured = false;

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

async function ensureVerifiedEmailIdentitiesTable() {
  if (verifiedEmailIdentitiesTableEnsured) {
    return;
  }

  await query(
    [
      `CREATE TABLE IF NOT EXISTS ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE} (`,
      '  uid text NOT NULL,',
      '  email text NOT NULL,',
      '  auth_method text NULL,',
      '  verified_at timestamptz NOT NULL,',
      '  created_at timestamptz NOT NULL DEFAULT now(),',
      '  PRIMARY KEY (uid, email)',
      ')',
    ].join(' ')
  );
  await query(
    `CREATE INDEX IF NOT EXISTS ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}_email_idx ON ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE} (email)`
  );

  verifiedEmailIdentitiesTableEnsured = true;
}

export type VerifiedHoldedEmailIdentity = {
  uid: string;
  email: string;
  authMethod: HoldedOnboardingAuthMethod | null;
  verifiedAt: string;
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

  await ensureVerifiedEmailIdentitiesTable();

  const row = await one<{
    uid: string;
    email: string;
    auth_method: string | null;
    verified_at: string;
  }>(
    [
      `SELECT uid, email, auth_method, verified_at`,
      `FROM ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE}`,
      'WHERE uid = $1 AND email = $2',
    ].join(' '),
    [uid, email]
  );

  if (!row) {
    return null;
  }

  return {
    uid: row.uid,
    email: row.email,
    authMethod: normalizeAuthMethod(row.auth_method),
    verifiedAt: row.verified_at,
  };
}

export async function rememberVerifiedHoldedEmailIdentity(input: {
  uid: string;
  email: string;
  authMethod?: HoldedOnboardingAuthMethod | null;
  verifiedAt?: string | Date | null;
}) {
  const uid = normalizeText(input.uid);
  const email = normalizeEmail(input.email);
  const verifiedAtInput = input.verifiedAt;
  const verifiedAt =
    verifiedAtInput instanceof Date
      ? verifiedAtInput.toISOString()
      : normalizeText(verifiedAtInput) || new Date().toISOString();

  if (!uid || !email) {
    return null;
  }

  await ensureVerifiedEmailIdentitiesTable();

  const row = await one<{
    uid: string;
    email: string;
    auth_method: string | null;
    verified_at: string;
  }>(
    [
      `INSERT INTO ${HOLDED_VERIFIED_EMAIL_IDENTITIES_TABLE} (uid, email, auth_method, verified_at)`,
      'VALUES ($1, $2, $3, $4)',
      'ON CONFLICT (uid, email) DO UPDATE',
      'SET auth_method = EXCLUDED.auth_method,',
      '    verified_at = EXCLUDED.verified_at',
      'RETURNING uid, email, auth_method, verified_at',
    ].join(' '),
    [uid, email, normalizeAuthMethod(input.authMethod), verifiedAt]
  );

  if (!row) {
    return null;
  }

  return {
    uid: row.uid,
    email: row.email,
    authMethod: normalizeAuthMethod(row.auth_method),
    verifiedAt: row.verified_at,
  } satisfies VerifiedHoldedEmailIdentity;
}
