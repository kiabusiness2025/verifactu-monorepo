function normalizeNameValue(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized : null;
}

function getEmailAlias(email?: string | null) {
  const normalized = email?.trim();
  if (!normalized) return null;

  const alias = normalized.split('@')[0]?.trim();
  if (!alias) return null;

  return alias === alias.toLowerCase() ? alias.charAt(0).toUpperCase() + alias.slice(1) : alias;
}

export type PersonNameParts = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
};

export function normalizePersonNamePart(value?: string | null) {
  return normalizeNameValue(value);
}

export function splitFullName(value?: string | null): PersonNameParts {
  const fullName = normalizeNameValue(value);
  if (!fullName) {
    return {
      firstName: null,
      lastName: null,
      fullName: null,
    };
  }

  const [firstName, ...lastNameParts] = fullName.split(' ').filter(Boolean);

  return {
    firstName: firstName || null,
    lastName: lastNameParts.length > 0 ? lastNameParts.join(' ') : null,
    fullName,
  };
}

export function buildFullName(parts: { firstName?: string | null; lastName?: string | null }) {
  const firstName = normalizeNameValue(parts.firstName);
  const lastName = normalizeNameValue(parts.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  return fullName || null;
}

export function getPreferredFirstName(input: {
  firstName?: string | null;
  fullName?: string | null;
  email?: string | null;
  fallback?: string;
}) {
  const explicitFirstName = normalizeNameValue(input.firstName);
  if (explicitFirstName) return explicitFirstName;

  const nameParts = splitFullName(input.fullName);
  if (nameParts.firstName) return nameParts.firstName;

  const emailAlias = getEmailAlias(input.email);
  if (emailAlias) return emailAlias;

  return normalizeNameValue(input.fallback) || 'Usuario';
}

export function getPreferredFullName(input: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  fallback?: string;
}) {
  const explicitFullName = buildFullName({
    firstName: input.firstName,
    lastName: input.lastName,
  });
  if (explicitFullName) return explicitFullName;

  const normalizedFullName = normalizeNameValue(input.fullName);
  if (normalizedFullName) return normalizedFullName;

  const emailAlias = getEmailAlias(input.email);
  if (emailAlias) return emailAlias;

  return normalizeNameValue(input.fallback) || 'Usuario';
}
