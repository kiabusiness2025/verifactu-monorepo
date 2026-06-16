/**
 * WhatsApp webhook para Isaak — W1 + WA-I (botones) + WA-II (listas) + WA-IV (flows)
 *
 * GET  — verificación de token con Meta
 * POST — mensajes entrantes → lógica interactiva → LLM → respuesta
 */

import { timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { callLLM } from '@verifactu/utils';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { prisma } from '@/app/lib/prisma';
import {
  findTenantIdByPhone,
  normalizePhone,
  saveWhatsAppEvent,
  sendWhatsAppButtons,
  sendWhatsAppCtaUrl,
  sendWhatsAppFlow,
  sendWhatsAppList,
  sendWhatsAppText,
  stripMarkdown,
  truncateForWhatsApp,
  upsertWhatsAppThread,
  verifyWebhookSignature,
  type WaWebhookBody,
} from '@/app/lib/whatsapp';
import { buildIsaakQueryFromFlow, type WaFlowResponseData } from '@/app/lib/whatsapp-flows';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';
import {
  buildFiscalKnowledgeBlock,
  buildGeneralAdvisorInstructions,
  ISAAK_URLS,
  WA_RESPONSE_FORMAT_INSTRUCTIONS,
} from '@/app/lib/fiscal-knowledge';
import { franc } from 'franc-min';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Detección de idioma ───────────────────────────────────────────────────────

const FRANC_TO_BCP47: Record<string, string> = {
  spa: 'es',
  eng: 'en',
  cat: 'ca',
  fra: 'fr',
  por: 'pt',
  deu: 'de',
  ita: 'it',
  nld: 'nl',
};

async function detectAndSaveLanguage(threadId: string, text: string): Promise<void> {
  if (text.length < 20) return; // too short to be reliable
  const iso3 = franc(text, { minLength: 10 });
  if (!iso3 || iso3 === 'und') return;
  const lang = FRANC_TO_BCP47[iso3];
  if (!lang) return;
  await prisma.whatsAppThread.update({
    where: { id: threadId },
    data: { language: lang },
  });
}

// ── Mapeo de IDs interactivos → queries Isaak ────────────────────────────────

const INTERACTIVE_QUERIES: Record<string, string> = {
  // Menú para usuarios con suscripción activa (datos Holded)
  menu_resumen: 'Dame el resumen de ventas y gastos de este mes.',
  menu_facturas: '¿Qué facturas tengo pendientes de cobro?',
  menu_iva: 'Estima mi IVA del trimestre actual con los datos disponibles.',
  // Menú general (todos los usuarios)
  menu_fiscal: 'Tengo una consulta sobre fiscalidad o impuestos en España.',
  menu_plazos: '¿Cuáles son los próximos plazos tributarios del calendario fiscal español?',
  menu_tipo: '¿En qué se diferencia tributar como autónomo frente a tener una sociedad?',
  // Aclaración de período
  period_month: 'Necesito los datos de este mes.',
  period_quarter: 'Necesito los datos del trimestre actual.',
  period_year: 'Necesito los datos del año completo.',
  confirm_yes: 'Sí, confirmar la operación.',
  confirm_no: 'Cancelar. No hacer nada.',
};

// ── Detección de saludo ──────────────────────────────────────────────────────

const GREETING_RE =
  /^\s*(hola|buenos días|buenas|hey|hi|hello|ey|good morning|buenos dias|buenas tardes|buenas noches|¡hola|saludos)\s*[!?.,]*\s*$/i;

function isGreeting(text: string): boolean {
  return GREETING_RE.test(text.trim()) || text.trim().length <= 2;
}

// Consultas de una sola palabra/tema que necesitan clarificación de período
const PERIOD_AMBIGUOUS_RE =
  /^\s*(ventas?|gastos?|facturas?|ingresos?|resultado|beneficio|margen|cobros?|pagos?)\s*[?!.]?\s*$/i;

function needsPeriodClarification(text: string): boolean {
  return PERIOD_AMBIGUOUS_RE.test(text.trim());
}

// ── Detección de intent: suscripción ─────────────────────────────────────────

const SUBSCRIPTION_INTENT_RE =
  /\b(suscripci[oó]n|suscrib|contratar?|precio|precios|planes?|tarifa|premium|pago|pagar|cuanto cuesta|quanto vale|cuesta isaak|precio isaak)\b/i;

function isSubscriptionIntent(text: string): boolean {
  return SUBSCRIPTION_INTENT_RE.test(text);
}

async function sendSubscriptionGuide(to: string): Promise<void> {
  const msg =
    `*Planes Isaak* 🚀\n\n` +
    `• *Gratuito* — asesor fiscal IA sin conexión a datos\n` +
    `• *Pro* — conecta Holded, alertas de plazos, IVA estimado\n` +
    `• *Business* — todo Pro + cashflow, exportaciones y soporte prioritario\n\n` +
    `Empieza gratis, sin tarjeta de crédito.`;
  await sendWhatsAppCtaUrl(to, msg, 'Ver planes y precios', ISAAK_URLS.pricing);
}

// ── Detección de intent: conectores ──────────────────────────────────────────

const CONNECTOR_INTENT_RE =
  /\b(holded|conectar?|conector|integraci[oó]n|claude desktop|chatgpt|gpt|mcp|conectores?)\b/i;

function isConnectorIntent(text: string): boolean {
  return CONNECTOR_INTENT_RE.test(text);
}

async function sendConnectorGuide(to: string): Promise<void> {
  await sendWhatsAppList(
    to,
    'Conecta Holded con tu IA favorita y accede a tus datos directamente desde el chat:',
    'Ver conectores',
    [
      {
        title: 'Conectores disponibles',
        rows: [
          {
            id: 'guide_connector_claude',
            title: 'Conector Claude Desktop',
            description: 'Usa Claude Desktop con tus datos de Holded via MCP',
          },
          {
            id: 'guide_connector_chatgpt',
            title: 'Conector ChatGPT',
            description: 'Usa ChatGPT con tus datos de Holded via plugin',
          },
          {
            id: 'guide_isaak',
            title: 'Isaak (app completa)',
            description: 'Alertas, IVA estimado, cashflow y más',
          },
        ],
      },
    ]
  );
}

// ── GET — verificación del webhook ───────────────────────────────────────────

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '';
  const tokenSafe =
    token !== null &&
    token.length === expected.length &&
    expected.length > 0 &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (mode === 'subscribe' && tokenSafe) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// ── POST — mensajes entrantes ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[whatsapp/webhook] firma inválida — ignorando');
    return new Response('Invalid signature', { status: 401 });
  }

  void processWebhookAsync(rawBody);
  return new Response('OK', { status: 200 });
}

