/**
 * F15 — Telegram webhook para Isaak.
 *
 * POST /api/telegram/webhook
 *
 * Auth: X-Telegram-Bot-Api-Secret-Token header (configurado en setWebhook).
 * Responde 200 inmediatamente y procesa en background.
 *
 * Comandos soportados:
 *   /start [token]  — saludo o vinculación de cuenta
 *   /menu           — menú principal inline
 *   /ayuda          — instrucciones
 *   /desvincular    — eliminar vinculación con tenant
 * Callbacks:
 *   menu_resumen, menu_facturas, menu_iva, menu_fiscal, menu_plazos, menu_tipo
 *   followup_0..2
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@verifactu/utils';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { prisma } from '@/app/lib/prisma';
import {
  answerCallbackQuery,
  consumeTelegramLinkToken,
  findTenantIdByChatId,
  linkChatToTenant,
  loadTelegramHistory,
  markdownToTgHtml,
  saveTelegramMessage,
  sendTelegramText,
  truncateForTelegram,
  upsertTelegramChat,
  verifyTelegramWebhook,
  type TgInlineKeyboard,
  type TgUpdate,
} from '@/app/lib/telegram';
import {
  buildFiscalKnowledgeBlock,
  buildGeneralAdvisorInstructions,
  ISAAK_URLS,
} from '@/app/lib/fiscal-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Menús inline ─────────────────────────────────────────────────────────────

const MENU_CONNECTED: TgInlineKeyboard = [
  [
    { text: '📊 Resumen del mes', callback_data: 'menu_resumen' },
    { text: '📄 Mis facturas', callback_data: 'menu_facturas' },
  ],
  [
    { text: '🧾 IVA trimestral', callback_data: 'menu_iva' },
    { text: '📋 Consulta fiscal', callback_data: 'menu_fiscal' },
  ],
  [{ text: '📅 Plazos tributarios', callback_data: 'menu_plazos' }],
];

const MENU_GENERAL: TgInlineKeyboard = [
  [
    { text: '📋 Consulta fiscal', callback_data: 'menu_fiscal' },
    { text: '📅 Plazos tributarios', callback_data: 'menu_plazos' },
  ],
  [
    { text: '🏢 Autónomo vs empresa', callback_data: 'menu_tipo' },
    { text: '🔗 Vincular cuenta', callback_data: 'menu_vincular' },
  ],
  [{ text: '💳 Ver planes', url: ISAAK_URLS.pricing }],
];

const CALLBACK_QUERIES: Record<string, string> = {
  menu_resumen: 'Dame el resumen de ventas y gastos de este mes.',
  menu_facturas: '¿Qué facturas tengo pendientes de cobro?',
  menu_iva: 'Estima mi IVA del trimestre actual con los datos disponibles.',
  menu_fiscal: 'Tengo una consulta sobre fiscalidad o impuestos en España.',
  menu_plazos: '¿Cuáles son los próximos plazos tributarios del calendario fiscal español?',
  menu_tipo: '¿En qué se diferencia tributar como autónomo frente a tener una sociedad?',
};

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
  if (!verifyTelegramWebhook(secretToken)) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.text();
  void processUpdate(body);
  return new Response('OK', { status: 200 });
}

async function processUpdate(rawBody: string): Promise<void> {
  let update: TgUpdate;
  try {
    update = JSON.parse(rawBody) as TgUpdate;
  } catch {
    return;
  }

  if (update.message) {
    const msg = update.message;
    const tgChatId = msg.chat.id;
    const from = msg.from;
    const text = msg.text?.trim() ?? '';

    const chatDbId = await upsertTelegramChat(tgChatId, {
      username: from?.username,
      firstName: from?.first_name,
    });
    const tenantId = await findTenantIdByChatId(tgChatId);

    await saveTelegramMessage({
      chatDbId,
      tenantId,
      messageId: msg.message_id,
      direction: 'inbound',
      eventType: text.startsWith('/') ? 'command' : 'text',
      body: text,
      payload: { username: from?.username, firstName: from?.first_name },
    });

    if (text.startsWith('/start')) {
      await handleStart(tgChatId, chatDbId, tenantId, text, from?.first_name ?? null);
    } else if (text === '/menu' || text === '/menu@IsaakBot') {
      await handleMenu(tgChatId, chatDbId, tenantId, from?.first_name ?? null);
    } else if (text === '/ayuda' || text === '/help') {
      await handleHelp(tgChatId, chatDbId, tenantId);
    } else if (text === '/desvincular') {
      await handleUnlink(tgChatId, chatDbId, tenantId);
    } else if (text) {
      await runIsaakPipeline({
        tgChatId,
        chatDbId,
        tenantId,
        text,
        firstName: from?.first_name ?? null,
      });
    }
  }

  if (update.callback_query) {
    const cq = update.callback_query;
    await answerCallbackQuery(cq.id);
    const tgChatId = cq.message?.chat.id ?? cq.from.id;
    const chatDbId = await upsertTelegramChat(tgChatId, {
      username: cq.from.username,
      firstName: cq.from.first_name,
    });
    const tenantId = await findTenantIdByChatId(tgChatId);
    const data = cq.data ?? '';

    if (data === 'menu_vincular') {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://isaak.verifactu.business';
      await sendTelegramText(
        tgChatId,
        `🔗 Para vincular tu cuenta de Isaak, ve a:\n\n<b>${appUrl}/settings/telegram</b>\n\nGenerarás un enlace de vinculación que abrirás aquí en Telegram.`
      );
      await saveOutbound(chatDbId, tenantId, '[menu_vincular]');
      return;
    }

    const mappedQuery = CALLBACK_QUERIES[data];
    if (mappedQuery) {
      await runIsaakPipeline({
        tgChatId,
        chatDbId,
        tenantId,
        text: mappedQuery,
        firstName: cq.from.first_name ?? null,
      });
    }
  }
}

// ── Comandos ─────────────────────────────────────────────────────────────────

async function handleStart(
  tgChatId: number,
  chatDbId: string,
  currentTenantId: string | null,
  text: string,
  firstName: string | null
): Promise<void> {
  // /start <token> — vinculación de cuenta
  const parts = text.split(' ');
  if (parts.length > 1 && parts[1]) {
    const token = parts[1].trim();
    const tenantId = await consumeTelegramLinkToken(token, tgChatId);
    if (tenantId) {
      await linkChatToTenant(tgChatId, tenantId);
      const name = firstName ? `, ${firstName}` : '';
      const reply = `✅ <b>¡Cuenta vinculada correctamente${name}!</b>\n\nYa puedes preguntarme sobre tus datos de Holded: ventas, facturas, IVA, plazos fiscales y más.`;
      await sendTelegramText(tgChatId, reply, MENU_CONNECTED);
      await saveOutbound(chatDbId, tenantId, reply);
      return;
    } else {
      const reply =
        '⚠️ El enlace de vinculación no es válido o ha caducado (24h). Genera uno nuevo desde Isaak → Ajustes → Telegram.';
      await sendTelegramText(tgChatId, reply);
      await saveOutbound(chatDbId, null, reply);
      return;
    }
  }

  // /start sin token — saludo
  const name = firstName ? `, ${firstName}` : '';
  const hasAccount = Boolean(currentTenantId);
  const greeting = hasAccount
    ? `👋 <b>¡Hola${name}!</b> Tu cuenta de Isaak está vinculada. Puedo ayudarte con tus datos fiscales y contables.`
    : `👋 <b>¡Hola${name}!</b> Soy <b>Isaak</b>, tu asesor fiscal inteligente de Verifactu Business.\n\nPuedo asesorarte gratuitamente sobre fiscalidad española. Para acceder a tus datos contables, vincula tu cuenta de Isaak.`;

  const menu = hasAccount ? MENU_CONNECTED : MENU_GENERAL;
  await sendTelegramText(tgChatId, greeting, menu);
  await saveOutbound(chatDbId, currentTenantId, greeting);
}

async function handleMenu(
  tgChatId: number,
  chatDbId: string,
  tenantId: string | null,
  firstName: string | null
): Promise<void> {
  const name = firstName ? `, ${firstName}` : '';
  const text = `¿En qué puedo ayudarte${name}?`;
  const menu = tenantId ? MENU_CONNECTED : MENU_GENERAL;
  await sendTelegramText(tgChatId, text, menu);
  await saveOutbound(chatDbId, tenantId, text);
}

async function handleHelp(
  tgChatId: number,
  chatDbId: string,
  tenantId: string | null
): Promise<void> {
  const reply = [
    '<b>Isaak — Comandos disponibles</b>',
    '',
    '/start — Saludo y menú principal',
    '/menu — Menú de opciones',
    '/ayuda — Este mensaje',
    '/desvincular — Desconectar tu cuenta de Isaak',
    '',
    'También puedes escribirme directamente cualquier consulta sobre impuestos, plazos, IVA, retenciones o tu negocio.',
    '',
    tenantId
      ? '✅ Tu cuenta de Isaak está vinculada.'
      : `🔗 Vincula tu cuenta en <b>isaak.verifactu.business</b> → Ajustes → Telegram para acceder a tus datos.`,
  ].join('\n');
  await sendTelegramText(tgChatId, reply);
  await saveOutbound(chatDbId, tenantId, reply);
}

async function handleUnlink(
  tgChatId: number,
  chatDbId: string,
  tenantId: string | null
): Promise<void> {
  if (!tenantId) {
    const reply = 'No hay ninguna cuenta vinculada a este chat.';
    await sendTelegramText(tgChatId, reply);
    await saveOutbound(chatDbId, null, reply);
    return;
  }
  await prisma.telegramChat.updateMany({
    where: { chatId: BigInt(tgChatId) },
    data: { tenantId: null },
  });
  const reply =
    '✅ Cuenta desvinculada. Ya no tengo acceso a tus datos de Isaak desde este chat. Puedes volver a vincularla cuando quieras con /start <enlace>.';
  await sendTelegramText(tgChatId, reply);
  await saveOutbound(chatDbId, null, reply);
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

async function runIsaakPipeline(input: {
  tgChatId: number;
  chatDbId: string;
  tenantId: string | null;
  text: string;
  firstName: string | null;
}): Promise<void> {
  const { tgChatId, chatDbId, tenantId, text, firstName } = input;

  let systemPrompt: string;

  if (tenantId) {
    const primaryUserId = await getPrimaryUserId(tenantId);
    try {
      const context = await loadIsaakBusinessContext(
        { tenantId, userId: primaryUserId ?? 'telegram-webhook' },
        { includeSnapshot: true }
      );
      systemPrompt = buildEnrichedPrompt(context, firstName);
    } catch {
      systemPrompt = buildGeneralPrompt(firstName);
    }
  } else {
    systemPrompt = buildGeneralPrompt(firstName);
  }

  const [model, history] = await Promise.all([
    resolveModel(tenantId),
    loadTelegramHistory(chatDbId, text),
  ]);

  const llmResult = await callLLM({
    provider: 'anthropic',
    model,
    instructions: systemPrompt,
    messages: history,
    temperature: 0.3,
    maxOutputTokens: 700,
    enableFallback: true,
  }).catch(() => null);

  const rawText = llmResult?.text?.trim() ?? null;
  const replyText = rawText
    ? truncateForTelegram(markdownToTgHtml(rawText))
    : 'Soy Isaak, tu asesor fiscal. ¿En qué puedo ayudarte hoy?';

  // Extraer preguntas de seguimiento si las hay (formato → SIGUIENTES: A|B|C)
  const { cleanText, siguientes } = extractSiguientes(replyText);

  const followupKeyboard: TgInlineKeyboard | undefined =
    siguientes.length > 0
      ? [siguientes.map((q, i) => ({ text: q.slice(0, 40), callback_data: `followup_${i}` }))]
      : undefined;

  await sendTelegramText(tgChatId, cleanText, followupKeyboard);
  await saveOutbound(chatDbId, tenantId, cleanText);
}

// ── System prompts ────────────────────────────────────────────────────────────

function buildGeneralPrompt(firstName: string | null): string {
  const name = firstName ?? 'amigo';
  return [
    `Eres Isaak, asesor fiscal gratuito de Verifactu Business. Respondes por Telegram a ${name}.`,
    'Asesoras sobre fiscalidad española, modelos tributarios, plazos y obligaciones.',
    'NO tienes acceso a datos contables del usuario. Si preguntan por sus cifras reales, explica el concepto y propón que vinculen su cuenta.',
    'Responde en español. Sé conciso (máximo 4 párrafos). Usa <b>negrita</b> para énfasis y listas con •.',
    '',
    buildFiscalKnowledgeBlock(),
    '',
    buildGeneralAdvisorInstructions(),
    '',
    'Si la respuesta incluye preguntas de seguimiento opcionales, añade al final:',
    '→ SIGUIENTES: Pregunta A|Pregunta B|Pregunta C',
    'Máximo 3 opciones, cada una máximo 40 caracteres.',
  ].join('\n');
}

function buildEnrichedPrompt(
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>,
  firstName: string | null
): string {
  const company = context.labels.companyName || 'tu empresa';
  const name = firstName || context.labels.firstName || 'la persona';
  const snapshot = context.holded.snapshot;

  const lines = [
    `Eres Isaak, asesor fiscal y contable digital de ${company}. Respondes por Telegram a ${name}.`,
    'Actúa como asesor fiscal experto en España: da respuestas concretas con los datos reales y orienta hacia la acción correcta.',
    'Responde en español. Sé conciso (máximo 4 párrafos). Usa <b>negrita</b> para énfasis y listas con •.',
    '',
    buildFiscalKnowledgeBlock(),
    '',
    'Si la respuesta incluye preguntas de seguimiento opcionales, añade al final:',
    '→ SIGUIENTES: Pregunta A|Pregunta B|Pregunta C',
    'Máximo 3 opciones, cada una máximo 40 caracteres.',
  ];

  if (snapshot) {
    lines.push('', `Datos de Holded para ${company}:`);
    lines.push(`• Facturas emitidas: ${snapshot.invoices.length}`);
    lines.push(`• Contactos: ${snapshot.contacts.length}`);
    if (context.holded.analytics?.monthSales) {
      lines.push(`• Ventas este mes: ${context.holded.analytics.monthSales.toFixed(0)} €`);
    }
  }
  return lines.join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSiguientes(text: string): { cleanText: string; siguientes: string[] } {
  const lines = text.split('\n');
  const siguientes: string[] = [];
  const cleanLines: string[] = [];

  for (const line of lines) {
    const m = line.match(/^[→>]\s*SIGUIENTES:\s*(.+)/);
    if (m) {
      siguientes.push(
        ...m[1]
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3)
      );
    } else {
      cleanLines.push(line);
    }
  }
  return { cleanText: cleanLines.join('\n').trim(), siguientes };
}

async function getPrimaryUserId(tenantId: string): Promise<string | null> {
  const m = await prisma.membership.findFirst({
    where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });
  return m?.userId ?? null;
}

async function resolveModel(tenantId: string | null): Promise<string> {
  if (!tenantId) return 'claude-haiku-4-5-20251001';
  try {
    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      select: { plan: { select: { code: true } }, status: true },
      orderBy: { createdAt: 'desc' },
    });
    const code = sub?.status === 'trial' ? 'pro' : (sub?.plan?.code ?? 'free');
    if (['pro', 'business', 'enterprise'].includes(code)) return 'claude-sonnet-4-6';
  } catch {
    // fallback
  }
  return 'claude-haiku-4-5-20251001';
}

async function saveOutbound(
  chatDbId: string,
  tenantId: string | null,
  body: string
): Promise<void> {
  await saveTelegramMessage({
    chatDbId,
    tenantId,
    direction: 'outbound',
    eventType: 'text',
    body,
  });
}
