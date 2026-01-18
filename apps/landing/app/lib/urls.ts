/**
 * Get the app URL for redirects and links
 * In development: http://localhost:3000
 * In production: https://app.verifactu.business
 */
export function getAppUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
  }

  // Client-side: detect from hostname
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  if (hostname === 'verifactu.business') {
    return 'https://app.verifactu.business';
  }

  // Fallback to env variable or default
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
}

/**
 * Get the landing URL for redirects and links
 */
export function getLandingUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business';
  }

  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  return 'https://verifactu.business';
}