// ── Procesamiento asíncrono ──────────────────────────────────────────────────

async function processWebhookAsync(rawBody: string): Promise<void> {
  let payload: WaWebhookBody;
  try {
    payload = JSON.parse(rawBody) as WaWebhookBody;
  } catch {
    return;
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const senderName = change.value.contacts?.[0]?.profile?.name ?? null;

      for (const msg of change.value.messages ?? []) {
        if (msg.type === 'text' && msg.text?.body) {
          await handleIncomingText({
            from: msg.from,
            messageId: msg.id,
            text: msg.text.body,
            senderName,
          }).catch((err) => console.error('[whatsapp/webhook] error en texto', err));
        } else if (
          (msg.type === 'image' ||
            msg.type === 'document' ||
            msg.type === 'audio' ||
            msg.type === 'video' ||
            msg.type === 'sticker') &&
          (msg.image ?? msg.document ?? msg.audio ?? msg.video ?? msg.sticker)
        ) {
          await handleIncomingMedia({
            from: msg.from,
            messageId: msg.id,
            type: msg.type as 'image' | 'document' | 'audio' | 'video' | 'sticker',
            mediaId: (msg.image?.id ??
              msg.document?.id ??
              msg.audio?.id ??
              msg.video?.id ??
              msg.sticker?.id)!,
            mimeType: (msg.image?.mime_type ??
              msg.document?.mime_type ??
              msg.audio?.mime_type ??
              msg.video?.mime_type ??
              msg.sticker?.mime_type)!,
            caption: msg.image?.caption ?? msg.document?.caption ?? msg.video?.caption,
            filename: msg.document?.filename,
            senderName,
          }).catch((err) => console.error('[whatsapp/webhook] error en media', err));
        } else if (msg.type === 'interactive' && msg.interactive) {
          if (msg.interactive.type === 'nfm_reply' && msg.interactive.nfm_reply) {
            await handleFlowReply({
              from: msg.from,
              messageId: msg.id,
              responseJson: msg.interactive.nfm_reply.response_json,
              senderName,
            }).catch((err) => console.error('[whatsapp/webhook] error en flow reply', err));
          } else {
            const replyId =
              msg.interactive.button_reply?.id ?? msg.interactive.list_reply?.id ?? '';
            const replyTitle =
              msg.interactive.button_reply?.title ?? msg.interactive.list_reply?.title ?? '';
            if (replyId) {
              await handleInteractiveReply({
                from: msg.from,
                messageId: msg.id,
                replyId,
                replyTitle,
                senderName,
              }).catch((err) => console.error('[whatsapp/webhook] error en interactivo', err));
            }
          }
        }
      }
    }
  }
}

