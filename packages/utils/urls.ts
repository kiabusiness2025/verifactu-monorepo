const DEFAULT_LANDING_URL = "https://verifactu.business";
const DEFAULT_APP_URL = "https://app.verifactu.business";

export function getLandingUrl(env = process.env.NEXT_PUBLIC_LANDING_URL) {
  return (env || DEFAULT_LANDING_URL).replace(/\/$/, "");
}

export function getAppUrl(env = process.env.NEXT_PUBLIC_APP_URL) {
  return (env || DEFAULT_APP_URL).replace(/\/$/, "");
}
