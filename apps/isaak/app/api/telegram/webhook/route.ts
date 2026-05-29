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
 *   followup_0..2   — seguimiento de la respuesta anterior (opciones SIGUIENTES)
 */

import { callLLM } from '@verifactu/utils';
import type { AIProvider, AIUsage } from '@verifactu/utils';
import { NextRequest } from 'next/server';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import {
  formatWorkspaceSignalsForPrompt,
  loadIsaakWorkspaceSignals,
} from '@/app/lib/isaak-workspace-signals';
import { prisma } from '@/app/lib/prisma';
import { checkIsaakChatQuota } from '@/app/lib/isaak-quota';
import { recordChatMetric } from '@/app/lib/isaak-chat-metrics';
import {
  buildAuthenticatedSystemPrompt,
  buildPublicSystemPrompt,
  type AuthenticatedChatContext,
} from '@/app/lib/isaak-chat-prompts';
import {
  buildReadOnlyToolsForContext,
  type IsaakToolContext,
} from '@/app/lib/isaak-tools-registry';
import { hasSectorErpConnected } from '@/app/lib/sector-tools';
import { runIsaakToolLoop } from '@/app/lib/isaak-tool-loop';
import { classifyIntent } from '@/app/lib/isaak-intent-classifier';
import { retrieveFactsForChat } from '@/app/lib/isaak-rag';
import { retrieveFewShotForChat } from '@/app/lib/isaak-few-shot';
import { getSubAgent, pickSubAgent, type SubAgentId } from '@/app/lib/isaak-sub-agents';
import {
  answerCallbackQuery,
  answerPreCheckoutQuery,
  consumeTelegramLinkToken,
  findTenantIdByChatId,
  linkChatToTenant,
  loadTelegramHistory,
  markdownToTgHtml,
  saveTelegramMessage,
  sendTelegramInvoice,
  sendTelegramText,
  truncateForTelegram,
  upsertTelegramChat,
  verifyTelegramWebhook,
  type TgInlineKeyboard,
  type TgUpdate,
} from '@/app/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Tipos locales ─────────────────────────────────────────────────────────────

type ModelConfig = { provider: AIProvider; model: string };

// ── Planes de suscripción ─────────────────────────────────────────────────────

// Telegram Stars (XTR): ~50 Stars = $0.99 → 1 Star ≈ €0.013
// Pro mensual  €29 → 2500 Stars
// Pro anual    €290 (2 meses gratis, 10×€29) → 25000 Stars
const ISAAK_PLANS = [
  {
    code: 'pro',
    label: 'Pro mensual',
    emoji: '⭐',
    amountStars: 2500,
    period: 'mensual',
    description: 'ERPs · Google/MS · Modelos AEAT · Open Banking · Todo incluido',
  },
  {
    code: 'pro_annual',
    label: 'Pro anual',
    emoji: '🎯',
    amountStars: 25000,
    period: 'anual',
    description: '12 meses · 2 meses gratis · Mejor precio (≈ 24 €/mes)',
  },
] as const;

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
  [{ text: '💳 Ver planes', callback_data: 'menu_planes' }],
];

const CALLBACK_QUERIES: Record<string, string> = {
  menu_resumen: 'Dame el resumen de ventas y gastos de este mes.',
  menu_facturas: '¿Qué facturas tengo pendientes de cobro?',
  menu_iva: 'Estima mi IVA del trimestre actual con los datos disponibles.',
  menu_fiscal: 'Tengo una consulta sobre fiscalidad o impuestos en España.',
  menu_plazos: '¿Cuáles son los próximos plazos tributarios del calendario fiscal español?',
  menu_tipo: '¿En qué se diferencia tributar como autónomo frente a tener una sociedad?',
};