// ── Mensaje de texto ─────────────────────────────────────────────────────────

async function handleIncomingText(input: {
  from: string;
  messageId: string;
  text: string;
  senderName: string | null;
}): Promise<void> {
  const { from, messageId, text, senderName } = input;
  const tenantId = await findTenantIdByPhone(from);
  const threadId = await upsertWhatsAppThread(from, tenantId);

  await Promise.all([
    saveWhatsAppEvent({
      threadId,
      tenantId,
      providerMessageId: messageId,
      direction: 'inbound',
      eventType: 'text',
      body: text,
      payload: { from, senderName },
    }).catch(() => {}),
    detectAndSaveLanguage(threadId, text),
  ]);

  // Saludo → menú de bienvenida (WA-II: list) — para TODOS, con o sin cuenta
  if (isGreeting(text)) {
    const dataAccess = await hasDataAccess(tenantId);
    await sendWelcomeMenu(normalizePhone(from), senderName, dataAccess);
    await saveOutboundEvent(threadId, tenantId, '[menu_bienvenida]');
    return;
  }

  // Consulta ambigua de período → botones de aclaración (WA-I: buttons)
  if (needsPeriodClarification(text)) {
    const clarBody = `¿De qué período quieres ver los datos de ${text.trim().toLowerCase()}?`;
    await sendWhatsAppButtons(normalizePhone(from), clarBody, [
      { id: 'period_month', title: 'Este mes' },
      { id: 'period_quarter', title: 'Trimestre actual' },
      { id: 'period_year', title: 'Año completo' },
    ]);
    await saveOutboundEvent(threadId, tenantId, clarBody);
    return;
  }

  // Intent: suscripción → guía de planes sin LLM
  if (isSubscriptionIntent(text)) {
    await sendSubscriptionGuide(normalizePhone(from));
    await saveOutboundEvent(threadId, tenantId, '[guide_subscription]');
    return;
  }

  // Intent: conectores → guía de conectores sin LLM
  if (isConnectorIntent(text)) {
    await sendConnectorGuide(normalizePhone(from));
    await saveOutboundEvent(threadId, tenantId, '[guide_connector]');
    return;
  }

  await runIsaakPipeline({ from, threadId, tenantId, text, senderName });
}

// ── Respuesta de flow (nfm_reply) ────────────────────────────────────────────

async function handleFlowReply(input: {
  from: string;
  messageId: string;
  responseJson: string;
  senderName: string | null;
}): Promise<void> {
  const { from, messageId, responseJson, senderName } = input;
  const tenantId = await findTenantIdByPhone(from);
  const threadId = await upsertWhatsAppThread(from, tenantId);

  await saveWhatsAppEvent({
    threadId,
    tenantId,
    providerMessageId: messageId,
    direction: 'inbound',
    eventType: 'flow_reply',
    body: responseJson,
    payload: { senderName },
  }).catch(() => {});

  let data: WaFlowResponseData = {};
  try {
    data = JSON.parse(responseJson) as WaFlowResponseData;
  } catch {
    // respuesta malformada → ignorar
    return;
  }

  const query = buildIsaakQueryFromFlow(data);
  if (!query) {
    const msg = '¿Cuál es tu consulta? Escríbela directamente y te respondo enseguida.';
    await sendWhatsAppText(normalizePhone(from), msg);
    await saveOutboundEvent(threadId, tenantId, msg);
    return;
  }

  await runIsaakPipeline({ from, threadId, tenantId, text: query, senderName });
}

// ── Mensaje de media entrante ────────────────────────────────────────────────

const MEDIA_LABELS: Record<string, string> = {
  image: '🖼 Imagen',
  document: '📄 Documento',
  audio: '🎤 Audio',
  video: '🎬 Vídeo',
  sticker: '🎭 Sticker',
};

