import { one, query } from '@/lib/db';
import { createHash, randomBytes, randomUUID } from 'crypto';

const COMPANY_NOTIFICATION_EMAILS_TABLE = 'company_notification_emails';
const COMPANY_NOTIFICATION_EMAIL_CHANGE_REQUESTS_TABLE =
  'company_notification_email_change_requests';

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string | null) {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized || null;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function isMissingTableError(error: unknown) {
  const pgCode =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (pgCode === '42P01') {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(COMPANY_NOTIFICATION_EMAILS_TABLE) &&
    (message.includes('does not exist') || message.includes('relation'))
  );
}

export async function getConfirmedCompanyNotificationEmail(tenantId?: string | null) {
  const normalizedTenantId = normalizeText(tenantId);
  if (!normalizedTenantId) {
    return null;
  }

  try {
    const row = await one<{ email: string }>(
      `SELECT email FROM ${COMPANY_NOTIFICATION_EMAILS_TABLE} WHERE tenant_id = $1 LIMIT 1`,
      [normalizedTenantId]
    );
    return normalizeEmail(row?.email);
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }

    throw error;
  }
}

export async function upsertConfirmedCompanyNotificationEmail(input: {
  tenantId: string;
  email: string;
  verifiedAt?: Date;
}) {
  const tenantId = normalizeText(input.tenantId);
  const email = normalizeEmail(input.email);
  if (!tenantId || !email) {
    throw new Error('tenantId and email are required');
  }

  const verifiedAt = input.verifiedAt ?? new Date();

  await query(
    `INSERT INTO ${COMPANY_NOTIFICATION_EMAILS_TABLE} (tenant_id, email, verified_at, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (tenant_id)
     DO UPDATE SET email = EXCLUDED.email, verified_at = EXCLUDED.verified_at, updated_at = NOW()`,
    [tenantId, email, verifiedAt]
  );

  return { tenantId, email, verifiedAt };
}

export async function createCompanyNotificationEmailChangeRequest(input: {
  tenantId: string;
  requestedEmail: string;
  currentConfirmedEmail: string;
  requestedByUid: string;
  ttlMinutes?: number;
}) {
  const tenantId = normalizeText(input.tenantId);
  const requestedEmail = normalizeEmail(input.requestedEmail);
  const currentConfirmedEmail = normalizeEmail(input.currentConfirmedEmail);
  const requestedByUid = normalizeText(input.requestedByUid);

  if (!tenantId || !requestedEmail || !currentConfirmedEmail || !requestedByUid) {
    throw new Error(
      'tenantId, requestedEmail, currentConfirmedEmail and requestedByUid are required'
    );
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const ttlMinutes = input.ttlMinutes && input.ttlMinutes > 0 ? input.ttlMinutes : 45;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const id = randomUUID();

  await query(
    `INSERT INTO ${COMPANY_NOTIFICATION_EMAIL_CHANGE_REQUESTS_TABLE}
      (id, tenant_id, requested_email, current_confirmed_email, requested_by_user_id, token_hash, expires_at, created_at, used_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NULL)`,
    [id, tenantId, requestedEmail, currentConfirmedEmail, requestedByUid, tokenHash, expiresAt]
  );

  return {
    id,
    token,
    expiresAt,
    tenantId,
    requestedEmail,
    currentConfirmedEmail,
  };
}

export async function consumeCompanyNotificationEmailChangeRequest(token?: string | null) {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) {
    return null;
  }

  const tokenHash = hashToken(normalizedToken);
  const row = await one<{
    tenant_id: string;
    requested_email: string;
    current_confirmed_email: string;
    requested_by_user_id: string;
    expires_at: Date;
  }>(
    `UPDATE ${COMPANY_NOTIFICATION_EMAIL_CHANGE_REQUESTS_TABLE}
       SET used_at = NOW()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING tenant_id, requested_email, current_confirmed_email, requested_by_user_id, expires_at`,
    [tokenHash]
  );

  if (!row) {
    return null;
  }

  return {
    tenantId: row.tenant_id,
    requestedEmail: normalizeEmail(row.requested_email),
    currentConfirmedEmail: normalizeEmail(row.current_confirmed_email),
    requestedByUid: normalizeText(row.requested_by_user_id),
    expiresAt: row.expires_at,
  };
}