// Instrucción SIGUIENTES añadida al system prompt de Telegram para obtener
// botones de seguimiento inline en la respuesta del LLM.
const SIGUIENTES_INSTRUCTION = [
  '',
  'FORMATO DE RESPUESTA TELEGRAM:',
  '- Usa <b>negrita</b> para énfasis. Máximo 4 párrafos. Responde siempre en español.',
  '- Si la respuesta incluye preguntas de seguimiento opcionales, añade al final:',
  '→ SIGUIENTES: Pregunta A|Pregunta B|Pregunta C',
  '  Máximo 3 opciones, cada una máximo 40 caracteres.',
].join('\n');

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
      eventType: text.startsWith('/')
        ? 'command'
        : msg.document
          ? 'document'
          : msg.photo
            ? 'photo'
            : 'text',
      body: text || msg.caption || null,
      payload: { username: from?.username, firstName: from?.first_name },
    });

    if (msg.successful_payment) {
      await handleSuccessfulPayment(tgChatId, chatDbId, tenantId, msg.successful_payment);
    } else if (msg.document || (msg.photo && msg.photo.length > 0)) {
      // Documento o foto: usar el caption como consulta si existe
      const captionText = msg.caption?.trim() || null;
      if (captionText) {
        await runIsaakPipeline({
          tgChatId,
          chatDbId,
          tenantId,
          text: captionText,
          firstName: from?.first_name ?? null,
        });
      } else {
        const reply =
          '📎 He recibido tu archivo, pero aún no proceso documentos adjuntos directamente.\n\nSi tienes una pregunta sobre su contenido, escríbela en el chat.';
        await sendTelegramText(tgChatId, reply);
        await saveOutbound(chatDbId, tenantId, reply);
      }
    } else if (text.startsWith('/start')) {
      await handleStart(tgChatId, chatDbId, tenantId, text, from?.first_name ?? null);
    } else if (text === '/menu' || text === '/menu@IsaakFiscalBot') {
      await handleMenu(tgChatId, chatDbId, tenantId, from?.first_name ?? null);
    } else if (text === '/planes' || text === '/planes@IsaakFiscalBot') {
      await handlePlanes(tgChatId, chatDbId, tenantId);
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

  if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(update.pre_checkout_query);
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

    if (data === 'menu_planes') {
      await handlePlanes(tgChatId, chatDbId, tenantId);
      return;
    }

    if (data.startsWith('plan_')) {
      const planCode = data.slice(5);
      await handlePlanSelect(tgChatId, chatDbId, tenantId, planCode);
      return;
    }

    if (data === 'menu_vincular') {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://isaak.chat';
      await sendTelegramText(
        tgChatId,
        `🔗 Para vincular tu cuenta de Isaak, ve a:\n\n<b>${appUrl}/settings/telegram</b>\n\nGenerarás un enlace de vinculación que abrirás aquí en Telegram.`
      );
      await saveOutbound(chatDbId, tenantId, '[menu_vincular]');
      return;
    }

    // followup_0..2 — opciones SIGUIENTES de la respuesta anterior
    if (/^followup_[0-2]$/.test(data)) {
      const idx = parseInt(data.slice(-1));
      const lastMsg = await prisma.telegramMessage.findFirst({
        where: { chatId: chatDbId, direction: 'outbound' },
        orderBy: { occurredAt: 'desc' },
        select: { payload: true },
      });
      const siguientes = (lastMsg?.payload as Record<string, unknown> | null)?.siguientes as
        | string[]
        | undefined;
      const followupText = siguientes?.[idx];
      if (followupText) {
        await runIsaakPipeline({
          tgChatId,
          chatDbId,
          tenantId,
          text: followupText,
          firstName: cq.from.first_name ?? null,
        });
      }
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
    '/planes — Ver planes y suscribirse',
    '/ayuda — Este mensaje',
    '/desvincular — Desconectar tu cuenta de Isaak',
    '',
    'También puedes escribirme directamente cualquier consulta sobre impuestos, plazos, IVA, retenciones o tu negocio.',
    '',
    tenantId
      ? '✅ Tu cuenta de Isaak está vinculada.'
      : `🔗 Vincula tu cuenta en <b>isaak.chat</b> → Ajustes → Telegram para acceder a tus datos.`,
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

// ── Pagos Telegram ────────────────────────────────────────────────────────────

async function handlePlanes(
  tgChatId: number,
  chatDbId: string,
  tenantId: string | null
): Promise<void> {
  const lines = [
    '<b>⭐ Planes de Isaak Pro</b>',
    '',
    'Acceso completo a todas las integraciones, modelos AEAT, Open Banking, Google, Microsoft y mucho más.',
    '',
    `${ISAAK_PLANS[0].emoji} <b>Pro mensual</b> — ${ISAAK_PLANS[0].amountStars.toLocaleString()} ⭐ Stars`,
    `${ISAAK_PLANS[0].description}`,
    '',
    `${ISAAK_PLANS[1].emoji} <b>Pro anual</b> — ${ISAAK_PLANS[1].amountStars.toLocaleString()} ⭐ Stars`,
    `${ISAAK_PLANS[1].description}`,
    '',
    '<i>El pago se realiza con Telegram Stars. Puedes comprar Stars directamente en Telegram.</i>',
  ];
  const keyboard: TgInlineKeyboard = [
    [
      {
        text: `⭐ Pro mensual (${ISAAK_PLANS[0].amountStars.toLocaleString()} Stars)`,
        callback_data: `plan_${ISAAK_PLANS[0].code}`,
      },
    ],
    [
      {
        text: `🎯 Pro anual · 2 meses gratis (${ISAAK_PLANS[1].amountStars.toLocaleString()} Stars)`,
        callback_data: `plan_${ISAAK_PLANS[1].code}`,
      },
    ],
  ];
  const reply = lines.join('\n');
  await sendTelegramText(tgChatId, reply, keyboard);
  await saveOutbound(chatDbId, tenantId, '[planes]');
}

async function handlePlanSelect(
  tgChatId: number,
  chatDbId: string,
  tenantId: string | null,
  planCode: string
): Promise<void> {
  const plan = ISAAK_PLANS.find((p) => p.code === planCode);
  if (!plan) return;

  if (!tenantId) {
    await sendTelegramText(
      tgChatId,
      `⚠️ Vincula tu cuenta de Isaak antes del pago para activar el plan automáticamente.\n\nVe a <b>isaak.chat → Ajustes → Telegram</b> y genera el enlace de vinculación.`
    );
  }

  await sendTelegramInvoice(tgChatId, {
    title: `Isaak ${plan.label}`,
    description: plan.description,
    payload: `plan:${plan.code}`,
    amountStars: plan.amountStars,
  });
  await saveOutbound(chatDbId, tenantId, `[invoice:${plan.code}]`);
}

async function handlePreCheckoutQuery(
  pcq: NonNullable<TgUpdate['pre_checkout_query']>
): Promise<void> {
  // Debe responder en < 10 segundos
  try {
    const planCode = pcq.invoice_payload.replace('plan:', '');
    const plan = ISAAK_PLANS.find((p) => p.code === planCode);
    if (!plan) {
      await answerPreCheckoutQuery(
        pcq.id,
        false,
        'Plan no reconocido. Escribe /planes para ver los disponibles.'
      );
      return;
    }
    // Verificar que no tiene ya ese plan activo
    const chat = await prisma.telegramChat.findUnique({
      where: { chatId: BigInt(pcq.from.id) },
      select: { tenantId: true },
    });
    if (chat?.tenantId) {
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: chat.tenantId, status: 'active' },
        include: { plan: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (sub?.plan?.code === planCode) {
        await answerPreCheckoutQuery(
          pcq.id,
          false,
          `Ya tienes el plan ${plan.label} activo. Escribe /menu para ver tus opciones.`
        );
        return;
      }
    }
    await answerPreCheckoutQuery(pcq.id, true);
  } catch {
    await answerPreCheckoutQuery(pcq.id, true);
  }
}

async function handleSuccessfulPayment(
  tgChatId: number,
  chatDbId: string,
  tenantId: string | null,
  payment: NonNullable<import('@/app/lib/telegram').TgMessage['successful_payment']>
): Promise<void> {
  const planCode = payment.invoice_payload.replace('plan:', '');
  const plan = ISAAK_PLANS.find((p) => p.code === planCode);

  // 1. Guardar el pago en DB (cast a any hasta que prisma generate se ejecute en build)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).telegramPayment.create({
    data: {
      chatDbId,
      tenantId,
      planCode,
      amountCents: payment.total_amount,
      currency: payment.currency,
      telegramChargeId: payment.telegram_payment_charge_id,
      providerChargeId: payment.provider_payment_charge_id || null,
      orderEmail: payment.order_info?.email ?? null,
      orderName: payment.order_info?.name ?? null,
    },
  });

  // 2. Activar suscripción si el chat está vinculado a un tenant
  if (tenantId && plan) {
    try {
      const dbPlan = await prisma.plan.findFirst({ where: { code: planCode } });
      if (dbPlan) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const existing = await prisma.tenantSubscription.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) {
          await prisma.tenantSubscription.update({
            where: { id: existing.id },
            data: {
              planId: dbPlan.id,
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            },
          });
        } else {
          await prisma.tenantSubscription.create({
            data: {
              tenantId,
              planId: dbPlan.id,
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          });
        }
      }
    } catch {
      // No bloquear la confirmación por errores de DB
    }
  }

  // 3. Confirmar al usuario
  const planLabel = plan ? `${plan.emoji} <b>${plan.label}</b>` : `<b>${planCode}</b>`;
  const activated = tenantId
    ? '\n\n✅ Tu suscripción está activa en Isaak.'
    : '\n\n🔗 Vincula tu cuenta en Isaak → Ajustes → Telegram para activar el plan.';
  const reply = `✅ <b>¡Pago recibido!</b>\n\nPlan: ${planLabel}\nImporte: ${payment.total_amount.toLocaleString()} ⭐ Stars\nReferencia: <code>${payment.telegram_payment_charge_id.slice(-12)}</code>${activated}`;
  await sendTelegramText(tgChatId, reply, tenantId ? MENU_CONNECTED : MENU_GENERAL);
  await saveOutbound(chatDbId, tenantId, `[payment_ok:${planCode}]`);
}