async function handleIncomingMedia(input: {
  from: string;
  messageId: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'sticker';
  mediaId: string;
  mimeType: string;
  caption?: string;
  filename?: string;
  senderName: string | null;
}): Promise<void> {
  const { from, messageId, type, mediaId, mimeType, caption, filename, senderName } = input;
  const tenantId = await findTenantIdByPhone(from);
  const threadId = await upsertWhatsAppThread(from, tenantId);

  const bodyLabel = `[${MEDIA_LABELS[type] ?? type}${caption ? ': ' + caption : ''}]`;

  await saveWhatsAppEvent({
    threadId,
    tenantId,
    providerMessageId: messageId,
    direction: 'inbound',
    eventType: type,
    body: bodyLabel,
    payload: { from, senderName, mediaId, mimeType, filename, caption },
  }).catch(() => {});

  // Check if thread is in human mode — bot doesn't respond for human-managed threads
  const thread = await prisma.whatsAppThread.findUnique({
    where: { id: threadId },
    select: { mode: true },
  });
  if (thread?.mode === 'human') return;

  // Acknowledge with a friendly message + optionally ask follow-up
  const ack =
    type === 'document'
      ? `He recibido tu documento *${filename ?? 'adjunto'}*. ¿Qué necesitas hacer con él?`
      : type === 'audio'
        ? 'He recibido tu mensaje de voz. Por el momento solo proceso texto — escribe tu consulta y te ayudo.'
        : type === 'sticker'
          ? '👍'
          : caption
            ? `He recibido tu ${MEDIA_LABELS[type]}. ${caption}. ¿En qué te puedo ayudar?`
            : `He recibido tu ${MEDIA_LABELS[type]}. ¿En qué te puedo ayudar?`;

  await sendWhatsAppText(normalizePhone(from), ack);
  await saveOutboundEvent(threadId, tenantId, ack);
}

// ── Respuesta interactiva (botón / lista seleccionada) ───────────────────────

async function handleInteractiveReply(input: {
  from: string;
  messageId: string;
  replyId: string;
  replyTitle: string;
  senderName: string | null;
}): Promise<void> {
  const { from, messageId, replyId, replyTitle, senderName } = input;
  const tenantId = await findTenantIdByPhone(from);
  const threadId = await upsertWhatsAppThread(from, tenantId);

  await saveWhatsAppEvent({
    threadId,
    tenantId,
    providerMessageId: messageId,
    direction: 'inbound',
    eventType: 'interactive',
    body: replyId,
    payload: { replyId, replyTitle },
  }).catch(() => {});

  // CTA directo: crear cuenta o ver planes (no pasa por LLM)
  if (replyId === 'menu_conectar') {
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      'Crea tu cuenta gratuita en Isaak y conecta Holded. Accede a IVA estimado, alertas de plazos y análisis de tu negocio.',
      'Crear cuenta gratis',
      ISAAK_URLS.register
    ).catch(() => {});
    await saveOutboundEvent(threadId, tenantId, '[cta_registro]');
    return;
  }

  if (replyId === 'menu_planes') {
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      'Consulta los planes de Isaak: desde el plan gratuito hasta Business con todas las funcionalidades.',
      'Ver planes',
      ISAAK_URLS.pricing
    ).catch(() => {});
    await saveOutboundEvent(threadId, tenantId, '[cta_planes]');
    return;
  }

  // Guía de conector Claude Desktop
  if (replyId === 'guide_connector_claude') {
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      '*Conector Claude Desktop + Holded* 🤖\n\nConecta Claude Desktop con tu cuenta de Holded mediante MCP (Model Context Protocol). Accede a facturas, clientes, gastos y más directamente desde el chat de Claude.',
      'Instalar conector Claude',
      ISAAK_URLS.connectorClaude
    ).catch(() => {});
    await saveOutboundEvent(threadId, tenantId, '[cta_connector_claude]');
    return;
  }

  // Guía de conector ChatGPT
  if (replyId === 'guide_connector_chatgpt') {
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      '*Conector ChatGPT + Holded* 🤖\n\nConecta ChatGPT con tu cuenta de Holded. Consulta tus datos financieros, facturas y clientes directamente desde ChatGPT.',
      'Instalar conector ChatGPT',
      ISAAK_URLS.connectorChatGPT
    ).catch(() => {});
    await saveOutboundEvent(threadId, tenantId, '[cta_connector_chatgpt]');
    return;
  }

  // Guía Isaak app
  if (replyId === 'guide_isaak') {
    await sendSubscriptionGuide(normalizePhone(from));
    await saveOutboundEvent(threadId, tenantId, '[cta_isaak_from_guide]');
    return;
  }

  // "Consulta guiada" → abrir Flow (WA-IV) o degradar a texto libre si no está configurado
  if (replyId === 'menu_flow') {
    const flowId = process.env.WHATSAPP_FLOW_ID_CONSULTA;
    if (flowId && tenantId) {
      await sendWhatsAppFlow(
        normalizePhone(from),
        '¿Sobre qué quieres consultar? Rellena el formulario:',
        'Abrir formulario',
        flowId,
        'CONSULTA'
      );
      await saveOutboundEvent(threadId, tenantId, '[flow_consulta]');
    } else {
      const msg = '¿Cuál es tu consulta? Escríbela directamente y te respondo enseguida.';
      await sendWhatsAppText(normalizePhone(from), msg);
      await saveOutboundEvent(threadId, tenantId, msg);
    }
    return;
  }

  const mappedQuery = INTERACTIVE_QUERIES[replyId];
  if (!mappedQuery) {
    // ID desconocido → tratar el título como texto libre
    await runIsaakPipeline({ from, threadId, tenantId, text: replyTitle, senderName });
    return;
  }

  await runIsaakPipeline({ from, threadId, tenantId, text: mappedQuery, senderName });
}

