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

export const ISAAK_PUBLIC_URL = getOrigin(
  process.env.NEXT_PUBLIC_ISAAK_SITE_URL,
  'https://isaak.verifactu.business'
);
export const ISAAK_CHAT_URL = `${ISAAK_PUBLIC_URL}/chat`;

export const buildLeadCaptureUrl = (source?: string) => {
  const base = `${HOLDED_PUBLIC_URL}/`;
  if (!source) {
    return `${base}#acceso-libre`;
  }

  return `${base}?source=${encodeURIComponent(source)}#acceso-libre`;
};

export const buildDashboardUrl = (source = 'holded_dashboard') =>
  `${ISAAK_CHAT_URL}?source=${encodeURIComponent(source)}`;

export const buildOnboardingUrl = (source = 'holded_onboarding') =>
  `${HOLDED_ONBOARDING_URL}?source=${encodeURIComponent(source)}`;

export const buildProfileOnboardingUrl = (
  source = 'holded_profile_onboarding',
  next = buildDashboardUrl(source)
) =>
  `${HOLDED_PUBLIC_URL}/onboarding/profile?source=${encodeURIComponent(source)}&next=${encodeURIComponent(next)}`;

export const buildAuthUrl = (source: string, next = buildOnboardingUrl(source)) =>
  `${HOLDED_PUBLIC_URL}/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(next)}`;

export const buildRegisterUrl = (source: string, next = buildOnboardingUrl(source)) =>
  `${HOLDED_PUBLIC_URL}/auth/holded?mode=register&source=${encodeURIComponent(source)}&next=${encodeURIComponent(next)}`;