// ── Pipeline principal ────────────────────────────────────────────────────────

async function runIsaakPipeline(input: {
  tgChatId: number;
  chatDbId: string;
  tenantId: string | null;
  text: string;
  firstName: string | null;
}): Promise<void> {
  const { tgChatId, chatDbId, tenantId, text, firstName } = input;

  // 1. Quota check (igual que web chat)
  if (tenantId) {
    const quota = await checkIsaakChatQuota(tenantId);
    if (!quota.allowed) {
      const reply = `⏳ <b>Límite diario alcanzado.</b>\n\n${quota.message}`;
      await sendTelegramText(tgChatId, reply, [
        [{ text: '💳 Ver planes Pro', callback_data: 'menu_planes' }],
      ]);
      await saveOutbound(chatDbId, tenantId, reply);
      return;
    }
  }

  // 2. Cargar contexto completo (igual que web chat)
  const primaryUserId = tenantId ? await getPrimaryUserId(tenantId) : null;
  const userId = primaryUserId ?? 'telegram-webhook';

  let toolContext: IsaakToolContext | null = null;
  let promptCtx: AuthenticatedChatContext | null = null;

  if (tenantId) {
    try {
      const businessContext = await loadIsaakBusinessContext(
        { tenantId, userId, name: firstName ?? undefined },
        { includeSnapshot: false }
      );

      const [workspaceSignals, bankAccountCount, googleToken, microsoftToken, sectorConnected] =
        await Promise.all([
          loadIsaakWorkspaceSignals({ tenantId, context: businessContext }).catch(() => null),
          prisma.seAccount.count({ where: { tenantId, status: 'active' } }).catch(() => 0),
          prisma.isaakGoogleToken
            .findFirst({ where: { tenantId, userId }, select: { id: true } })
            .catch(() => null),
          prisma.isaakMicrosoftToken
            .findFirst({ where: { tenantId, userId }, select: { id: true } })
            .catch(() => null),
          hasSectorErpConnected(tenantId).catch(() => false),
        ]);

      toolContext = {
        tenantId,
        userId,
        holdedApiKey: businessContext?.holded?.connection?.apiKey ?? null,
        holdedConnected: Boolean(businessContext?.holded.hasLiveConnection),
        bankConnected: bankAccountCount > 0,
        googleConnected: Boolean(googleToken),
        microsoftConnected: Boolean(microsoftToken),
        sectorConnected,
      };

      promptCtx = {
        tenantId,
        userId,
        preferredName:
          businessContext?.isaak.profile?.preferredName ||
          businessContext?.labels.firstName ||
          firstName ||
          'la persona usuaria',
        companyName: businessContext?.labels.companyName || 'tu negocio',
        contextSummary:
          businessContext?.summary ||
          'Todavía falta parte del contexto del negocio, así que conviene guiar con preguntas breves.',
        roleLabel: describeRole(
          businessContext?.isaak.profile?.roleInCompanyOther ||
            businessContext?.isaak.profile?.roleInCompany ||
            null
        ),
        sectorLabel:
          businessContext?.company.sectorLabel ||
          businessContext?.company.sectorCode ||
          'sin definir',
        communicationStyle:
          businessContext?.isaak.instructions?.communicationStyle ||
          businessContext?.isaak.profile?.communicationStyle ||
          'spanish_clear_non_technical',
        knowledgeLevel:
          businessContext?.isaak.instructions?.likelyKnowledgeLevel ||
          businessContext?.isaak.profile?.likelyKnowledgeLevel ||
          'starter',
        goals: businessContext?.isaak.profile?.mainGoals || [],
        holdedConnected: Boolean(businessContext?.holded.hasLiveConnection),
        workspaceSignalsBlock: workspaceSignals
          ? formatWorkspaceSignalsForPrompt(workspaceSignals)
          : 'No he podido cargar el estado ampliado del workspace en este momento.',
      };
    } catch {
      // Fall through — responderá como usuario no conectado
    }
  }

  // 3. Historial: separamos pasado (para classifier/tools) y completo (para callLLM directo)
  const historyWithCurrent = await loadTelegramHistory(chatDbId, text);
  const historyPast = historyWithCurrent.slice(0, -1); // sin el mensaje actual

  const modelConfig = await resolveModel(tenantId);

  // 4. Pipeline con classifier + RAG + few-shot + tool loop (igual que web chat)
  let result: {
    text: string;
    provider: AIProvider;
    model: string;
    latencyMs?: number;
    usage?: AIUsage;
  } | null = null;
  let toolNamesUsed: string[] = [];
  let writeToolsUsed: string[] = [];
  let judgeInvocations = 0;
  let judgeBlocks = 0;
  let judgeLatencyMs: number | null = null;
  let inspectorRuns = 0;
  let inspectorBlocks = 0;
  let inspectorWarnings = 0;
  let iterations = 0;
  let routedTo: 'clarify_direct' | 'sonnet_no_tools' | 'sonnet_with_tools' | 'fallback' =
    'fallback';
  let classifierModel: string | null = null;
  let classifierLatencyMs: number | null = null;
  let factsBlock = '';
  let fewShotBlock = '';
  let factsRetrieved = 0;
  let ragLatencyMs: number | null = null;
  let ragTopSimilarity: number | null = null;
  let fewShotInjected = 0;
  let fewShotLatencyMs: number | null = null;
  let fewShotTopSimilarity: number | null = null;
  let subAgent: SubAgentId | null = null;
  let useToolLoop = false;

  if (promptCtx && toolContext) {
    // Authenticated: pipeline completo (classifier → RAG → tool loop o LLM directo)
    const [classification, ragResult, fewShotResult] = await Promise.all([
      classifyIntent({
        message: text,
        history: historyPast,
        context: {
          holdedConnected: toolContext.holdedConnected,
          bankConnected: toolContext.bankConnected,
          googleConnected: toolContext.googleConnected,
          microsoftConnected: toolContext.microsoftConnected,
          sectorConnected: toolContext.sectorConnected,
        },
      }),
      retrieveFactsForChat({ tenantId: tenantId!, queryText: text }),
      retrieveFewShotForChat({ tenantId: tenantId!, queryText: text }),
    ]);

    factsBlock = ragResult.factsBlock;
    factsRetrieved = ragResult.factsRetrieved;
    ragLatencyMs = ragResult.latencyMs;
    ragTopSimilarity = ragResult.topSimilarity;
    fewShotBlock = fewShotResult.examplesBlock;
    fewShotInjected = fewShotResult.injected;
    fewShotLatencyMs = fewShotResult.latencyMs;
    fewShotTopSimilarity = fewShotResult.topSimilarity;
    classifierModel = classification.modelUsed;
    classifierLatencyMs = classification.latencyMs;

    if (classification.ambiguous && classification.suggestedClarification) {
      // Ambiguo → enviar pregunta de clarificación como botones inline
      const opts = classification.suggestedOptions ?? [];
      const keyboard: TgInlineKeyboard | undefined =
        opts.length > 0
          ? [
              opts
                .slice(0, 3)
                .map((o, i) => ({ text: o.slice(0, 40), callback_data: `followup_${i}` })),
            ]
          : undefined;
      const reply = `❓ ${classification.suggestedClarification}`;
      await sendTelegramText(tgChatId, reply, keyboard);
      await saveOutbound(
        chatDbId,
        tenantId,
        reply,
        opts.length > 0 ? { siguientes: opts.slice(0, 3) } : undefined
      );
      routedTo = 'clarify_direct';

      await recordChatMetric({
        tenantId,
        userId,
        conversationId: null,
        provider: 'anthropic',
        modelUsed: classifierModel,
        feature: 'telegram_chat',
        latencyMs: classifierLatencyMs,
        routedTo,
        classifierModel,
        classifierLatencyMs,
      }).catch(() => {});
      return;
    }

    if (classification.needsTools && classification.relevantCategories.length > 0) {
      const subAgentId: SubAgentId | null = pickSubAgent({
        message: text,
        classifierCategories: classification.relevantCategories,
        hasWriteIntent: false, // Telegram siempre read-only
      });

      let agentSystemPrompt: string;
      let agentToolCategories = classification.relevantCategories;
      let agentMaxOutputTokens = 1200;
      let agentTemperature: number | undefined;

      if (subAgentId) {
        const agent = getSubAgent(subAgentId);
        subAgent = subAgentId;
        const factsTail = factsBlock ? `\n\n${factsBlock.trim()}` : '';
        const fewShotTail = fewShotBlock ? `\n\n${fewShotBlock.trim()}` : '';
        agentSystemPrompt = `${agent.systemPrompt}${factsTail}${fewShotTail}${SIGUIENTES_INSTRUCTION}`;
        agentToolCategories = agent.toolCategories;
        agentMaxOutputTokens = agent.maxOutputTokens;
        agentTemperature = agent.temperature;
      } else {
        agentSystemPrompt =
          buildAuthenticatedSystemPrompt(promptCtx, { factsBlock, fewShotBlock }) +
          SIGUIENTES_INSTRUCTION;
        if (!agentToolCategories.includes('ledger')) {
          agentToolCategories = [...agentToolCategories, 'ledger'];
        }
      }

      const filteredTools = buildReadOnlyToolsForContext(toolContext, {
        only: agentToolCategories,
        allowWrites: false, // Telegram = read-only siempre
      });

      if (filteredTools.length > 0) {
        useToolLoop = true;
        const loop = await runIsaakToolLoop({
          systemPrompt: agentSystemPrompt,
          history: historyPast,
          userMessage: text,
          tools: filteredTools,
          context: toolContext,
          model: modelConfig.model,
          provider: modelConfig.provider,
          feature: subAgentId ? `telegram_subagent_${subAgentId}` : 'telegram_chat_tools',
          maxOutputTokens: agentMaxOutputTokens,
          temperature: agentTemperature,
          allowWrites: false,
        });
        result = loop.text
          ? {
              text: loop.text,
              provider: loop.provider,
              model: loop.model,
              latencyMs: loop.totalLatencyMs,
              usage: loop.totalUsage,
            }
          : null;
        toolNamesUsed = loop.toolNames;
        writeToolsUsed = loop.writeToolNames;
        judgeInvocations = loop.judgeInvocations;
        judgeBlocks = loop.judgeBlocks;
        judgeLatencyMs = loop.judgeTotalLatencyMs || null;
        inspectorRuns = loop.inspectorRuns;
        inspectorBlocks = loop.inspectorBlocks;
        inspectorWarnings = loop.inspectorWarnings;
        iterations = loop.iterations;
        routedTo = 'sonnet_with_tools';
      }
    }

    // Fallback: LLM directo sin tools (clasificador dijo no tools, o tools vacías)
    if (!result) {
      const systemPrompt =
        buildAuthenticatedSystemPrompt(promptCtx, { factsBlock, fewShotBlock }) +
        SIGUIENTES_INSTRUCTION;
      const llmResult = await callLLM({
        provider: modelConfig.provider,
        model: modelConfig.model,
        instructions: systemPrompt,
        messages: historyWithCurrent,
        temperature: 0.45,
        maxOutputTokens: 700,
        feature: 'telegram_chat',
        enableFallback: true,
      }).catch(() => null);
      if (llmResult) {
        result = llmResult;
        routedTo = 'sonnet_no_tools';
      }
    }
  } else {
    // Público (sin cuenta vinculada): asesor general
    const systemPrompt = buildPublicSystemPrompt() + SIGUIENTES_INSTRUCTION;
    const llmResult = await callLLM({
      provider: modelConfig.provider,
      model: modelConfig.model,
      instructions: systemPrompt,
      messages: historyWithCurrent,
      temperature: 0.5,
      maxOutputTokens: 700,
      feature: 'telegram_chat_public',
      enableFallback: true,
    }).catch(() => null);
    if (llmResult) {
      result = llmResult;
      routedTo = 'sonnet_no_tools';
    }
  }

  // 5. Enviar respuesta
  const rawText = result?.text?.trim() ?? null;
  const replyText = rawText
    ? truncateForTelegram(markdownToTgHtml(rawText))
    : 'Soy Isaak, tu asesor fiscal. ¿En qué puedo ayudarte hoy?';

  const { cleanText, siguientes } = extractSiguientes(replyText);
  const followupKeyboard: TgInlineKeyboard | undefined =
    siguientes.length > 0
      ? [siguientes.map((q, i) => ({ text: q.slice(0, 40), callback_data: `followup_${i}` }))]
      : undefined;

  await sendTelegramText(tgChatId, cleanText, followupKeyboard);
  await saveOutbound(
    chatDbId,
    tenantId,
    cleanText,
    siguientes.length > 0 ? { siguientes } : undefined
  );

  // 6. Métricas (igual que web chat)
  await recordChatMetric({
    tenantId: tenantId ?? null,
    userId,
    conversationId: null,
    provider: (result?.provider ?? 'fallback') as AIProvider | 'fallback',
    modelUsed: result?.model ?? 'unknown',
    feature: useToolLoop
      ? 'telegram_chat_tools'
      : tenantId
        ? 'telegram_chat'
        : 'telegram_chat_public',
    usage: result?.usage,
    latencyMs: result?.latencyMs ?? null,
    toolCalls: toolNamesUsed,
    historyTurns: historyPast.length,
    classifierModel,
    classifierLatencyMs,
    routedTo,
    judgeInvocations,
    judgeBlocks,
    judgeLatencyMs,
    writeTools: writeToolsUsed,
    factsRetrieved,
    ragLatencyMs,
    ragTopSimilarity,
    fewShotInjected,
    fewShotLatencyMs,
    fewShotTopSimilarity,
    subAgent,
    inspectorRuns,
    inspectorBlocks,
    inspectorWarnings,
  }).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function describeRole(value: string | null | undefined): string {
  if (!value) return 'no definido';
  switch (value) {
    case 'autonomo':
      return 'autónomo';
    case 'administrador':
      return 'administrador';
    case 'gerente':
      return 'gerente';
    case 'financiero':
      return 'responsable financiero';
    default:
      return value;
  }
}

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

async function resolveModel(tenantId: string | null): Promise<ModelConfig> {
  if (!tenantId) return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
  try {
    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      select: { plan: { select: { code: true } }, status: true },
      orderBy: { createdAt: 'desc' },
    });
    const code = sub?.status === 'trial' ? 'pro' : (sub?.plan?.code ?? 'free');
    if (['pro', 'business', 'enterprise'].includes(code)) {
      return { provider: 'anthropic', model: 'claude-sonnet-4-6' };
    }
  } catch {
    // fallback
  }
  return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
}

async function saveOutbound(
  chatDbId: string,
  tenantId: string | null,
  body: string,
  payload?: Record<string, unknown>
): Promise<void> {
  await saveTelegramMessage({
    chatDbId,
    tenantId,
    direction: 'outbound',
    eventType: 'text',
    body,
    payload,
  });
}