// ── Pipeline — modo general (gratuito) o enriquecido (suscripción activa) ────

async function runIsaakPipeline(input: {
  from: string;
  threadId: string;
  tenantId: string | null;
  text: string;
  senderName: string | null;
}): Promise<void> {
  const { from, threadId, tenantId, text, senderName } = input;

  // REV-2: modo según suscripción activa
  const dataAccess = await hasDataAccess(tenantId);
  let systemPrompt: string;

  if (dataAccess && tenantId) {
    // REV-5: cuota solo en modo enriquecido
    const { allowed } = await checkWhatsAppQuota(tenantId);
    if (!allowed) {
      const limitMsg = `Has alcanzado el límite diario de mensajes de tu plan. Actualiza tu plan en ${ISAAK_PUBLIC_URL}/pricing para continuar.`;
      await sendWhatsAppText(normalizePhone(from), limitMsg);
      await saveOutboundEvent(threadId, tenantId, limitMsg);
      return;
    }
    const primaryUserId = await getPrimaryUserId(tenantId);
    try {
      const context = await loadIsaakBusinessContext(
        { tenantId, userId: primaryUserId ?? 'whatsapp-webhook' },
        { includeSnapshot: true }
      );
      systemPrompt = buildEnrichedAdvisorPrompt(context, senderName);
    } catch {
      systemPrompt = buildGeneralAdvisorPrompt(senderName);
    }
  } else {
    // REV-1: modo general gratuito para todos
    systemPrompt = buildGeneralAdvisorPrompt(senderName);
  }

  const [model, history] = await Promise.all([
    resolveModelForTenant(tenantId),
    loadConversationHistory(threadId, text),
  ]);

  const llmResult = await callLLM({
    provider: 'anthropic',
    model,
    instructions: systemPrompt,
    messages: history,
    temperature: 0.3,
    maxOutputTokens: 600,
    enableFallback: true,
  }).catch(() => null);

  const rawText = llmResult?.text?.trim() ?? null;

  // Aclaración inteligente
  const clarify = rawText ? parseClarifyResponse(rawText) : null;
  if (clarify) {
    const buttons = clarify.options.map((opt, i) => ({
      id: `clarify_${i}`,
      title: opt.slice(0, 20),
    }));
    await sendWhatsAppButtons(normalizePhone(from), clarify.question, buttons);
    await saveOutboundEvent(threadId, tenantId, clarify.question);
    return;
  }

  // Parsear respuesta estructurada
  const fallbackText = 'Soy Isaak, tu asesor fiscal gratuito. ¿En qué puedo ayudarte hoy?';
  const structured = rawText ? parseStructuredResponse(rawText) : { answerText: fallbackText };
  const replyText = structured.answerText
    ? stripMarkdown(truncateForWhatsApp(structured.answerText))
    : fallbackText;

  await sendWhatsAppText(normalizePhone(from), replyText);
  await saveOutboundEvent(threadId, tenantId, replyText);

  // Fuente oficial → CTA button
  if (structured.fuente) {
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      `📎 Fuente oficial: ${structured.fuente.title}`,
      'Abrir',
      structured.fuente.url
    ).catch(() => {});
  }

  // REV-3: upsell del LLM o programático (solo usuarios sin cuenta)
  if (structured.upsell) {
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      '🎯 Accede a más funcionalidades con Isaak',
      structured.upsell.buttonText.slice(0, 20),
      structured.upsell.url
    ).catch(() => {});
  } else if (!dataAccess) {
    const upsell = await resolveProgrammaticUpsell(threadId);
    if (upsell) {
      await sendWhatsAppCtaUrl(
        normalizePhone(from),
        upsell.body,
        upsell.buttonText,
        upsell.url
      ).catch(() => {});
    }
  }

  // Preguntas de seguimiento → botones rápidos
  if (structured.siguientes && structured.siguientes.length > 0) {
    const buttons = structured.siguientes.map((q, i) => ({
      id: `followup_${i}`,
      title: q.slice(0, 20),
    }));
    await sendWhatsAppButtons(normalizePhone(from), '¿Quieres saber más?', buttons).catch(() => {});
  }
}

