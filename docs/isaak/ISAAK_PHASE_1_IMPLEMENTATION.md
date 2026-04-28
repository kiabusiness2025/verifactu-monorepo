# ISAAK — Plan de Implementación Fase 1

> Última actualización: 2026-04-28  
> Estado: **LISTO PARA EMPEZAR**

Esta es la guía técnica de implementación de la Fase 1. Todo lo que falta para tener Isaak facturando.

---

## Estado actual (lo que ya existe)

```
✅ Anthropic SDK instalado en holded app
✅ API route /api/isaak/support (chat básico sin tools reales de Holded)
✅ IsaakWidget (chat flotante con quick-reply chips)
✅ Modelos IsaakConversation + IsaakConversationMsg en BD
✅ getHoldedSession() — sesión de usuario
✅ Holded connector (20+ tools en apps/holded-mcp/src/holded-client.ts)
✅ OAuth Holded (API key validation en /api/holded/connect)
✅ Prisma + PostgreSQL configurados

❌ Loop tool_use real con Holded tools → PENDIENTE
❌ Chat full-page (Isaak standalone, no widget flotante)
❌ Dashboard de KPIs con gráficos
❌ Alertas proactivas (cron job)
❌ Stripe suscripciones
❌ OpenAI SDK
❌ Dominio isaak.verifactu.business
```

---

## Orden de implementación (semanas)

```
Semana 1:  Endpoint /api/isaak/chat con tool_use loop real
Semana 2:  Chat UI full-page + sidebar historial
Semana 3:  Dashboard KPIs + gráficos (Recharts)
Semana 4:  Alertas proactivas + digest email (cron)
Semana 5:  Stripe + suscripciones + portal cliente
Semana 6:  Onboarding guiado + ajustes UX
Semana 7:  Beta privada (20-30 usuarios)
Semana 8:  Lanzamiento público + campaña conversión
```

---

## SEMANA 1 — Endpoint /api/isaak/chat con tool_use

### Archivo: `apps/holded/app/api/isaak/chat/route.ts`

Este es el endpoint más crítico. Reemplaza al actual `/api/isaak/support` con un loop tool_use real.

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { buildIsaakSystemPrompt } from '@/app/lib/isaak-chat-prompt';
import { HOLDED_TOOLS, executeHoldedTool } from '@/app/lib/holded-tools';
import { checkIsaakQuota } from '@/app/lib/isaak-quota';
import { formatResponsePayload } from '@/app/lib/isaak-response-formatter';

export const runtime = 'nodejs';
const MAX_TOOL_ITERATIONS = 8;

