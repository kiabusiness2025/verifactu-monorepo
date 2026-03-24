function normalizeBaseUrl(raw: string | undefined, fallback: string): string {
  const candidate = (raw || fallback).trim();

  try {
    const parsed = new URL(candidate);

    // Legacy guardrail: some envs were accidentally set to the old client host
    // (sometimes including /workspace). For auth/onboarding we always use app.
    if (parsed.hostname === 'client.verifactu.business') {
      return 'https://app.verifactu.business';
    }

    // Always return origin-only to avoid accidental path pollution from env vars.
    return parsed.origin;
  } catch {
    return fallback;
  }
}

/**
 * Get the app URL for backend, onboarding and protected flows.
 */
export function getAppUrl(): string {
  const fallback = 'https://app.verifactu.business';

  if (typeof window === 'undefined') {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, fallback);
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, fallback);
}

/**
 * Get the new client app URL for customer-facing workspace pages.
 */
export function getClientUrl(): string {
  if (typeof window === 'undefined') {
    // Legacy compatibility: if NEXT_PUBLIC_CLIENT_URL is not set, route to app.
    return (
      process.env.NEXT_PUBLIC_CLIENT_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://app.verifactu.business'
    );
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }

  return (
    process.env.NEXT_PUBLIC_CLIENT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://app.verifactu.business'
  );
}

/**
 * Get the landing URL for redirects and links.
 */
export function getLandingUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business';
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  return process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business';
}

/**
 * Get the standalone Isaak site URL.
 */
export function getIsaakUrl(): string {
  const fallback = 'https://isaak.verifactu.business';

  if (typeof window === 'undefined') {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_ISAAK_SITE_URL, fallback);
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3012';
  }

  return normalizeBaseUrl(process.env.NEXT_PUBLIC_ISAAK_SITE_URL, fallback);
}
