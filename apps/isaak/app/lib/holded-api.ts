const HOLDED_BASE = process.env.HOLDED_API_BASE ?? 'https://api.holded.com';

const RETRYABLE = new Set([429, 502, 503, 504]);

async function holdedFetch(apiKey: string, path: string): Promise<unknown> {
  const url = `${HOLDED_BASE}${path}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    const res = await fetch(url, {
      headers: {
        key: apiKey,
        Accept: 'application/json',
        // Node.js fetch sends Accept-Encoding: br by default; some Holded proxies
        // return brotli-encoded bodies that undici fails to decompress silently.
        'Accept-Encoding': 'identity',
      },
    });
    if (!res.ok) {
      if (RETRYABLE.has(res.status) && attempt < 2) continue;
      throw new Error(`Holded API ${res.status} at ${path}`);
    }
    const data = await res.json().catch(() => null);
    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      'status' in data &&
      (data as { status?: unknown }).status === 0
    ) {
      throw new Error(
        `Holded soft error at ${path}: ${JSON.stringify((data as { info?: unknown }).info ?? '')}`
      );
    }
    return data;
  }
  throw lastErr ?? new Error(`Holded API request failed: ${path}`);
}

function toUnix(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return String(value);
  const n = Number(value);
  if (!isNaN(n) && n > 1e9) return String(Math.floor(n));
  const ms = Date.parse(value);
  if (!isNaN(ms)) return String(Math.floor(ms / 1000));
  return undefined;
}

function defaultDocRange() {
  const now = Math.floor(Date.now() / 1000);
  const prevYearStart = new Date(new Date().getFullYear() - 1, 0, 1);
  return {
    starttmp: String(Math.floor(prevYearStart.getTime() / 1000)),
    endtmp: String(now),
  };
}

export async function holdedListDocuments(
  apiKey: string,
  params: {
    docType: string;
    starttmp?: string;
    endtmp?: string;
    contactId?: string;
    limit?: number;
  }
) {
  const range = defaultDocRange();
  const qs = new URLSearchParams({
    starttmp: toUnix(params.starttmp) ?? range.starttmp,
    endtmp: toUnix(params.endtmp) ?? range.endtmp,
    ...(params.contactId ? { contactId: params.contactId } : {}),
  });
  const raw = (await holdedFetch(
    apiKey,
    `/api/invoicing/v1/documents/${params.docType}?${qs}`
  )) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  const limit = params.limit ?? 50;
  return { documents: all.slice(0, limit), total: all.length, truncated: all.length > limit };
}

export async function holdedGetDocument(apiKey: string, docType: string, documentId: string) {
  return holdedFetch(apiKey, `/api/invoicing/v1/documents/${docType}/${documentId}`);
}

export async function holdedListContacts(
  apiKey: string,
  params?: { type?: string; limit?: number }
) {
  const qs = new URLSearchParams(params?.type ? { type: params.type } : {});
  const raw = (await holdedFetch(
    apiKey,
    `/api/invoicing/v1/contacts${qs.toString() ? '?' + qs : ''}`
  )) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  const limit = params?.limit ?? 50;
  return { contacts: all.slice(0, limit), total: all.length, truncated: all.length > limit };
}

export async function holdedGetContact(apiKey: string, contactId: string) {
  return holdedFetch(apiKey, `/api/invoicing/v1/contacts/${contactId}`);
}

export async function holdedGetChartOfAccounts(apiKey: string) {
  return holdedFetch(apiKey, '/api/accounting/v1/chartofaccounts?includeEmpty=1');
}

export async function holdedGetJournal(
  apiKey: string,
  params?: { starttmp?: string; endtmp?: string }
) {
  const range = defaultDocRange();
  const qs = new URLSearchParams({
    starttmp: toUnix(params?.starttmp) ?? range.starttmp,
    endtmp: toUnix(params?.endtmp) ?? range.endtmp,
  });
  const raw = (await holdedFetch(apiKey, `/api/accounting/v1/dailyledger?${qs}`)) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  return { entries: all.slice(0, 100), total: all.length, truncated: all.length > 100 };
}

export async function holdedListTreasuryAccounts(apiKey: string) {
  const raw = await holdedFetch(apiKey, '/api/invoicing/v1/treasury');
  return Array.isArray(raw) ? raw : [];
}

export async function holdedListProducts(apiKey: string, params?: { limit?: number }) {
  const raw = (await holdedFetch(apiKey, '/api/invoicing/v1/products')) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  const limit = params?.limit ?? 50;
  return { products: all.slice(0, limit), total: all.length, truncated: all.length > limit };
}

export async function holdedListProjects(apiKey: string) {
  const raw = await holdedFetch(apiKey, '/api/projects/v1/projects');
  return Array.isArray(raw) ? raw : [];
}

export async function holdedListEmployees(apiKey: string) {
  const raw = await holdedFetch(apiKey, '/api/team/v1/employees');
  return Array.isArray(raw) ? raw : [];
}
