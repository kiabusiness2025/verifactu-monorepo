import { type HoldedOnboardingAuthMethod, verifyHoldedOnboardingToken } from '@/lib/oauth/mcp';

export const HOLDED_ONBOARDING_TOKEN_HEADER = 'x-holded-onboarding-token';

export type HoldedOnboardingSession = {
  uid: string;
  email: string | null;
  name: string | null;
  tenantId: string | null;
  authMethod: HoldedOnboardingAuthMethod | null;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  verifiedAt: string | null;
};

function normalizeToken(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeAuthMethod(value: unknown): HoldedOnboardingAuthMethod | null {
  if (value === 'google' || value === 'email' || value === 'unknown') {
    return value;
  }

  return null;
}

export function getHoldedOnboardingTokenFromHeaders(headers: Headers) {
  return normalizeToken(headers.get(HOLDED_ONBOARDING_TOKEN_HEADER));
}

export function getHoldedOnboardingTokenFromSearchParams(searchParams: URLSearchParams) {
  return normalizeToken(searchParams.get('onboarding_token'));
}

export async function resolveHoldedOnboardingSession(
  token: string | null | undefined
): Promise<HoldedOnboardingSession | null> {
  const normalized = normalizeToken(token);
  if (!normalized) return null;

  const payload = await verifyHoldedOnboardingToken(normalized);
  if (!payload?.uid) return null;

  const firstName = normalizeToken(
    typeof payload.firstName === 'string' ? payload.firstName : null
  );
  const lastName = normalizeToken(typeof payload.lastName === 'string' ? payload.lastName : null);
  const fallbackName = [firstName, lastName].filter(Boolean).join(' ').trim() || null;

  return {
    uid: payload.uid,
    email: payload.email ?? null,
    name: normalizeToken(typeof payload.name === 'string' ? payload.name : null) ?? fallbackName,
    tenantId: typeof payload.tenantId === 'string' ? payload.tenantId.trim() || null : null,
    authMethod: normalizeAuthMethod(payload.authMethod),
    emailVerified: payload.emailVerified === true,
    firstName,
    lastName,
    verifiedAt: normalizeToken(typeof payload.verifiedAt === 'string' ? payload.verifiedAt : null),
  };
}

export async function resolveHoldedOnboardingSessionFromHeaders(headers: Headers) {
  return resolveHoldedOnboardingSession(getHoldedOnboardingTokenFromHeaders(headers));
}

export function isVerifiedHoldedOnboardingIdentity(
  session: HoldedOnboardingSession | null | undefined
) {
  if (!session?.email) return false;
  return session.emailVerified === true;
}
