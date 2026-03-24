/**
 * Get the app URL for backend, onboarding and protected flows.
 */
export function getAppUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
}

/**
 * Get the new client app URL for customer-facing workspace pages.
 */
export function getClientUrl(): string {
  if (typeof window === 'undefined') {
    // Legacy compatibility: if NEXT_PUBLIC_CLIENT_URL is not set, route to app.
    return process.env.NEXT_PUBLIC_CLIENT_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }

  return process.env.NEXT_PUBLIC_CLIENT_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
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
