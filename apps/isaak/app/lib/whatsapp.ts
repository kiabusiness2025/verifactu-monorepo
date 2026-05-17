/**
 * WhatsApp Business Cloud API — helpers para Isaak
 *
 * Envío de mensajes, búsqueda de tenant por número y gestión de threads.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from './prisma';

const WA_API_VERSION = 'v19.0';
const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

// ── Tipos de payload entrante ────────────────────────────────────────────────

export type WaIncomingMessage = {
  from: string; // número E.164 sin "+"
  id: string;
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'document' | 'interactive' | string;
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
};

// ── Tipos de mensajes interactivos salientes ─────────────────────────────────

export type WaButton = { id: string; title: string }; // title max 20 chars
export type WaListRow = { id: string; title: string; description?: string }; // title max 24, desc max 72
export type WaListSection = { title?: string; rows: WaListRow[] };

export type WaWebhookBody = {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: { profile: { name: string }; wa_id: string }[];
        messages?: WaIncomingMessage[];
        statuses?: unknown[];
      };
      field: string;
    }[];
  }[];
};

// ── Envío de mensajes ────────────────────────────────────────────────────────

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;

  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] send failed ${res.status}: ${err}`);
  }
}

// ── Envío de mensajes interactivos ──────────────────────────────────────────

export async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: WaButton[]
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] send buttons failed ${res.status}: ${err}`);
  }
}

export async function sendWhatsAppList(
  to: string,
  body: string,
  buttonLabel: string,
  sections: WaListSection[]
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: buttonLabel,
          sections: sections.map((s) => ({
            ...(s.title ? { title: s.title } : {}),
            rows: s.rows.map((r) => ({
              id: r.id,
              title: r.title,
              ...(r.description ? { description: r.description } : {}),
            })),
          })),
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] send list failed ${res.status}: ${err}`);
  }
}

export async function sendWhatsAppCtaUrl(
  to: string,
  body: string,
  displayText: string,
  url: string
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: body },
        action: { name: 'cta_url', parameters: { display_text: displayText, url } },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] send cta_url failed ${res.status}: ${err}`);
  }
}

// ── Búsqueda de tenant por número ────────────────────────────────────────────

/**
 * Busca el tenantId asociado al número entrante.
 * Orden: thread existente → User.phone → TenantProfile.phone
 */
export async function findTenantIdByPhone(phone: string): Promise<string | null> {
  const normalized = normalizePhone(phone);

  // 1. Thread existente ya vinculado
  const thread = await prisma.whatsAppThread.findFirst({
    where: { phoneNumber: normalized, tenantId: { not: null }, status: { not: 'opted_out' } },
    select: { tenantId: true },
    orderBy: { lastMessageAt: 'desc' },
  });
  if (thread?.tenantId) return thread.tenantId;

  // 2. User con ese teléfono registrado → buscar su membership
  const user = await prisma.user.findFirst({
    where: { phone: { in: [normalized, phone, `+${phone}`] } },
    select: { id: true },
  });
  if (user) {
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, role: { in: ['OWNER', 'ADMIN'] } },
      select: { tenantId: true },
    });
    if (membership?.tenantId) return membership.tenantId;
  }

  // 3. TenantProfile con ese teléfono
  const profile = await prisma.tenantProfile.findFirst({
    where: { phone: { in: [normalized, phone, `+${phone}`] } },
    select: { tenantId: true },
  });
  return profile?.tenantId ?? null;
}

// ── Gestión de threads ────────────────────────────────────────────────────────

export async function upsertWhatsAppThread(
  phone: string,
  tenantId: string | null
): Promise<string> {
  const normalized = normalizePhone(phone);
  const existing = await prisma.whatsAppThread.findFirst({
    where: { phoneNumber: normalized },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    await prisma.whatsAppThread.update({
      where: { id: existing.id },
      data: {
        tenantId: tenantId ?? undefined,
        lastMessageAt: new Date(),
      },
    });
    return existing.id;
  }

  const created = await prisma.whatsAppThread.create({
    data: {
      phoneNumber: normalized,
      tenantId,
      status: 'open',
      lastMessageAt: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

export async function saveWhatsAppEvent(input: {
  threadId: string;
  tenantId: string | null;
  providerMessageId: string;
  direction: 'inbound' | 'outbound';
  eventType: string;
  body: string | null;
  payload?: unknown;
}): Promise<void> {
  await prisma.whatsAppEvent.create({
    data: {
      threadId: input.threadId,
      tenantId: input.tenantId,
      providerMessageId: input.providerMessageId,
      direction: input.direction,
      eventType: input.eventType,
      status: input.direction === 'inbound' ? 'received' : 'sent',
      body: input.body,
      payload: (input.payload ?? null) as never,
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza a formato E.164 con "+" */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `+${digits}`;
}

/** Verifica la firma HMAC-SHA256 del webhook de Meta */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Trunca respuesta para respetar el límite de 4096 caracteres de WhatsApp */
export function truncateForWhatsApp(text: string, maxLen = 4000): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '…';
}

/** Elimina markdown que WhatsApp no renderiza (**, ##, etc.) */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // bold → WA bold
    .replace(/^#{1,3}\s+/gm, '*') // headings → bold indicator
    .replace(/^[-*]\s+/gm, '• ') // listas → bullet
    .replace(/`+([^`]+)`+/g, '$1') // código → texto plano
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → solo texto
    .trim();
}
