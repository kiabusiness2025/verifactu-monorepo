/**
 * Resolves a safe redirect target from a `next` query parameter.
 *
 * Validates the URL against an allowlist of permitted origins.
 * Returns the fallback if the `next` param is missing, malformed, or cross-origin.
 */
export function resolveSafeRedirect(
  nextParam: string,
  fallback: string,
  allowedOriginUrls: string[],
  onInvalid?: (reason: 'cross-origin' | 'malformed', value: string) => void
): string {
  if (!nextParam) return fallback;

  try {
    const target = new URL(nextParam);
    const allowedOrigins = new Set(allowedOriginUrls.map((u) => new URL(u).origin));

    if (!allowedOrigins.has(target.origin)) {
      onInvalid?.('cross-origin', nextParam);
      return fallback;
    }

    return target.toString();
  } catch {
    onInvalid?.('malformed', nextParam);
    return fallback;
  }
}
