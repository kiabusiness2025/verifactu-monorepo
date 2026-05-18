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
  type: 'text' | 'audio' | 'image' | 'document' | 'video' | 'sticker' | 'interactive' | string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string; voice?: boolean };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  sticker?: { id: string; mime_type: string; sha256: string; animated?: boolean };
  interactive?: {
    type: 'button_reply' | 'list_reply' | 'nfm_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
    nfm_reply?: { name: string; response_json: string; body: string };
  };
};

// ── Tipos de mensajes interactivos salientes ─────────────────────────────────

export type WaButton = { id: string; title: string }; // title max 20 chars
export type WaListRow = { id: string; title: string; description?: string }; // title max 24, desc max 72
export type WaListSection = { title?: string; rows: WaListRow[] };

// ── Tipos para templates HSM (WA-III) ────────────────────────────────────────

export type WaTemplateTextParam = { type: 'text'; text: string };
export type WaTemplateDateTimeParam = { type: 'date_time'; date_time: { fallback_value: string } };
export type WaTemplateParam = WaTemplateTextParam | WaTemplateDateTimeParam;

export type WaTemplateComponent =
  | { type: 'header'; parameters: WaTemplateParam[] }
  | { type: 'body'; parameters: WaTemplateParam[] }
  | {
      type: 'button';
      sub_type: 'quick_reply' | 'url';
      index: number;
      parameters: WaTemplateParam[];
    };

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

// ── Envío de WhatsApp Flows (WA-IV) ─────────────────────────────────────────

/**
 * Envía un mensaje interactivo de tipo "flow" que abre un formulario guiado.
 * Requiere que el Flow esté publicado en Meta Business Manager.
 * El flowToken se usa para vincular la respuesta nfm_reply a la sesión (puede ser "unused").
 */
export async function sendWhatsAppFlow(
  to: string,
  body: string,
  ctaText: string,
  flowId: string,
  screenId: string,
  flowToken = 'unused'
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
        type: 'flow',
        body: { text: body },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: flowToken,
            flow_id: flowId,
            mode: 'published',
            flow_cta: ctaText,
            flow_action: 'navigate',
            flow_action_payload: { screen: screenId },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] send flow failed ${res.status}: ${err}`);
  }
}

// ── Envío de templates HSM (WA-III) — requiere aprobación previa de Meta ─────

/**
 * Envía un template de WhatsApp aprobado por Meta.
 * Solo funciona fuera de la ventana de 24h con templates en estado APPROVED.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: WaTemplateComponent[]
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
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components?.length ? { components } : {}),
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] send template "${templateName}" failed ${res.status}: ${err}`);
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

/** Sube un archivo a los servidores de Meta y devuelve el media_id */
export async function uploadWhatsAppMedia(file: Blob, mimeType: string): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', file, 'attachment');

  const res = await fetch(`${WA_BASE}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] media upload failed ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export type WaMediaType = 'image' | 'document' | 'audio' | 'video';

/** Envía un mensaje de media usando un media_id ya subido */
export async function sendWhatsAppMedia(
  to: string,
  mediaId: string,
  mediaType: WaMediaType,
  caption?: string,
  filename?: string
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;

  const mediaPayload: Record<string, unknown> = { id: mediaId };
  if (caption) mediaPayload.caption = caption;
  if (filename && mediaType === 'document') mediaPayload.filename = filename;

  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[whatsapp] send media failed ${res.status}: ${err}`);
  }
}

/** Obtiene la URL de descarga de un media_id de Meta */
export async function getWhatsAppMediaUrl(mediaId: string): Promise<string> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const res = await fetch(`${WA_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`[whatsapp] media url fetch failed ${res.status}`);
  const data = (await res.json()) as { url: string };
  return data.url;
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
