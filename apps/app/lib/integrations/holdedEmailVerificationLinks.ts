import { randomBytes } from 'crypto';

import { one, query } from '@/lib/db';

const HOLDED_EMAIL_VERIFICATION_LINKS_TABLE = 'holded_email_verification_links';
const VERIFICATION_CODE_BYTES = 9;

let verificationLinksTableEnsured = false;

function normalizeCode(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return /^[A-Za-z0-9_-]{8,64}$/.test(normalized) ? normalized : null;
}

async function ensureVerificationLinksTable() {
  if (verificationLinksTableEnsured) {
    return;
  }

  await query(
    [
      `CREATE TABLE IF NOT EXISTS ${HOLDED_EMAIL_VERIFICATION_LINKS_TABLE} (`,
      '  code text PRIMARY KEY,',
      '  token text NOT NULL,',
      '  expires_at timestamptz NOT NULL,',
      '  created_at timestamptz NOT NULL DEFAULT now()',
      ')',
    ].join(' ')
  );
  await query(
    `CREATE INDEX IF NOT EXISTS ${HOLDED_EMAIL_VERIFICATION_LINKS_TABLE}_expires_at_idx ON ${HOLDED_EMAIL_VERIFICATION_LINKS_TABLE} (expires_at)`
  );

  verificationLinksTableEnsured = true;
}

export async function createHoldedEmailVerificationCode(input: { token: string; expiresAt: Date }) {
  await ensureVerificationLinksTable();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(VERIFICATION_CODE_BYTES).toString('base64url');
    const row = await one<{ code: string }>(
      [
        `INSERT INTO ${HOLDED_EMAIL_VERIFICATION_LINKS_TABLE} (code, token, expires_at)`,
        'VALUES ($1, $2, $3)',
        'ON CONFLICT (code) DO NOTHING',
        'RETURNING code',
      ].join(' '),
      [code, input.token, input.expiresAt.toISOString()]
    );

    if (row?.code) {
      return row.code;
    }
  }

  throw new Error('Failed to allocate Holded email verification code');
}

export async function consumeHoldedEmailVerificationTokenFromCode(code: string | null | undefined) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  await ensureVerificationLinksTable();

  const row = await one<{ token: string }>(
    [
      `DELETE FROM ${HOLDED_EMAIL_VERIFICATION_LINKS_TABLE}`,
      'WHERE code = $1 AND expires_at > now()',
      'RETURNING token',
    ].join(' '),
    [normalizedCode]
  );

  return row?.token ?? null;
}
