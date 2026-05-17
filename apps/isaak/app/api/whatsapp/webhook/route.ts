/**
 * W1 — WhatsApp webhook para Isaak
 *
 * GET  — verificación de token con Meta
 * POST — mensajes entrantes → LLM → respuesta WhatsApp
 *
 * Arquitectura (Opción A):
 *   El tenant registra su número en Ajustes → Perfil.
 *   Si el número entrante no está vinculado, Isaak responde pidiendo
 *   que se registre en isaak.verifactu.business/settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@verifactu/utils';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { prisma } from '@/app/lib/prisma';
import {
  findTenantIdByPhone,
  normalizePhone,
  saveWhatsAppEvent,
  sendWhatsAppText,
  stripMarkdown,
  truncateForWhatsApp,
  upsertWhatsAppThread,
  verifyWebhookSignature,
  type WaWebhookBody,
} from '@/app/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  // 1. Verificar firma HMAC
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[whatsapp/webhook] firma inválida — ignorando');
    return new Response('Invalid signature', { status: 401 });
  }

  // Meta espera siempre 200 rápido; procesamos en background
  void processWebhookAsync(rawBody);

  return new Response('OK', { status: 200 });
}

// ── Procesamiento asíncrono ────────────────────────────────────────────────────

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

      for (const msg of change.value.messages ?? []) {
        if (msg.type !== 'text' || !msg.text?.body) continue;

        await handleIncomingTextMessage({
          from: msg.from,
          messageId: msg.id,
          text: msg.text.body,
          senderName: change.value.contacts?.[0]?.profile?.name ?? null,
        }).catch((err) => {
          console.error('[whatsapp/webhook] error procesando mensaje', err);
        });
      }
    }
  }
}

async function handleIncomingTextMessage(input: {
  from: string;
  messageId: string;
  text: string;
  senderName: string | null;
}): Promise<void> {
  const { from, messageId, text, senderName } = input;

  // 2. Buscar tenant por número
  const tenantId = await findTenantIdByPhone(from);

  // 3. Crear/actualizar thread y registrar evento entrante
  const threadId = await upsertWhatsAppThread(from, tenantId);
  await saveWhatsAppEvent({
    threadId,
    tenantId,
    providerMessageId: messageId,
    direction: 'inbound',
    eventType: 'text',
    body: text,
    payload: { from, senderName },
  }).catch(() => {
    // non-blocking
  });

  // 4. Si no hay tenant vinculado → mensaje de vinculación
  if (!tenantId) {
    const linkMsg = stripMarkdown(
      `Hola${senderName ? ` ${senderName.split(' ')[0]}` : ''}! Soy Isaak, tu asistente fiscal.\n\nPara que pueda ayudarte, primero vincula este número a tu cuenta en:\n👉 isaak.verifactu.business/settings\n\nVe a *Ajustes → Perfil* y añade tu número de WhatsApp.`
    );
    await sendWhatsAppText(normalizePhone(from), linkMsg);
    await saveOutboundEvent(threadId, tenantId, linkMsg);
    return;
  }

  // 5. Cargar contexto del tenant
  const primaryUserId = await getPrimaryUserId(tenantId);
  let context;
  try {
    context = await loadIsaakBusinessContext(
      { tenantId, userId: primaryUserId ?? 'whatsapp-webhook' },
      { includeSnapshot: true }
    );
  } catch (err) {
    console.error('[whatsapp/webhook] error cargando contexto', err);
    await sendWhatsAppText(
      normalizePhone(from),
      'Lo siento, ha ocurrido un error técnico. Inténtalo de nuevo en unos minutos.'
    );
    return;
  }

  // 6. Verificar rate limit por plan
  const { allowed } = await checkWhatsAppQuota(tenantId);
  if (!allowed) {
    const limitMsg =
      'Has alcanzado el límite diario de mensajes de tu plan. Actualiza tu plan en isaak.verifactu.business/settings para continuar.';
    await sendWhatsAppText(normalizePhone(from), limitMsg);
    await saveOutboundEvent(threadId, tenantId, limitMsg);
    return;
  }

  // 7. Construir system prompt y llamar al LLM
  const systemPrompt = buildWhatsAppSystemPrompt(context, senderName);
  const snapshot = context.holded.snapshot;

  const model = await resolveModelForTenant(tenantId);
  const llmResult = await callLLM({
    provider: 'anthropic',
    model,
    instructions: systemPrompt,
    messages: [{ role: 'user', content: text }],
    temperature: 0.45,
    maxOutputTokens: 350,
    enableFallback: true,
  }).catch(() => null);

  const reply = llmResult?.text?.trim()
    ? stripMarkdown(truncateForWhatsApp(llmResult.text.trim()))
    : snapshot
      ? `Hola! Tengo acceso a tus datos de Holded (${snapshot.invoices.length} facturas, ${snapshot.contacts.length} contactos). ¿En qué puedo ayudarte?`
      : 'Hola! Soy Isaak, tu asistente fiscal. ¿En qué puedo ayudarte hoy?';

  // 8. Enviar respuesta
  await sendWhatsAppText(normalizePhone(from), reply);
  await saveOutboundEvent(threadId, tenantId, reply);
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
    `Eres Isaak, el asistente fiscal y contable de ${company}.`,
    `Estás respondiendo por WhatsApp a ${name}.`,
    'Responde siempre en español. Sé conciso (máximo 3-4 párrafos cortos). No uses markdown avanzado — usa *negrita* para énfasis y • para listas.',
    'No inventes datos fiscales. Si no tienes datos suficientes, pide que abran isaak.verifactu.business para ver el análisis completo.',
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
    if (['starter', 'pro', 'business', 'enterprise'].includes(planCode)) {
      return { allowed: true };
    }
    // Free: máximo 10 mensajes WhatsApp por día
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const count = await prisma.whatsAppEvent.count({
      where: {
        tenantId,
        direction: 'inbound',
        occurredAt: { gte: since },
      },
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
  }).catch(() => {
    // non-blocking
  });
}
