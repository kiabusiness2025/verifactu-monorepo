import { getValidMicrosoftToken } from './microsoft-oauth';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

export type MicrosoftCalendarEvent = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isAllDay?: boolean;
  location?: { displayName?: string };
  webLink?: string;
  organizer?: { emailAddress?: { name?: string; address?: string } };
};

export async function listOutlookEvents(
  tenantId: string,
  userId: string,
  options: {
    startDateTime?: string;
    endDateTime?: string;
    maxResults?: number;
    search?: string;
  } = {}
): Promise<MicrosoftCalendarEvent[]> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return [];

  const params = new URLSearchParams({
    $top: String(options.maxResults ?? 15),
    $orderby: 'start/dateTime',
    $select: 'id,subject,bodyPreview,start,end,isAllDay,location,webLink,organizer',
  });

  const start = options.startDateTime ?? new Date().toISOString();
  const end = options.endDateTime ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  params.set('startDateTime', start);
  params.set('endDateTime', end);
  if (options.search) params.set('$search', `"${options.search}"`);

  const res = await fetch(`${GRAPH_API}/me/calendarView?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="Europe/Madrid"' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { value?: MicrosoftCalendarEvent[] };
  return data.value ?? [];
}

export async function createOutlookEvent(
  tenantId: string,
  userId: string,
  event: {
    subject: string;
    body?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    isAllDay?: boolean;
    location?: string;
  }
): Promise<{ id: string; webLink?: string } | null> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return null;

  const body = {
    subject: event.subject,
    body: event.body ? { contentType: 'text', content: event.body } : undefined,
    start: { dateTime: event.start.dateTime, timeZone: event.start.timeZone ?? 'Europe/Madrid' },
    end: { dateTime: event.end.dateTime, timeZone: event.end.timeZone ?? 'Europe/Madrid' },
    isAllDay: event.isAllDay ?? false,
    location: event.location ? { displayName: event.location } : undefined,
  };

  const res = await fetch(`${GRAPH_API}/me/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; webLink?: string }>;
}

export async function updateOutlookEvent(
  tenantId: string,
  userId: string,
  eventId: string,
  patch: {
    subject?: string;
    body?: string;
    start?: { dateTime: string; timeZone?: string };
    end?: { dateTime: string; timeZone?: string };
  }
): Promise<boolean> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return false;

  const body: Record<string, unknown> = {};
  if (patch.subject) body.subject = patch.subject;
  if (patch.body) body.body = { contentType: 'text', content: patch.body };
  if (patch.start)
    body.start = {
      dateTime: patch.start.dateTime,
      timeZone: patch.start.timeZone ?? 'Europe/Madrid',
    };
  if (patch.end)
    body.end = { dateTime: patch.end.dateTime, timeZone: patch.end.timeZone ?? 'Europe/Madrid' };

  const res = await fetch(`${GRAPH_API}/me/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function deleteOutlookEvent(
  tenantId: string,
  userId: string,
  eventId: string
): Promise<boolean> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return false;

  const res = await fetch(`${GRAPH_API}/me/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.status === 204 || res.ok;
}

export type OutlookDeadlineSync = {
  created: number;
  skipped: number;
  errors: number;
};

export async function syncFiscalDeadlinesToOutlook(
  tenantId: string,
  userId: string,
  deadlines: Array<{ id: string; title: string; description: string; date: Date }>
): Promise<OutlookDeadlineSync> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return { created: 0, skipped: 0, errors: deadlines.length };

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const d of deadlines) {
    // Check if already exists via extended property search
    const dateStr = d.date.toISOString().slice(0, 10);
    const searchRes = await fetch(
      `${GRAPH_API}/me/events?$filter=subject eq '📅 ${d.title.replace(/'/g, "''")}'&$select=id`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as { value?: unknown[] };
      if (searchData.value && searchData.value.length > 0) {
        skipped++;
        continue;
      }
    }

    const res = await fetch(`${GRAPH_API}/me/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: `📅 ${d.title}`,
        body: { contentType: 'text', content: d.description },
        start: { dateTime: `${dateStr}T09:00:00`, timeZone: 'Europe/Madrid' },
        end: { dateTime: `${dateStr}T10:00:00`, timeZone: 'Europe/Madrid' },
        isReminderOn: true,
        reminderMinutesBeforeStart: 1440,
      }),
    });

    if (res.ok) created++;
    else errors++;
  }

  return { created, skipped, errors };
}
