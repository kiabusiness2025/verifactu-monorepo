import { verifyHoldedOnboardingToken } from '@/lib/oauth/mcp';

export const HOLDED_ONBOARDING_TOKEN_HEADER = 'x-holded-onboarding-token';

export type HoldedOnboardingSession = {
  uid: string;
  email: string | null;
  name: string | null;
  tenantId: string | null;
};

function normalizeToken(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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

  return {
    uid: payload.uid,
    email: payload.email ?? null,
    name: payload.name ?? null,
    tenantId: typeof payload.tenantId === 'string' ? payload.tenantId.trim() || null : null,
  };
}

export async function resolveHoldedOnboardingSessionFromHeaders(headers: Headers) {
  return resolveHoldedOnboardingSession(getHoldedOnboardingTokenFromHeaders(headers));
}
