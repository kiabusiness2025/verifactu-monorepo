export const HOLDED_APP_URL = 'https://app.verifactu.business';
export const HOLDED_CHAT_URL = `${HOLDED_APP_URL}/dashboard/isaak`;

export const buildOnboardingUrl = (source: string) => {
  const onboardingUrl = `${HOLDED_APP_URL}/onboarding/holded?channel=chatgpt&source=${source}&next=${encodeURIComponent(HOLDED_CHAT_URL)}`;
  return `${HOLDED_APP_URL}/login?source=${source}&next=${encodeURIComponent(onboardingUrl)}`;
};