export async function POST(request: NextRequest) {
  // 1. Autenticación
  const session = await getHoldedSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // 2. Quota check (plan del usuario)
  const quotaOk = await checkIsaakQuota(session.tenantId);
  if (!quotaOk) {
    return NextResponse.json(
      { error: 'Has superado el límite de consultas de tu plan. Actualiza para continuar.' },
      { status: 429 }
    );
  }

  // 3. Parseo del body
  const body = await request.json().catch(() => ({}));
  const message: string = body?.message?.trim() ?? '';
  const conversationId: string | null = body?.conversationId ?? null;
  const images = Array.isArray(body?.images) ? body.images.slice(0, 3) : [];

  if (!message && images.length === 0) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  }

  // 4. Cargar historial de conversación
  let history: Anthropic.MessageParam[] = [];
  let activeConversationId = conversationId;

  if (conversationId) {
    const prior = await prisma.isaakConversationMsg.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    history = prior
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  // 5. Construir mensaje del usuario (texto + imágenes opcionales)
  const userContent: Anthropic.ContentBlockParam[] =
    images.length > 0
      ? [
          ...(message ? [{ type: 'text' as const, text: message }] : []),
          ...images.map((img: { mimeType: string; data: string }) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: img.mimeType, data: img.data },
          })),
        ]
      : [{ type: 'text', text: message }];

  // 6. Obtener credenciales Holded del usuario
  const holdedAuth = await getHoldedAuth(session.tenantId);

  // 7. System prompt personalizado
  const systemPrompt = buildIsaakSystemPrompt({
    userName: session.name?.split(' ')[0] ?? null,
    hasHolded: !!holdedAuth,
  });

  // 8. Loop tool_use con Claude
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const toolCallLog: Array<{ name: string; input: unknown; result: unknown }> = [];

  let messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: userContent }];

  let iteration = 0;
  let finalReply = '';

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration++;

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools: holdedAuth ? HOLDED_TOOLS : [],
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      // Respuesta final
      finalReply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b) => b.type === 'tool_use'
      ) as Anthropic.ToolUseBlock[];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolCall of toolUseBlocks) {
        let result: unknown;
        try {
          result = await executeHoldedTool(toolCall.name, toolCall.input, holdedAuth);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : 'Tool error' };
        }

        toolCallLog.push({ name: toolCall.name, input: toolCall.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Añadir respuesta del asistente + resultados de tools al historial
      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
      continue;
    }

    // stop_reason inesperado
    break;
  }

  // 9. Formatear respuesta (detectar charts, cards)
  const { chartPayload, cardPayload } = formatResponsePayload(toolCallLog, finalReply);

  // 10. Persistir conversación en BD
  if (!activeConversationId) {
    const convo = await prisma.isaakConversation.create({
      data: {
        tenantId: session.tenantId,
        userId: session.userId,
        title: message.slice(0, 80) || 'Consulta',
        context: 'holded_chat',
        lastActivity: new Date(),
      },
    });
    activeConversationId = convo.id;
  }

  const userMsgContent = message || '[imagen adjunta]';
  await prisma.$transaction([
    prisma.isaakConversationMsg.create({
      data: {
        conversationId: activeConversationId,
        role: 'user',
        content: userMsgContent,
        // toolCalls no aplica a mensajes de usuario
      },
    }),
    prisma.isaakConversationMsg.create({
      data: {
        conversationId: activeConversationId,
        role: 'assistant',
        content: finalReply,
        toolCalls: toolCallLog.length > 0 ? toolCallLog : undefined,
        chartPayload: chartPayload ?? undefined,
        cardPayload: cardPayload ?? undefined,
        aiEngine: 'CLAUDE',
      },
    }),
    prisma.isaakConversation.update({
      where: { id: activeConversationId },
      data: { lastActivity: new Date(), messageCount: { increment: 2 } },
    }),
    prisma.isaakSubscription.update({
      where: { tenantId: session.tenantId },
      data: { queriesUsed: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    reply: finalReply,
    conversationId: activeConversationId,
    chartPayload,
    cardPayload,
    toolsUsed: toolCallLog.map((t) => t.name),
  });
}

async function getHoldedAuth(tenantId: string) {
  // Recuperar y desencriptar credenciales Holded del tenant
  // Por ahora: buscar en la tabla de conectores existente
  // TODO: migrar a IsaakConnector con encriptación
  const connector = await prisma.isaakConnector
    ?.findFirst({
      where: { tenantId, type: 'HOLDED', status: 'ACTIVE' },
    })
    .catch(() => null);

  if (!connector) return null;
  // decrypt(connector.credentials) → { apiKey: '...' }
  return connector ? JSON.parse(connector.credentials) : null;
}
```

### Archivo: `apps/holded/app/lib/holded-tools.ts`

Adaptador de las MCP tools existentes al formato `Anthropic.Tool[]`:

```typescript
import type Anthropic from '@anthropic-ai/sdk';

// Importar el cliente MCP de Holded existente
import { HoldedClient } from '../../../holded-mcp/src/holded-client';

export const HOLDED_TOOLS: Anthropic.Tool[] = [
  {
    name: 'holded_list_documents',
    description:
      'Lista facturas emitidas o recibidas con filtros por tipo, estado, fecha y cliente.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['invoice', 'purchase', 'estimate'] },
        status: { type: 'string', enum: ['pending', 'paid', 'overdue', 'all'] },
        dateFrom: { type: 'string' },
        dateTo: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['type'],
    },
  },
  {
    name: 'holded_get_tax_summary',
    description: 'Calcula IVA repercutido, soportado y cuota neta del trimestre o periodo.',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Ej: Q2-2026, 2026, 2026-04' },
      },
      required: ['period'],
    },
  },
  // ... (resto de tools del catálogo en ISAAK_TOOLS_CATALOG.md)
];

export async function executeHoldedTool(
  toolName: string,
  input: unknown,
  auth: { apiKey: string }
): Promise<unknown> {
  const client = new HoldedClient({ apiKey: auth.apiKey });

  const params = input as Record<string, unknown>;

  switch (toolName) {
    case 'holded_list_documents':
      return client.listDocuments(params);
    case 'holded_get_document':
      return client.getDocument(params.documentId as string, params.type as string);
    case 'holded_get_tax_summary':
      return client.getTaxSummary(params.period as string);
    case 'holded_get_balance_sheet':
      return client.getBalanceSheet(params);
    case 'holded_get_profit_loss':
      return client.getProfitLoss(params);
    case 'holded_get_daily_book':
      return client.getDailyBook(params);
    case 'holded_list_contacts':
      return client.listContacts(params);
    case 'holded_get_contact':
      return client.getContact(params.contactId as string);
    case 'holded_list_projects':
      return client.listProjects(params);
    case 'holded_list_treasury_accounts':
      return client.listTreasuryAccounts();
    case 'holded_create_invoice_draft':
      return client.createInvoiceDraft(params);
    default:
      throw new Error(`Tool desconocida: ${toolName}`);
  }
}
```

### Archivo: `apps/holded/app/lib/isaak-response-formatter.ts`

```typescript
export interface ChartPayload {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
}

