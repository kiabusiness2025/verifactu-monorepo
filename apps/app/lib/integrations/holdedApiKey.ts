export function normalizeHoldedApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}
