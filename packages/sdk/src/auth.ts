/**
 * Builds the headers required to authenticate with the Isaak Platform API.
 *
 * The current contract uses Bearer authentication with API keys of shape
 * `isk_live_...` / `isk_test_...`.
 */
export function buildAuthHeaders(apiKey: string): Record<string, string> {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new TypeError(
      'IsaakClient: `apiKey` is required and must be a non-empty string.',
    );
  }
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Returns the SDK's User-Agent header. Kept centralized so we can bump the
 * version in a single spot.
 */
export function buildUserAgent(version: string): string {
  return `verifactu-sdk-js/${version}`;
}
