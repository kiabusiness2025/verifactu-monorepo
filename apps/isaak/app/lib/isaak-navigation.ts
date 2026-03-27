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

export const SUPPORT_EMAIL = (
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@isaak.verifactu.business'
).trim();
