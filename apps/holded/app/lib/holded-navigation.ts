function getOrigin(value: string | undefined, fallback: string) {
  const candidate = (value || fallback).trim();
  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}

export const HOLDED_APP_URL = getOrigin(
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL,
  'https://holded.verifactu.business'
);
export const HOLDED_PUBLIC_URL = HOLDED_APP_URL;
export const HOLDED_ONBOARDING_URL = `${HOLDED_PUBLIC_URL}/onboarding`;

export const APP_PUBLIC_URL = getOrigin(
  process.env.NEXT_PUBLIC_APP_SITE_URL,
  'https://app.verifactu.business'
);
export const ADMIN_PUBLIC_URL = getOrigin(
  process.env.NEXT_PUBLIC_ADMIN_SITE_URL,
  'https://admin.verifactu.business'
);

const ALLOWED_RETURN_ORIGINS = new Set([HOLDED_PUBLIC_URL, APP_PUBLIC_URL]);

export const buildLeadCaptureUrl = (source?: string) => {
  const base = `${HOLDED_PUBLIC_URL}/`;
  if (!source) {
    return `${base}#acceso-libre`;
  }

  return `${base}?source=${encodeURIComponent(source)}#acceso-libre`;
};

export const buildDashboardUrl = (source = 'holded_dashboard') =>
  `${HOLDED_PUBLIC_URL}/dashboard?source=${encodeURIComponent(source)}`;

export const buildOnboardingUrl = (source = 'holded_onboarding') =>
  `${HOLDED_ONBOARDING_URL}?source=${encodeURIComponent(source)}`;

type HoldedConnectorFlowInput = {
  source?: string | null;
  channel?: string | null;
  next?: string | null;
  onboardingToken?: string | null;
};

function cleanFlowValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildHoldedConnectorFlowPath(
  pathname: '/onboarding' | '/onboarding/holded',
  input: HoldedConnectorFlowInput
) {
  const source = cleanFlowValue(input.source) || 'holded_onboarding';
  const url = new URL(pathname, HOLDED_PUBLIC_URL);
  url.searchParams.set('source', source);

  if (input.channel === 'chatgpt') {
    url.searchParams.set('channel', 'chatgpt');
  }

  const next = cleanFlowValue(input.next);
  if (next) {
    url.searchParams.set('next', sanitizeHoldedReturnTarget(next, buildDashboardUrl(source)));
  }

  const onboardingToken = cleanFlowValue(input.onboardingToken);
  if (onboardingToken) {
    url.searchParams.set('onboarding_token', onboardingToken);
  }

  return `${url.pathname}${url.search}`;
}

export const buildConnectorIntroUrl = (input: HoldedConnectorFlowInput = {}) =>
  buildHoldedConnectorFlowPath('/onboarding', input);

export const buildConnectorConnectUrl = (input: HoldedConnectorFlowInput = {}) =>
  buildHoldedConnectorFlowPath('/onboarding/holded', input);

export const buildProfileOnboardingUrl = (
  source = 'holded_profile_onboarding',
  next = buildDashboardUrl(source)
) =>
  `${HOLDED_PUBLIC_URL}/onboarding/profile?source=${encodeURIComponent(source)}&next=${encodeURIComponent(next)}`;

export const buildAuthUrl = (source: string, next = buildOnboardingUrl(source)) =>
  `${HOLDED_PUBLIC_URL}/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(next)}`;

export const buildRegisterUrl = (source: string, next = buildOnboardingUrl(source)) =>
  `${HOLDED_PUBLIC_URL}/auth/holded?mode=register&source=${encodeURIComponent(source)}&next=${encodeURIComponent(next)}`;

export const sanitizeHoldedReturnTarget = (candidate: string | undefined, fallback: string) => {
  const normalized = candidate?.trim();
  if (!normalized) return fallback;

  try {
    if (normalized.startsWith('/')) {
      return new URL(normalized, HOLDED_PUBLIC_URL).toString();
    }

    const parsed = new URL(normalized);
    return ALLOWED_RETURN_ORIGINS.has(parsed.origin) ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
};

export const buildAdminRedirectUrl = (path = '/dashboard/admin') => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${ADMIN_PUBLIC_URL}${normalized}`;
};
