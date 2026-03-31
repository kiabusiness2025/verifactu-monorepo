export type HoldedEntryChannel = 'dashboard' | 'chatgpt';

type SearchParamValue = string | string[] | undefined | null;

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeValue(value: SearchParamValue) {
  const resolved = firstValue(value)?.trim();
  return resolved ? resolved : null;
}

function isChatgptSource(source: string | null) {
  if (!source) return false;

  const normalized = source.toLowerCase();
  return (
    normalized.includes('chatgpt') ||
    normalized === 'holded_landing' ||
    normalized === 'holded_oauth'
  );
}

function isChatgptNextTarget(nextUrl: string | null) {
  if (!nextUrl) return false;

  try {
    const parsed = new URL(nextUrl, 'https://app.verifactu.business');
    if (parsed.pathname === '/oauth/authorize') return true;

    const clientId = parsed.searchParams.get('client_id')?.trim().toLowerCase() || '';
    if (clientId.startsWith('openai-chatgpt-')) return true;

    const redirectUri = parsed.searchParams.get('redirect_uri')?.trim().toLowerCase() || '';
    return redirectUri.includes('chat.openai.com') || redirectUri.includes('chatgpt.com');
  } catch {
    return false;
  }
}

export function inferHoldedEntryChannel(input: {
  channel?: SearchParamValue;
  source?: SearchParamValue;
  next?: SearchParamValue;
}): HoldedEntryChannel {
  const channel = normalizeValue(input.channel)?.toLowerCase();
  if (channel === 'chatgpt') return 'chatgpt';

  const source = normalizeValue(input.source);
  if (isChatgptSource(source)) return 'chatgpt';

  const nextUrl = normalizeValue(input.next);
  if (isChatgptNextTarget(nextUrl)) return 'chatgpt';

  return 'dashboard';
}
