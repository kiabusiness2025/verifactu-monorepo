import { getValidMicrosoftToken } from './microsoft-oauth';
import { prisma } from '@/app/lib/prisma';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

export type OutlookMailMessage = {
  id: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
  hasAttachments?: boolean;
  isRead?: boolean;
  webLink?: string;
  hasLikelyInvoice?: boolean;
};

export async function hasMicrosoftMailScope(tenantId: string, userId: string): Promise<boolean> {
  const token = await prisma.isaakMicrosoftToken
    .findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { scopes: true },
    })
    .catch(() => null);
  if (!token?.scopes) return false;
  return token.scopes.includes('Mail.ReadWrite') || token.scopes.includes('Mail.Read');
}

export async function hasMicrosoftSendScope(tenantId: string, userId: string): Promise<boolean> {
  const token = await prisma.isaakMicrosoftToken
    .findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { scopes: true },
    })
    .catch(() => null);
  if (!token?.scopes) return false;
  return token.scopes.includes('Mail.Send');
}

export async function scanOutlookForInvoices(
  tenantId: string,
  userId: string,
  options: { daysBack?: number; maxResults?: number } = {}
): Promise<{ messages: OutlookMailMessage[]; scannedAt: string }> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) throw new Error('no_access_token');

  const { daysBack = 30, maxResults = 20 } = options;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const filter = `hasAttachments eq true and receivedDateTime ge ${since}`;
  const search = `(factura OR invoice OR receipt OR "factura adjunta" OR albarán)`;

  const params = new URLSearchParams({
    $top: String(maxResults),
    $filter: filter,
    $search: `"${search}"`,
    $select: 'id,subject,from,receivedDateTime,bodyPreview,hasAttachments,isRead,webLink',
    $orderby: 'receivedDateTime desc',
  });

  const res = await fetch(`${GRAPH_API}/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Outlook scan failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { value?: OutlookMailMessage[] };
  const messages = (data.value ?? []).map((m) => ({
    ...m,
    hasLikelyInvoice:
      /factura|invoice|receipt|albar[aá]n|presupuesto/i.test(m.subject ?? '') ||
      /factura|invoice|receipt/i.test(m.bodyPreview ?? ''),
  }));

  return { messages, scannedAt: new Date().toISOString() };
}

export async function archiveOutlookMessage(
  tenantId: string,
  userId: string,
  messageId: string
): Promise<boolean> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return false;

  const res = await fetch(`${GRAPH_API}/me/messages/${messageId}/move`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinationId: 'archive' }),
  });
  return res.ok;
}

export async function sendOutlookMail(
  tenantId: string,
  userId: string,
  mail: {
    to: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  }
): Promise<boolean> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return false;

  const message = {
    subject: mail.subject,
    body: { contentType: mail.isHtml ? 'HTML' : 'Text', content: mail.body },
    toRecipients: mail.to.map((addr) => ({ emailAddress: { address: addr } })),
  };

  const res = await fetch(`${GRAPH_API}/me/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  return res.status === 202 || res.ok;
}
