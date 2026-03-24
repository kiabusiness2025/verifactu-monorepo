export const HOLDED_APP_URL = 'https://holded.verifactu.business';
export const HOLDED_CHAT_URL = `${HOLDED_APP_URL}/planes`;
export const HOLDED_PUBLIC_URL = 'https://holded.verifactu.business';

export const buildOnboardingUrl = (source: string) => {
  return `${HOLDED_PUBLIC_URL}/auth/holded?source=${source}&next=${encodeURIComponent(HOLDED_CHAT_URL)}`;
};
