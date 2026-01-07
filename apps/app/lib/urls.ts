const DEFAULT_LANDING_URL = "https://www.verifactu.business";
const DEFAULT_APP_URL = "https://app.verifactu.business";

export function getLandingUrl() {
  return (process.env.NEXT_PUBLIC_LANDING_URL || DEFAULT_LANDING_URL).replace(/\/$/, "");
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");
}