export interface CardPayload {
  type: 'invoice' | 'tax_summary' | 'contact' | 'alert' | 'ocr_result' | 'cash_position';
  data: Record<string, unknown>;
  actions?: Array<{ label: string; action: string; payload?: unknown }>;
}

export function formatResponsePayload(
  toolCallLog: Array<{ name: string; input: unknown; result: unknown }>,
  reply: string
): { chartPayload?: ChartPayload; cardPayload?: CardPayload } {
  // Detectar resumen de IVA → card
  const taxTool = toolCallLog.find((t) => t.name === 'holded_get_tax_summary');
  if (taxTool?.result) {
    const data = taxTool.result as Record<string, number>;
    return {
      cardPayload: {
        type: 'tax_summary',
        data: {
          iva_repercutido: data.iva_repercutido,
          iva_soportado: data.iva_soportado,
          cuota_neta: data.cuota_neta,
          period: (taxTool.input as Record<string, string>).period,
        },
      },
    };
  }

  // Detectar lista de facturas con múltiples registros → bar chart
  const docsTool = toolCallLog.find((t) => t.name === 'holded_list_documents');
  if (
    docsTool?.result &&
    Array.isArray(docsTool.result) &&
    (docsTool.result as unknown[]).length > 3
  ) {
    const docs = docsTool.result as Array<{ date: string; total: number; status: string }>;
    // Agrupar por mes para gráfico
    const byMonth = groupByMonth(docs);
    if (byMonth.length > 1) {
      return {
        chartPayload: {
          type: 'bar',
          title: 'Facturación por mes',
          data: byMonth,
          xKey: 'month',
          yKeys: ['total'],
        },
      };
    }
  }

  return {};
}

