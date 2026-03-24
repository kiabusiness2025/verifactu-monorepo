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
export const APP_ONBOARDING_URL = `${getOrigin(
  process.env.NEXT_PUBLIC_APP_URL,
  'https://app.verifactu.business'
)}/onboarding/holded`;

export const buildOnboardingUrl = (source: string) => {
  const onboardingTarget = `${APP_ONBOARDING_URL}?channel=chatgpt&source=${encodeURIComponent(source)}`;
  return `${HOLDED_PUBLIC_URL}/auth/holded?source=${source}&next=${encodeURIComponent(onboardingTarget)}`;
};
