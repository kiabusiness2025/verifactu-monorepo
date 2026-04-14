const DEFAULT_ADMIN_EMAILS = [
  'soporte@verifactu.business',
  'support@verifactu.business',
  'kiabuasiness2025@gmail.com',
  'kiabusiness2025@gmail.com',
] as const;

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || '';
}

export function getPreconfiguredAdminEmails(raw = process.env.ADMIN_EMAILS || '') {
  const configured = raw
    .split(',')
    .map((value) => normalizeEmail(value))
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...configured]));
}

export function isPreconfiguredAdminEmail(
  email: string | null | undefined,
  raw = process.env.ADMIN_EMAILS || ''
) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getPreconfiguredAdminEmails(raw).includes(normalized);
}

export function getPrimaryConnectorAdminEmail() {
  return 'soporte@verifactu.business';
}
