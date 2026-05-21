// Low-level Chift API client.
// Auth: client-credentials POST /token → bearer (30 min). Cached in-memory per consumer.
// Platform-level calls (create consumer, get connection URL) use no consumerId.
// Data calls (accounting endpoints) pass the tenant's consumerId.

const CHIFT_API = 'https://api.chift.eu';

interface TokenEntry {
  token: string;
  expiresAt: number; // ms epoch
}

// Key: consumerId | 'platform'
const tokenCache = new Map<string, TokenEntry>();

async function fetchToken(consumerId?: string): Promise<string> {
  const key = consumerId ?? 'platform';
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const body: Record<string, string> = {
    clientId: process.env.CHIFT_CLIENT_ID ?? '',
    clientSecret: process.env.CHIFT_CLIENT_SECRET ?? '',
    accountId: process.env.CHIFT_ACCOUNT_ID ?? '',
  };
  if (consumerId) body.consumerId = consumerId;

  const res = await fetch(`${CHIFT_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chift /token HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(key, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

export async function chiftGet<T>(
  path: string,
  consumerId?: string,
  params?: Record<string, string>
): Promise<T> {
  const token = await fetchToken(consumerId);
  const url = new URL(`${CHIFT_API}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Chift GET ${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function chiftPost<T>(path: string, body: unknown, consumerId?: string): Promise<T> {
  const token = await fetchToken(consumerId);

  const res = await fetch(`${CHIFT_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chift POST ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function chiftDelete(path: string, consumerId?: string): Promise<void> {
  const token = await fetchToken(consumerId);
  const res = await fetch(`${CHIFT_API}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Chift DELETE ${path} → HTTP ${res.status}`);
}

// --- Platform helpers ---

export type ChiftConsumer = {
  id: string;
  name: string;
  redirectionUrl?: string;
};

export type ChiftFolder = {
  id: string;
  name: string;
  selected?: boolean | null;
  vat?: string | null;
  company_number?: string | null;
  main_currency?: string | null;
};

export async function createChiftConsumer(
  name: string,
  redirectionUrl: string
): Promise<ChiftConsumer> {
  return chiftPost<ChiftConsumer>('/consumers', { name, redirectionUrl });
}

export async function getChiftConnectionUrl(consumerId: string): Promise<string> {
  const data = await chiftPost<{ url: string }>(
    `/consumers/${consumerId}/connections`,
    {},
    consumerId
  );
  return data.url;
}

export async function getChiftFolders(consumerId: string): Promise<ChiftFolder[]> {
  const data = await chiftGet<ChiftFolder[]>(
    `/consumers/${consumerId}/accounting/folders`,
    consumerId
  );
  return Array.isArray(data) ? data : [];
}

export function isChiftConfigured(): boolean {
  return !!(
    process.env.CHIFT_CLIENT_ID &&
    process.env.CHIFT_CLIENT_SECRET &&
    process.env.CHIFT_ACCOUNT_ID
  );
}
