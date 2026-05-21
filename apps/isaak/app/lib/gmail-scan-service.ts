/**
 * Gmail scanning service for provider invoice detection.
 * Uses stored OAuth tokens from IsaakGoogleToken.
 * No external SDK — plain fetch() with Bearer token.
 */

import { prisma } from '@/app/lib/prisma';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ── Types ──────────────────────────────────────────────────────────────────────

export type GmailInvoiceCandidate = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string; // ISO string
  snippet: string;
  attachmentCount: number;
  hasLikelyInvoice: boolean;
};

type GmailMessageListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

type GmailMessageHeader = { name: string; value: string };

type GmailMessagePart = {
  mimeType: string;
  filename?: string;
  parts?: GmailMessagePart[];
};

type GmailMessageResponse = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: GmailMessageHeader[];
    parts?: GmailMessagePart[];
    mimeType?: string;
    filename?: string;
  };
};

// ── Token refresh ──────────────────────────────────────────────────────────────

function getClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? '';
}
function getClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET ?? '';
}

/**
 * Refresh the Google access token if it expires within the next 5 minutes.
 * Updates the IsaakGoogleToken record in the DB and returns a valid access token.
 * Returns null if no token exists or refresh fails.
 */
export async function refreshGoogleTokenIfNeeded(
  tenantId: string,
  userId: string
): Promise<string | null> {
  const token = await prisma.isaakGoogleToken.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!token) return null;

  const fiveMinutes = 5 * 60 * 1000;
  const isExpiringSoon = !token.expiresAt || token.expiresAt.getTime() < Date.now() + fiveMinutes;

  if (!isExpiringSoon) return token.accessToken;

  if (!token.refreshToken) return null;

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: token.refreshToken,
        client_id: getClientId(),
        client_secret: getClientSecret(),
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    await prisma.isaakGoogleToken.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: { accessToken: data.access_token, expiresAt },
    });
    return data.access_token;
  } catch {
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getHeader(headers: GmailMessageHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

// ── In-memory cache ────────────────────────────────────────────────────────────

type CacheEntry = {
  data: GmailInvoiceCandidate[];
  expiresAt: number;
  scannedAt: string;
};

const scanCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

export function getCachedScan(
  tenantId: string,
  userId: string
): { messages: GmailInvoiceCandidate[]; scannedAt: string } | null {
  const key = getCacheKey(tenantId, userId);
  const entry = scanCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    scanCache.delete(key);
    return null;
  }
  return { messages: entry.data, scannedAt: entry.scannedAt };
}

function setCachedScan(
  tenantId: string,
  userId: string,
  messages: GmailInvoiceCandidate[]
): string {
  const key = getCacheKey(tenantId, userId);
  const scannedAt = new Date().toISOString();
  scanCache.set(key, {
    data: messages,
    expiresAt: Date.now() + CACHE_TTL_MS,
    scannedAt,
  });
  return scannedAt;
}

// ── Main scan function ─────────────────────────────────────────────────────────

export type ScanGmailOptions = {
  maxResults?: number; // default 20
  daysBack?: number; // default 30
  forceRefresh?: boolean; // bypass cache
};

/**
 * Scan Gmail for emails that are likely provider invoices.
 * Query: has:attachment (factura OR invoice OR "factura adjunta" OR receipt) newer_than:Xd
 */
export async function scanGmailForInvoices(
  tenantId: string,
  userId: string,
  options: ScanGmailOptions = {}
): Promise<{ messages: GmailInvoiceCandidate[]; scannedAt: string }> {
  const { maxResults = 20, daysBack = 30, forceRefresh = false } = options;

  // Return cached results unless force-refreshing
  if (!forceRefresh) {
    const cached = getCachedScan(tenantId, userId);
    if (cached) return cached;
  }

  const accessToken = await refreshGoogleTokenIfNeeded(tenantId, userId);
  if (!accessToken) {
    throw new Error('no_access_token');
  }

  const query = `has:attachment (factura OR invoice OR "factura adjunta" OR receipt) newer_than:${daysBack}d`;
  const listUrl = `${GMAIL_API}/users/me/messages?${new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  }).toString()}`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) {
    const errText = await listRes.text().catch(() => '');
    throw new Error(`Gmail list failed: ${listRes.status} ${errText}`);
  }

  const listData = (await listRes.json()) as GmailMessageListResponse;
  const messageRefs = listData.messages ?? [];

  const candidates: GmailInvoiceCandidate[] = [];

  for (const ref of messageRefs) {
    try {
      const msgUrl = `${GMAIL_API}/users/me/messages/${ref.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
      const msgRes = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgRes.ok) continue;

      const msg = (await msgRes.json()) as GmailMessageResponse;
      const headers = msg.payload?.headers ?? [];

      const from = getHeader(headers, 'From');
      const subject = getHeader(headers, 'Subject');
      const dateHeader = getHeader(headers, 'Date');
      const snippet = msg.snippet ?? '';

      // For attachment details we need the full payload, but we use metadata format above
      // for speed. We determine "hasLikelyInvoice" from the subject/snippet heuristics
      // since attachment filenames require format=full (extra round-trip).
      const hasLikelyInvoice =
        /factura|invoice|receipt|albar[aá]n|presupuesto/i.test(subject) ||
        /factura|invoice|receipt/i.test(snippet);

      // Parse date header into ISO string
      let dateIso: string;
      try {
        dateIso = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();
      } catch {
        dateIso = new Date().toISOString();
      }

      candidates.push({
        id: msg.id,
        threadId: msg.threadId,
        from,
        subject,
        date: dateIso,
        snippet,
        attachmentCount: 0, // metadata format doesn't expose parts; set to 0
        hasLikelyInvoice,
      });
    } catch {
      // Skip individual message errors — continue with others
    }
  }

  const scannedAt = setCachedScan(tenantId, userId, candidates);
  return { messages: candidates, scannedAt };
}

/**
 * Check whether the stored token includes Gmail read access (readonly or modify).
 */
export async function hasGmailScope(tenantId: string, userId: string): Promise<boolean> {
  const token = await prisma.isaakGoogleToken
    .findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { scopes: true },
    })
    .catch(() => null);
  if (!token?.scopes) return false;
  return (
    token.scopes.includes('https://www.googleapis.com/auth/gmail.readonly') ||
    token.scopes.includes('https://www.googleapis.com/auth/gmail.modify')
  );
}

/**
 * Check whether the stored token includes gmail.modify (required for archive/label operations).
 */
export async function hasGmailModifyScope(tenantId: string, userId: string): Promise<boolean> {
  const token = await prisma.isaakGoogleToken
    .findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { scopes: true },
    })
    .catch(() => null);
  if (!token?.scopes) return false;
  return token.scopes.includes('https://www.googleapis.com/auth/gmail.modify');
}

/**
 * Archive a Gmail message by removing it from the INBOX label.
 * Requires gmail.modify scope.
 */
export async function archiveGmailMessage(
  tenantId: string,
  userId: string,
  messageId: string
): Promise<boolean> {
  const accessToken = await refreshGoogleTokenIfNeeded(tenantId, userId);
  if (!accessToken) return false;

  const res = await fetch(`${GMAIL_API}/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
  });
  return res.ok;
}