function groupByMonth(docs: Array<{ date: string; total: number }>) {
  const map = new Map<string, number>();
  for (const doc of docs) {
    const month = doc.date.slice(0, 7); // YYYY-MM
    map.set(month, (map.get(month) ?? 0) + doc.total);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}
```

---

## SEMANA 2 — Chat UI Full-Page

### Estructura de componentes

```
apps/holded/app/(isaak)/
  layout.tsx           → wrapper con sidebar
  page.tsx             → redirect a /nueva conversación
  [conversationId]/
    page.tsx           → chat activo
  components/
    IsaakChatPage.tsx  → contenedor principal
    ChatSidebar.tsx    → historial de conversaciones
    MessageBubble.tsx  → burbuja de mensaje (texto + chart + card)
    ChartEmbed.tsx     → Recharts inline en el chat
    CardEmbed.tsx      → cards estructuradas (IVA, factura, etc.)
    ToolIndicator.tsx  → "Consultando Holded…" mientras tool_use
    ChatInput.tsx      → textarea + adjuntos + send
```

### Funcionalidades UI esenciales

- **Streaming**: usar `ReadableStream` para mostrar la respuesta de Claude mientras llega
- **Tool indicator**: mientras hay tool_use en curso, mostrar "Consultando Holded…" con animación
- **Chart inline**: si la respuesta incluye `chartPayload`, renderizar `<ChartEmbed>` debajo del texto
- **Card inline**: si incluye `cardPayload` (ej: resumen IVA), renderizar `<CardEmbed>`
- **Quick-reply chips**: los chips ya implementados en IsaakWidget, portados al chat full-page
- **Adjuntos**: drag & drop de imágenes/PDF, máx 3 por mensaje

---

## SEMANA 3 — Dashboard de KPIs

### Endpoint: `apps/holded/app/api/isaak/dashboard/route.ts`

```typescript
// GET /api/isaak/dashboard
// Devuelve KPIs calculados desde Holded, cacheados en Redis

export async function GET(request: NextRequest) {
  const session = await getHoldedSession();
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const cacheKey = `isaak:dashboard:${session.tenantId}`;

  // Intentar desde caché primero
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  // Calcular desde Holded
  const auth = await getHoldedAuth(session.tenantId);
  if (!auth) return NextResponse.json({ error: 'Holded no conectado' }, { status: 400 });

  const client = new HoldedClient({ apiKey: auth.apiKey });
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [invoicesThisMonth, overdueInvoices, taxSummary, balance] = await Promise.all([
    client.listDocuments({ type: 'invoice', dateFrom: monthStart }),
    client.listDocuments({ type: 'invoice', status: 'overdue' }),
    client.getTaxSummary(`Q${Math.ceil((now.getMonth() + 1) / 3)}-${now.getFullYear()}`),
    client.getBalanceSheet({ dateFrom: monthStart, dateTo: now.toISOString().split('T')[0] }),
  ]);

  const data = {
    kpis: {
      facturado_mes: sumInvoices(invoicesThisMonth),
      cobrado_mes: sumInvoices(invoicesThisMonth.filter((i) => i.status === 'paid')),
      pendiente_cobro: sumInvoices(overdueInvoices),
      iva_estimado: taxSummary?.cuota_neta ?? 0,
    },
    charts: {
      facturacion_6m: await getMonthlyInvoices(client, 6),
      top_clientes: await getTopClients(client, 5),
    },
    alerts: await getActiveAlerts(session.tenantId),
    updatedAt: new Date().toISOString(),
  };

  // Cachear 10 minutos
  await redis.set(cacheKey, JSON.stringify(data), { ex: 600 });

  return NextResponse.json(data);
}
```

### Widgets del dashboard

```
KPICard × 4:
  - Facturado este mes (vs mes anterior: ▲ +8%)
  - Cobrado este mes
  - Pendiente de cobro (con badge de urgencia si > 30 días)
  - IVA estimado trimestre

LineChart:
  - Evolución facturación últimos 6 meses

BarChart horizontal:
  - Top 5 clientes por volumen este mes

AlertFeed:
  - Lista de alertas activas con tipo y acción sugerida
  - Click en alerta → abre chat con contexto preseleccionado
```

---

## SEMANA 4 — Alertas Proactivas (Cron)

### Vercel Cron: `apps/holded/vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/isaak/cron/daily-analysis",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/isaak/cron/weekly-digest",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Endpoint: `/api/isaak/cron/daily-analysis`

```typescript
// Para cada tenant activo:
// 1. Obtener datos Holded
// 2. Claude analiza (sin tool_use, con datos inyectados en el prompt)
// 3. Crear IsaakAlerts en BD
// 4. Si hay alertas urgentes → email inmediato

const ALERT_RULES = [
  {
    id: 'overdue_invoice_30d',
    type: 'OVERDUE_INVOICE' as const,
    check: (data: DashboardData) => data.overdueInvoices.filter((i) => i.daysPastDue > 30),
    severity: 'high',
  },
  {
    id: 'vat_deadline_7d',
    type: 'VAT_DEADLINE' as const,
    check: (data: DashboardData) => {
      const daysToVAT = daysUntilVATDeadline();
      return daysToVAT <= 7 ? [{ days: daysToVAT }] : [];
    },
    severity: 'medium',
  },
  // ... más reglas
];
```

---

## SEMANA 5 — Stripe + Suscripciones

### Productos Stripe a crear (CLI o dashboard)

```bash
# Crear productos
stripe products create --name="Isaak Starter"
stripe products create --name="Isaak Pro"
stripe products create --name="Isaak Business"

# Crear precios
stripe prices create \
  --product=prod_starter \
  --currency=eur \
  --unit-amount=2900 \
  --recurring[interval]=month

stripe prices create \
  --product=prod_starter \
  --currency=eur \
  --unit-amount=27600 \  # 23€ × 12
  --recurring[interval]=year
```

### Webhook handler: `/api/stripe/webhook/route.ts`

```typescript
const WEBHOOK_HANDLERS: Record<string, (event: Stripe.Event) => Promise<void>> = {
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,
  'customer.subscription.trial_will_end': handleTrialWillEnd,
};

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  const plan = getPlanFromPriceId(sub.items.data[0].price.id);

  await prisma.isaakSubscription.update({
    where: { stripeSubId: sub.id },
    data: {
      plan,
      status: mapStripeStatus(sub.status),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}
```

---

## SEMANA 6 — Onboarding Guiado

### Flujo de onboarding

```
/isaak/onboarding

Paso 1: "¿Qué software de gestión usas?"
  → Selector: Holded / Sage / A3 / Contaplus / Otro
  → [Fase 1: solo Holded disponible, resto "próximamente"]

Paso 2: "Conecta tu cuenta de Holded"
  → Input API key + botón Validar
  → Validación en tiempo real → ✅ Conectado o ❌ Error

Paso 3: Isaak analiza los últimos 3 meses
  → Loader animado: "Revisando tus facturas…" "Analizando contabilidad…"
  → Claude genera resumen inicial personalizado

Paso 4: "Aquí está tu negocio a vista de Isaak"
  → Resumen: facturación, cobros pendientes, IVA estimado
  → "¿Empezamos?" → CTA al chat

Paso 5: Primera conversación guiada
  → Isaak sugiere: "Prueba preguntarme esto →"
  → Quick-reply chips con consultas de ejemplo reales
```

---

## Variables de entorno para Fase 1

Añadir a `apps/holded/.env.local` y en Vercel dashboard:

```bash
# Ya existentes
ANTHROPIC_API_KEY=sk-ant-...

# Nuevos para Fase 1
OPENAI_API_KEY=sk-...                    # Para GPT-4o (aunque en F1 solo Claude)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_BUSINESS_ANNUAL=price_...
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=isaak-docs
ISAAK_ENCRYPTION_KEY=...                 # 32 bytes hex aleatorio
CRON_SECRET=...                          # Para proteger endpoints de cron
RESEND_API_KEY=re_...                    # Ya debería existir
```

---

## Checklist de lanzamiento

```
Infraestructura:
  ☐ Dominio isaak.verifactu.business configurado en Vercel
  ☐ Variables de entorno en Vercel (producción)
  ☐ Upstash Redis creado y conectado
  ☐ Cloudflare R2 bucket creado
  ☐ Stripe productos y webhooks configurados
  ☐ Migración Prisma ejecutada en producción (nuevos modelos Isaak)
  ☐ pgvector habilitado en PostgreSQL (para embeddings Fase 2)
  ☐ Vercel Cron configurado

Producto:
  ☐ /api/isaak/chat con tool_use loop probado (manual + tests)
  ☐ Dashboard KPIs carga sin errores
  ☐ Alertas cron ejecutándose correctamente
  ☐ Stripe checkout → webhook → plan actualizado en BD
  ☐ Trial de 30 días funcionando
  ☐ Onboarding completo sin errores
  ☐ OCR básico de imágenes funcionando
  ☐ Emails de bienvenida + digest enviándose

Legal:
  ☐ ToS de Isaak publicados
  ☐ Privacy Policy actualizada (menciona uso de Claude/OpenAI)
  ☐ DPA disponible para plan Business

Métricas:
  ☐ PostHog instalado (eventos: chat_sent, tool_used, plan_upgraded)
  ☐ Sentry configurado para errores de producción
```

---

## Primer mensaje de Isaak (sistema)

```typescript
// apps/holded/app/lib/isaak-chat-prompt.ts

export function buildIsaakSystemPrompt({
  userName,
  hasHolded,
}: {
  userName: string | null;
  hasHolded: boolean;
}): string {
  const greeting = userName
    ? `El usuario se llama ${userName}.`
    : 'El usuario no ha iniciado sesión con nombre.';

  const holdedContext = hasHolded
    ? `El usuario tiene Holded conectado. Tienes acceso a las tools de Holded — úsalas proactivamente cuando el usuario pregunte sobre facturas, contabilidad, clientes, IVA o tesorería. SIEMPRE muestra los datos reales de Holded, no los inventes.`
    : `El usuario NO tiene Holded conectado todavía. Anímale a conectarlo para poder responder con datos reales. Puedes responder preguntas generales de gestión empresarial mientras tanto.`;

  return `Eres Isaak, el asistente financiero y de gestión de Verifactu Business.
${greeting}

## Tu rol
Ayudas a empresarios y pymes españolas a entender su negocio usando lenguaje claro, sin jerga contable.
Accedes a datos reales del ERP del usuario y los interpretas con criterio de negocio.
Eres proactivo: si detectas algo importante (factura vencida, IVA próximo, cobro en riesgo), lo mencionas sin que te pregunten.
Eres conciso pero completo. Nunca inventas datos financieros.

## Contexto ERP
${holdedContext}

## Reglas de seguridad
- Nunca modifiques datos en Holded sin confirmación explícita del usuario.
- Cuando vayas a crear algo (borrador de factura, gasto...), muestra primero un resumen de lo que harás y pide confirmación.
- Si el usuario dice "sí", "confirmar", "adelante" o similar, entonces ejecuta.

## Idioma y tono
- Siempre en español castellano.
- Tono profesional pero cercano. No uses jerga contable innecesaria.
- Si el usuario pregunta algo técnico (IRPF, IS, PGC...), explícalo en términos claros.

## Formato
- Usa markdown: **negrita** para cantidades importantes, listas para múltiples items.
- Para resúmenes financieros, usa tablas simples.
- Mantén las respuestas enfocadas. Si hay mucho que explicar, pregunta qué parte le interesa más.`;
}
```