// ── Menú de bienvenida (WA-II) — REV-4 ───────────────────────────────────────

async function sendWelcomeMenu(
  to: string,
  senderName: string | null,
  dataAccess: boolean
): Promise<void> {
  const firstName = senderName?.split(' ')[0] ?? null;
  const greeting = firstName ? `Hola ${firstName}!` : '¡Hola!';

  if (dataAccess) {
    // Usuarios con suscripción activa → menú con datos reales + asesoría
    await sendWhatsAppList(
      to,
      `${greeting} Soy Isaak, tu asesor fiscal. ¿En qué te ayudo hoy?`,
      'Ver opciones',
      [
        {
          rows: [
            {
              id: 'menu_resumen',
              title: 'Mi resumen del mes',
              description: 'Ventas y gastos actuales',
            },
            {
              id: 'menu_facturas',
              title: 'Mis facturas',
              description: 'Facturas pendientes de cobro',
            },
            { id: 'menu_iva', title: 'Mi IVA trimestral', description: 'Estimación modelo 303' },
            {
              id: 'menu_fiscal',
              title: 'Consulta fiscal',
              description: 'Impuestos y obligaciones',
            },
          ],
        },
      ]
    );
  } else {
    // Usuarios sin cuenta → menú de asesoría gratuita + conversión
    await sendWhatsAppList(
      to,
      `${greeting} Soy Isaak, tu asesor fiscal gratuito de Verifactu Business. Puedo ayudarte con impuestos, plazos y obligaciones fiscales.`,
      'Ver opciones',
      [
        {
          rows: [
            {
              id: 'menu_fiscal',
              title: 'Consulta fiscal',
              description: 'Impuestos y obligaciones',
            },
            {
              id: 'menu_plazos',
              title: 'Plazos tributarios',
              description: 'Calendario fiscal 2025',
            },
            {
              id: 'menu_tipo',
              title: 'Autónomo o empresa',
              description: 'Diferencias y regímenes',
            },
            {
              id: 'menu_conectar',
              title: 'Conectar Holded',
              description: 'Vincula tus datos contables',
            },
          ],
        },
      ]
    );
  }
}

// ── Clarificación inteligente ─────────────────────────────────────────────────

type ClarifyResponse = { clarify: true; question: string; options: string[] };

/**
 * Si el LLM devuelve un JSON de aclaración, lo parsea y devuelve la estructura.
 * El LLM puede envolver el JSON en ```json ``` — se limpia automáticamente.
 */
