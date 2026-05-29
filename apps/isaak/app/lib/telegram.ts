/**
 * F15 — Telegram Bot API helpers para Isaak.
 *
 * Envío de mensajes, teclados inline, verificación de webhook,
 * lookup de tenant por chatId y gestión de TelegramChat/TelegramMessage.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from './prisma';

const TG_BASE = `https://api.telegram.org/bot`;

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
}

function tgUrl(method: string): string {
  return `${TG_BASE}${botToken()}/${method}`;
}

// ── Tipos del webhook ────────────────────────────────────────────────────────

export type TgUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
  language_code?: string;
};

export type TgChat = {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  username?: string;
  first_name?: string;
};

export type TgOrderInfo = {
  name?: string;
  phone_number?: string;
  email?: string;
};

export type TgSuccessfulPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
  order_info?: TgOrderInfo;
};

export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  photo?: unknown[];
  document?: { file_id: string; file_name?: string; mime_type?: string };
  caption?: string;
  successful_payment?: TgSuccessfulPayment;
};

export type TgCallbackQuery = {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
};

export type TgPreCheckoutQuery = {
  id: string;
  from: TgUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
  order_info?: TgOrderInfo;
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
  pre_checkout_query?: TgPreCheckoutQuery;
};

// ── Tipos de respuesta ────────────────────────────────────────────────────────

export type TgInlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };
export type TgInlineKeyboard = TgInlineButton[][];

// ── Verificación del webhook ──────────────────────────────────────────────────

/**
 * Telegram envía X-Telegram-Bot-Api-Secret-Token como header.
 * Es el mismo valor que se configuró en setWebhook({ secret_token }).
 */
export function verifyTelegramWebhook(secretToken: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected || !secretToken) return false;
  if (secretToken.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(secretToken), Buffer.from(expected));
}

// ── API calls ────────────────────────────────────────────────────────────────

async function tgPost<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(tgUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${JSON.stringify(json)}`);
  return json.result as T;
}

export async function sendTelegramText(
  chatId: number,
  text: string,
  replyMarkup?: TgInlineKeyboard
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.slice(0, 4096),
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = { inline_keyboard: replyMarkup };
  }
  await tgPost('sendMessage', body);
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await tgPost('answerCallbackQuery', { callback_query_id: callbackQueryId }).catch(() => {});
}

export async function setTelegramWebhook(webhookUrl: string): Promise<void> {
  await tgPost('setWebhook', {
    url: webhookUrl,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '',
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
    drop_pending_updates: true,
  });
}

export async function sendTelegramInvoice(
  chatId: number,
  opts: {
    title: string;
    description: string;
    payload: string;
    amountCents: number;
    currency?: string;
    needEmail?: boolean;
    needName?: boolean;
    photoUrl?: string;
  }
): Promise<void> {
  const providerToken = process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN?.trim() ?? '';
  await tgPost('sendInvoice', {
    chat_id: chatId,
    title: opts.title,
    description: opts.description,
    payload: opts.payload,
    provider_token: providerToken,
    currency: opts.currency ?? 'EUR',
    prices: [{ label: opts.title, amount: opts.amountCents }],
    need_email: opts.needEmail ?? true,
    need_name: opts.needName ?? true,
    ...(opts.photoUrl ? { photo_url: opts.photoUrl } : {}),
  });
}

export async function answerPreCheckoutQuery(
  queryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  const body: Record<string, unknown> = { pre_checkout_query_id: queryId, ok };
  if (!ok && errorMessage) body.error_message = errorMessage;
  await tgPost('answerPreCheckoutQuery', body);
}

// ── Helpers de formato ────────────────────────────────────────────────────────

/** Escapa caracteres especiales de HTML para parse_mode=HTML */
export function tgEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convierte markdown básico de Isaak a HTML válido para Telegram */
export function markdownToTgHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/_(.+?)_/g, '<i>$1</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/&(?!amp;|lt;|gt;)/g, '&amp;');
}

/** Trunca a 4096 chars (límite de Telegram) */
export function truncateForTelegram(text: string, max = 4000): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

// ── Gestión de TelegramChat en DB ────────────────────────────────────────────

export async function upsertTelegramChat(
  tgChatId: number,
  opts: { tenantId?: string | null; username?: string | null; firstName?: string | null }
): Promise<string> {
  const now = new Date();
  const existing = await prisma.telegramChat.findUnique({
    where: { chatId: BigInt(tgChatId) },
    select: { id: true, tenantId: true },
  });

  if (existing) {
    const updateData: Record<string, unknown> = { lastMessageAt: now };
    if (opts.username !== undefined) updateData.username = opts.username;
    if (opts.firstName !== undefined) updateData.firstName = opts.firstName;
    if (opts.tenantId && !existing.tenantId) updateData.tenantId = opts.tenantId;
    await prisma.telegramChat.update({ where: { id: existing.id }, data: updateData });
    return existing.id;
  }

  const chat = await prisma.telegramChat.create({
    data: {
      chatId: BigInt(tgChatId),
      tenantId: opts.tenantId ?? null,
      username: opts.username ?? null,
      firstName: opts.firstName ?? null,
      lastMessageAt: now,
      updatedAt: now,
    },
    select: { id: true },
  });
  return chat.id;
}

export async function findTenantIdByChatId(tgChatId: number): Promise<string | null> {
  const chat = await prisma.telegramChat.findUnique({
    where: { chatId: BigInt(tgChatId) },
    select: { tenantId: true },
  });
  return chat?.tenantId ?? null;
}

export async function linkChatToTenant(tgChatId: number, tenantId: string): Promise<void> {
  await prisma.telegramChat.updateMany({
    where: { chatId: BigInt(tgChatId) },
    data: { tenantId },
  });
}

export async function saveTelegramMessage(opts: {
  chatDbId: string;
  tenantId: string | null;
  messageId?: number | null;
  direction: 'inbound' | 'outbound';
  eventType: string;
  body?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.telegramMessage
    .create({
      data: {
        chatId: opts.chatDbId,
        tenantId: opts.tenantId,
        messageId: opts.messageId ?? null,
        direction: opts.direction,
        eventType: opts.eventType,
        body: opts.body ?? null,
        payload: opts.payload
          ? (opts.payload as import('@prisma/client').Prisma.InputJsonValue)
          : undefined,
      },
    })
    .catch(() => {});
}

export async function loadTelegramHistory(
  chatDbId: string,
  currentText: string,
  maxTurns = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const rows = await prisma.telegramMessage.findMany({
    where: { chatId: chatDbId, body: { not: null } },
    orderBy: { occurredAt: 'desc' },
    take: maxTurns * 2 + 1,
    select: { direction: true, body: true },
  });

  const messages = rows
    .reverse()
    .filter((r) => r.body && !r.body.startsWith('['))
    .map((r) => ({
      role: (r.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: r.body!,
    }));

  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content = currentText;
  } else {
    messages.push({ role: 'user', content: currentText });
  }

  return messages;
}

// ── Link tokens ───────────────────────────────────────────────────────────────

export async function createTelegramLinkToken(tenantId: string): Promise<string> {
  const { randomUUID } = await import('crypto');
  const token = randomUUID().replace(/-/g, '').slice(0, 24);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await prisma.telegramLinkToken.create({
    data: { tenantId, token, expiresAt },
  });
  return token;
}

export async function consumeTelegramLinkToken(
  token: string,
  tgChatId: number
): Promise<string | null> {
  const record = await prisma.telegramLinkToken.findUnique({
    where: { token },
    select: { id: true, tenantId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await prisma.telegramLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date(), chatId: BigInt(tgChatId) },
  });
  return record.tenantId;
}
