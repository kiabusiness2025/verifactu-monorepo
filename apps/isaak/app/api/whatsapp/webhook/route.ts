/**
 * WhatsApp webhook para Isaak — W1 + WA-I (botones) + WA-II (listas) + WA-IV (flows)
 *
 * GET  — verificación de token con Meta
 * POST — mensajes entrantes → lógica interactiva → LLM → respuesta
 */

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
import {
  buildFiscalKnowledgeBlock,
  WA_RESPONSE_FORMAT_INSTRUCTIONS,
} from '@/app/lib/fiscal-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Mapeo de IDs interactivos → queries Isaak ────────────────────────────────

const INTERACTIVE_QUERIES: Record<string, string> = {
  menu_resumen: 'Dame el resumen de ventas y gastos de este mes.',
  menu_facturas: '¿Qué facturas tengo pendientes de cobro?',
  menu_iva: 'Estima mi IVA del trimestre actual con los datos disponibles.',
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

// ── GET — verificación del webhook ───────────────────────────────────────────

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
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

  await saveWhatsAppEvent({
    threadId,
    tenantId,
    providerMessageId: messageId,
    direction: 'inbound',
    eventType: 'text',
    body: text,
    payload: { from, senderName },
  }).catch(() => {});

  // Número no vinculado → CTA con botón de vinculación (WA-I: cta_url)
  if (!tenantId) {
    const firstName = senderName?.split(' ')[0] ?? null;
    const body = `Hola${firstName ? ` ${firstName}` : ''}! Soy Isaak, tu asistente fiscal de Verifactu Business.\n\nPara poder ayudarte necesito vincular este número a tu cuenta.`;
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      body,
      'Vincular ahora',
      'https://isaak.verifactu.business/settings?wl=1'
    ).catch(() =>
      sendWhatsAppText(normalizePhone(from), body + '\n\n👉 isaak.verifactu.business/settings')
    );
    await saveOutboundEvent(threadId, null, body);
    return;
  }

  // Saludo → menú de bienvenida (WA-II: list)
  if (isGreeting(text)) {
    await sendWelcomeMenu(normalizePhone(from), senderName);
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

// ── Pipeline común: quota + LLM + respuesta ──────────────────────────────────

async function runIsaakPipeline(input: {
  from: string;
  threadId: string;
  tenantId: string | null;
  text: string;
  senderName: string | null;
}): Promise<void> {
  const { from, threadId, tenantId, text, senderName } = input;

  if (!tenantId) return;

  // Cargar contexto del tenant e historial de conversación en paralelo
  const primaryUserId = await getPrimaryUserId(tenantId);
  let context;
  try {
    [context] = await Promise.all([
      loadIsaakBusinessContext(
        { tenantId, userId: primaryUserId ?? 'whatsapp-webhook' },
        { includeSnapshot: true }
      ),
    ]);
  } catch (err) {
    console.error('[whatsapp/webhook] error cargando contexto', err);
    await sendWhatsAppText(
      normalizePhone(from),
      'Lo siento, ha ocurrido un error técnico. Inténtalo de nuevo en unos minutos.'
    );
    return;
  }

  // Verificar quota
  const { allowed } = await checkWhatsAppQuota(tenantId);
  if (!allowed) {
    const limitMsg =
      'Has alcanzado el límite diario de mensajes de tu plan. Actualiza tu plan en isaak.verifactu.business/pricing para continuar.';
    await sendWhatsAppText(normalizePhone(from), limitMsg);
    await saveOutboundEvent(threadId, tenantId, limitMsg);
    return;
  }

  // LLM con historial de conversación
  const [model, history] = await Promise.all([
    resolveModelForTenant(tenantId),
    loadConversationHistory(threadId, text),
  ]);
  const llmResult = await callLLM({
    provider: 'anthropic',
    model,
    instructions: buildWhatsAppSystemPrompt(context, senderName),
    messages: history,
    temperature: 0.3,
    maxOutputTokens: 600,
    enableFallback: true,
  }).catch(() => null);

  const rawText = llmResult?.text?.trim() ?? null;

  // Si el LLM pide aclaración → enviar botones interactivos (sin fuente ni seguimiento)
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

  // Parsear respuesta estructurada (texto + fuente opcional + seguimiento opcional)
  const snapshot = context.holded.snapshot;
  const fallbackText = snapshot
    ? `Tengo acceso a tus datos de Holded (${snapshot.invoices.length} facturas, ${snapshot.contacts.length} contactos). ¿En qué puedo ayudarte?`
    : 'Soy Isaak, tu asistente fiscal. ¿En qué puedo ayudarte hoy?';

  const structured = rawText ? parseStructuredResponse(rawText) : { answerText: fallbackText };

  const replyText = structured.answerText
    ? stripMarkdown(truncateForWhatsApp(structured.answerText))
    : fallbackText;

  await sendWhatsAppText(normalizePhone(from), replyText);
  await saveOutboundEvent(threadId, tenantId, replyText);

  // Fuente oficial → CTA button (mensaje adicional)
  if (structured.fuente) {
    await sendWhatsAppCtaUrl(
      normalizePhone(from),
      `📎 Fuente oficial: ${structured.fuente.title}`,
      'Abrir',
      structured.fuente.url
    ).catch(() => {});
  }

  // Preguntas de seguimiento → botones rápidos (mensaje adicional)
  if (structured.siguientes && structured.siguientes.length > 0) {
    const buttons = structured.siguientes.map((q, i) => ({
      id: `followup_${i}`,
      title: q.slice(0, 20),
    }));
    await sendWhatsAppButtons(normalizePhone(from), '¿Quieres saber más?', buttons).catch(() => {});
  }
}

// ── Menú de bienvenida (WA-II) ───────────────────────────────────────────────

async function sendWelcomeMenu(to: string, senderName: string | null): Promise<void> {
  const firstName = senderName?.split(' ')[0] ?? null;
  const greeting = firstName ? `Hola ${firstName}!` : '¡Hola!';
  await sendWhatsAppList(
    to,
    `${greeting} Soy Isaak, tu asistente fiscal. ¿En qué te ayudo hoy?`,
    'Ver opciones',
    [
      {
        rows: [
          {
            id: 'menu_resumen',
            title: 'Resumen del mes',
            description: 'Ventas y gastos del mes actual',
          },
          { id: 'menu_facturas', title: 'Facturas pendientes', description: 'Facturas sin cobrar' },
          { id: 'menu_iva', title: 'IVA trimestral', description: 'Estimación modelo 303' },
          {
            id: 'menu_flow',
            title: 'Consulta guiada',
            description: 'Formulario de selección rápida',
          },
        ],
      },
    ]
  );
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
  siguientes?: string[];
};

/**
 * Extrae → FUENTE y → SIGUIENTES del texto del LLM.
 * Devuelve el texto limpio + los elementos interactivos opcionales.
 */
function parseStructuredResponse(raw: string): StructuredResponse {
  const lines = raw.split('\n');
  let fuente: StructuredResponse['fuente'];
  let siguientes: string[] | undefined;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const fuenteMatch = line.match(/^→\s*FUENTE:\s*(.+)/);
    const siguientesMatch = line.match(/^→\s*SIGUIENTES:\s*(.+)/);

    if (fuenteMatch) {
      const parts = fuenteMatch[1].split('|').map((p) => p.trim());
      fuente = { url: parts[0], title: parts[1] ?? 'Ver fuente oficial' };
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

  return { answerText: bodyLines.join('\n').trim(), fuente, siguientes };
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

function buildWhatsAppSystemPrompt(
  context: Awaited<ReturnType<typeof loadIsaakBusinessContext>>,
  senderName: string | null
): string {
  const company = context.labels.companyName || 'tu empresa';
  const name = senderName?.split(' ')[0] || context.labels.firstName || 'la persona';
  const snapshot = context.holded.snapshot;

  const lines = [
    `Eres Isaak, asesor fiscal y contable digital de ${company}.`,
    `Estás respondiendo por WhatsApp a ${name}.`,
    'Actúa como un asesor fiscal experto en España: da respuestas concretas, cita normativa cuando proceda y siempre orienta hacia la acción correcta.',
    'Responde en español. Sé conciso (máximo 4 párrafos cortos). No uses markdown avanzado — usa *negrita* para énfasis y • para listas.',
    'Tienes acceso al historial completo de esta conversación. Úsalo para dar respuestas coherentes y no repetir preguntas ya contestadas.',
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

async function resolveModelForTenant(tenantId: string): Promise<string> {
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