function parseClarifyResponse(text: string): ClarifyResponse | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\n?([\s\S]*?)\n?```$/, '$1')
    .trim();
  if (!stripped.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(stripped) as Record<string, unknown>;
    if (
      parsed.clarify === true &&
      typeof parsed.question === 'string' &&
      Array.isArray(parsed.options) &&
      parsed.options.length > 0
    ) {
      const opts = (parsed.options as unknown[])
        .filter((o): o is string => typeof o === 'string')
        .slice(0, 3);
      return { clarify: true, question: parsed.question, options: opts };
    }
  } catch {
    // no es JSON válido
  }
  return null;
}

// ── Respuesta estructurada (fuente oficial + seguimiento) ─────────────────────

type StructuredResponse = {
  answerText: string;
  fuente?: { url: string; title: string };
  upsell?: { url: string; buttonText: string };
  siguientes?: string[];
};

/**
 * Extrae → FUENTE, → UPSELL y → SIGUIENTES del texto del LLM.
 * Devuelve el texto limpio + los elementos interactivos opcionales.
 */
function parseStructuredResponse(raw: string): StructuredResponse {
  const lines = raw.split('\n');
  let fuente: StructuredResponse['fuente'];
  let upsell: StructuredResponse['upsell'];
  let siguientes: string[] | undefined;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const fuenteMatch = line.match(/^[→>]\s*FUENTE:\s*(.+)/);
    const upsellMatch = line.match(/^[→>]\s*UPSELL:\s*(.+)/);
    const siguientesMatch = line.match(/^[→>]\s*SIGUIENTES:\s*(.+)/);

    if (fuenteMatch) {
      const parts = fuenteMatch[1].split('|').map((p) => p.trim());
      fuente = { url: parts[0], title: parts[1] ?? 'Ver fuente oficial' };
    } else if (upsellMatch) {
      const parts = upsellMatch[1].split('|').map((p) => p.trim());
      upsell = { url: parts[0], buttonText: parts[1] ?? 'Saber más' };
    } else if (siguientesMatch) {
      siguientes = siguientesMatch[1]
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 3);
    } else {
      bodyLines.push(line);
    }
  }

  return { answerText: bodyLines.join('\n').trim(), fuente, upsell, siguientes };
}

// ── Historial de conversación ─────────────────────────────────────────────────

/**
 * Carga los últimos N turnos del thread y devuelve un array de AIMessage.
 * El último elemento siempre es el mensaje actual del usuario con el texto
 * canónico (puede diferir del body raw guardado en BD para replies interactivos).
 */
async function loadConversationHistory(
  threadId: string,
  currentText: string,
  maxTurns = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const rows = await prisma.whatsAppEvent.findMany({
    where: {
      threadId,
      direction: { in: ['inbound', 'outbound'] },
      body: { not: null },
    },
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

  // Sustituir/añadir el turno actual con el texto canónico
  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content = currentText;
  } else {
    messages.push({ role: 'user', content: currentText });
  }

  return messages;
}

// ── Helpers internos ─────────────────────────────────────────────────────────

/** REV-2: Modo A — asesor general gratuito sin datos Holded */
function buildGeneralAdvisorPrompt(senderName: string | null): string {
  const name = senderName?.split(' ')[0] ?? 'amigo';
  return [
    `Eres Isaak, asesor fiscal gratuito de Verifactu Business.`,
    `Estás respondiendo por WhatsApp a ${name}.`,
    'Asesoras gratuitamente sobre fiscalidad española, modelos tributarios, plazos y obligaciones.',
    'NO tienes acceso a datos contables del usuario. Si preguntan por sus cifras reales (su IVA, sus facturas, sus ventas), explica el concepto y propón el upsell para que puedan obtenerlo.',
    'Responde en español. Sé conciso (máximo 4 párrafos cortos). No uses markdown avanzado — usa *negrita* para énfasis y • para listas.',
    'Tienes acceso al historial de esta conversación. Úsalo para dar respuestas coherentes.',
    '',
    buildFiscalKnowledgeBlock(),
    '',
    buildGeneralAdvisorInstructions(),
    '',
    'ACLARACIÓN: Si la pregunta es genuinamente ambigua, responde ÚNICAMENTE con este JSON — sin texto adicional:',
    '{"clarify":true,"question":"Texto claro de la pregunta","options":["Opción A","Opción B","Opción C"]}',
    'Máximo 3 opciones, cada una máximo 20 caracteres. Prefiere SIEMPRE respuesta directa.',
    '',
    WA_RESPONSE_FORMAT_INSTRUCTIONS,
  ].join('\n');
}

/** REV-2: Modo B — asesor enriquecido con datos reales de Holded */
function buildEnrichedAdvisorPrompt(
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>,
  senderName: string | null
): string {
  const company = context.labels.companyName || 'tu empresa';
  const name = senderName?.split(' ')[0] || context.labels.firstName || 'la persona';
  const snapshot = context.holded.snapshot;

  const lines = [
    `Eres Isaak, asesor fiscal y contable digital de ${company}.`,
    `Estás respondiendo por WhatsApp a ${name}.`,
    'Actúa como un asesor fiscal experto en España: da respuestas concretas con los datos reales del usuario y orienta hacia la acción correcta.',
    'Responde en español. Sé conciso (máximo 4 párrafos cortos). No uses markdown avanzado — usa *negrita* para énfasis y • para listas.',
    'Tienes acceso al historial completo de esta conversación. Úsalo para dar respuestas coherentes.',
    'Si el usuario hace referencia a algo mencionado antes, búscalo en el historial antes de pedir aclaraciones.',
    '',
    buildFiscalKnowledgeBlock(),
    '',
    'ACLARACIÓN: Si la pregunta es genuinamente ambigua (período, tipo de dato, cuenta específica), responde ÚNICAMENTE con este JSON — sin texto adicional:',
    '{"clarify":true,"question":"Texto claro de la pregunta","options":["Opción A","Opción B","Opción C"]}',
    'Máximo 3 opciones, cada una máximo 20 caracteres. Prefiere SIEMPRE respuesta directa.',
    '',
    WA_RESPONSE_FORMAT_INSTRUCTIONS,
  ];

  if (snapshot) {
    lines.push('');
    lines.push(`Datos actuales de Holded para ${company}:`);
    lines.push(`- Facturas emitidas: ${snapshot.invoices.length}`);
    lines.push(`- Contactos: ${snapshot.contacts.length}`);
    lines.push(`- Cuentas contables: ${snapshot.accounts.length}`);
    if (context.holded.analytics?.monthSales) {
      lines.push(`- Ventas este mes: ${context.holded.analytics.monthSales.toFixed(0)} €`);
    }
  }

  if (context.company.taxId) {
    const isAutonomo = /^\d{8}[A-Za-z]$/.test(context.company.taxId);
    lines.push(
      `- Régimen fiscal: ${isAutonomo ? 'Persona física / autónomo' : 'Sociedad mercantil'}`
    );
  }

  return lines.join('\n');
}

/** REV-1: ¿El tenant tiene suscripción activa para acceder a datos Holded? */
async function hasDataAccess(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId, status: { in: ['trial', 'active'] } },
      select: { id: true },
    });
    return !!sub;
  } catch {
    return false;
  }
}

/** REV-3: Upsell programático para usuarios sin cuenta — al 3.er mensaje y cada 5 después */
async function resolveProgrammaticUpsell(
  threadId: string
): Promise<{ body: string; buttonText: string; url: string } | null> {
  try {
    const count = await prisma.whatsAppEvent.count({
      where: { threadId, direction: 'inbound' },
    });
    if (count !== 3 && (count < 3 || (count - 3) % 5 !== 0)) return null;
    return {
      body: '🎯 ¿Sabías que Isaak puede calcular tu IVA, analizar tus facturas y avisarte de los plazos fiscales automáticamente, conectado con Holded?',
      buttonText: 'Crear cuenta gratis',
      url: ISAAK_URLS.register,
    };
  } catch {
    return null;
  }
}

async function getPrimaryUserId(tenantId: string): Promise<string | null> {
  const m = await prisma.membership.findFirst({
    where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });
  return m?.userId ?? null;
}

async function checkWhatsAppQuota(tenantId: string): Promise<{ allowed: boolean }> {
  try {
    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      select: { plan: { select: { code: true } }, status: true },
      orderBy: { createdAt: 'desc' },
    });
    const planCode = sub?.plan?.code ?? 'free';
    if (['starter', 'pro', 'business', 'enterprise'].includes(planCode)) return { allowed: true };
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const count = await prisma.whatsAppEvent.count({
      where: { tenantId, direction: 'inbound', occurredAt: { gte: since } },
    });
    return { allowed: count < 10 };
  } catch {
    return { allowed: true };
  }
}

async function resolveModelForTenant(tenantId: string | null): Promise<string> {
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

async function saveOutboundEvent(
  threadId: string,
  tenantId: string | null,
  body: string
): Promise<void> {
  await saveWhatsAppEvent({
    threadId,
    tenantId,
    providerMessageId: `out-${Date.now()}`,
    direction: 'outbound',
    eventType: 'text',
    body,
  }).catch(() => {});
}
