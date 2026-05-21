import { prisma } from '@/app/lib/prisma';
import type { FiscalDeadline } from './fiscal-calendar';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

function getClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? '';
}
function getClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET ?? '';
}
function getRedirectUri() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3002';
  return `${base}/api/isaak/google/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return res.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function getValidAccessToken(
  tenantId: string,
  userId: string
): Promise<string | null> {
  const token = await prisma.isaakGoogleToken.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!token) return null;

  if (token.expiresAt && token.expiresAt.getTime() > Date.now() + 60_000) {
    return token.accessToken;
  }

  if (!token.refreshToken) return null;

  try {
    const refreshed = await refreshAccessToken(token.refreshToken);
    await prisma.isaakGoogleToken.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    });
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

type CalendarEventResult = { created: number; skipped: number; errors: number };

export async function syncFiscalDeadlinesToCalendar(
  accessToken: string,
  deadlines: FiscalDeadline[]
): Promise<CalendarEventResult> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const d of deadlines) {
    const dateStr = d.date.toISOString().slice(0, 10);
    const event = {
      summary: `📅 ${d.title}`,
      description: d.description,
      start: { date: dateStr },
      end: { date: dateStr },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: d.alertDaysBefore * 24 * 60 },
          { method: 'popup', minutes: d.alertDaysBefore * 24 * 60 },
        ],
      },
      extendedProperties: {
        private: { isaakFiscalId: d.id, modelo: d.modelo },
      },
    };

    // Check if event already exists by querying with private property
    const existsRes = await fetch(
      `${CALENDAR_API}/calendars/primary/events?privateExtendedProperty=isaakFiscalId%3D${encodeURIComponent(d.id)}&fields=items(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (existsRes.ok) {
      const existsData = (await existsRes.json()) as { items?: unknown[] };
      if (existsData.items && existsData.items.length > 0) {
        skipped++;
        continue;
      }
    }

    const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (res.ok) {
      created++;
    } else {
      errors++;
    }
  }

  return { created, skipped, errors };
}

export type CalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  status?: string;
  htmlLink?: string;
};

export async function listCalendarEvents(
  accessToken: string,
  options: { timeMin?: string; timeMax?: string; maxResults?: number; q?: string } = {}
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(options.maxResults ?? 20),
  });
  if (options.timeMin) params.set('timeMin', options.timeMin);
  else params.set('timeMin', new Date().toISOString());
  if (options.timeMax) params.set('timeMax', options.timeMax);
  if (options.q) params.set('q', options.q);

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: CalendarEvent[] };
  return data.items ?? [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end: { date?: string; dateTime?: string; timeZone?: string };
  }
): Promise<{ id: string; htmlLink?: string } | null> {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; htmlLink?: string }>;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  patch: {
    summary?: string;
    description?: string;
    start?: { date?: string; dateTime?: string; timeZone?: string };
    end?: { date?: string; dateTime?: string; timeZone?: string };
  }
): Promise<boolean> {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.status === 204 || res.ok;
}
