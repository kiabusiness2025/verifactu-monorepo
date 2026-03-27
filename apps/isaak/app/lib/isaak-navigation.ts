function getOrigin(value: string | undefined, fallback: string) {
  const candidate = (value || fallback).trim();
  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}

export const ISAAK_PUBLIC_URL = getOrigin(
  process.env.NEXT_PUBLIC_ISAAK_SITE_URL,
  'https://isaak.verifactu.business'
);

export const APP_URL = getOrigin(process.env.NEXT_PUBLIC_APP_URL, ISAAK_PUBLIC_URL);

export const HOLDed_URL = getOrigin(
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL,
  'https://holded.verifactu.business'
);

export const CONTACT_URL = `${ISAAK_PUBLIC_URL}/support`;

export const HOLDed_ONBOARDING_URL = `${ISAAK_PUBLIC_URL}/onboarding/holded`;
export const HOLDed_AUTH_URL = `${HOLDed_URL}/auth/holded`;
export const HOLDed_PROFILE_ONBOARDING_URL = `${HOLDed_URL}/onboarding/profile`;

export const SUPPORT_EMAIL = (
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@isaak.verifactu.business'
).trim();

export const buildHoldedAuthUrl = (source: string, next?: string) => {
  const target = next || `${ISAAK_PUBLIC_URL}/chat?source=${encodeURIComponent(source)}`;
  return `${HOLDed_AUTH_URL}?source=${encodeURIComponent(source)}&next=${encodeURIComponent(target)}`;
};

export const buildHoldedProfileOnboardingUrl = (source: string, next?: string) => {
  const target = next || `${ISAAK_PUBLIC_URL}/chat?source=${encodeURIComponent(source)}`;
  return `${HOLDed_PROFILE_ONBOARDING_URL}?source=${encodeURIComponent(source)}&next=${encodeURIComponent(target)}`;
};
