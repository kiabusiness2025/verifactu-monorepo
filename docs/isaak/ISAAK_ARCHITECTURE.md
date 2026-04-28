# ISAAK — Arquitectura Técnica Fullstack

> Última actualización: 2026-04-28

---

## Diagrama general del sistema

```
┌───────────────────────────────────────────────────────────────────────┐
│                          ISAAK PLATFORM                               │
├───────────────────────────────────────────────────────────────────────┤
│  FRONTEND  (Next.js 15 App Router)                                    │
│  ├── /isaak              → Chat full-page + sidebar historial         │
│  ├── /isaak/dashboard    → KPIs, gráficos, alertas proactivas         │
│  ├── /isaak/documentos   → Facturas OCR, borradores, archivos         │
│  ├── /isaak/settings     → Conectores, plan, preferencias IA          │
│  └── /isaak/onboarding   → Alta guiada multi-software                 │
├───────────────────────────────────────────────────────────────────────┤
│  ORCHESTRATION LAYER  (API Routes / Edge Functions)                   │
│  ├── AI Router           → Decide Claude vs GPT-4o por tipo de tarea  │
│  ├── Tool Executor       → Loop tool_use hasta respuesta final        │
│  ├── Context Manager     → Historial + embeddings + memoria semántica │
│  └── Response Formatter  → Texto + cards JSON + chart payloads        │
├───────────────────────────────────────────────────────────────────────┤
│  CONNECTORS  (adaptadores normalizados ERPConnector interface)        │
│  ├── Holded              → 20+ tools (Fase 1, ya construido parcial)  │
│  ├── Google Workspace    → Calendar + Gmail OAuth (Fase 2)            │
│  ├── Microsoft 365       → Calendar + Outlook OAuth (Fase 2)          │
│  ├── Inbox propio        → facturas@isaak.es vía Resend (Fase 3)      │
│  ├── Nordigen/GoCardless → PSD2 Open Banking (Fase 5)                 │
│  └── Sage / A3 / Odoo   → multi-ERP adapter (Fase 3+)               │
├───────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                           │
│  ├── PostgreSQL (Prisma) → usuarios, convs, suscripciones, alertas   │
│  ├── pgvector            → embeddings para búsqueda semántica         │
│  ├── Upstash Redis       → caché ERP (TTL 5–30 min), rate limiting    │
│  ├── Cloudflare R2       → facturas, documentos, adjuntos de chat     │
│  └── Vercel Cron         → análisis proactivos, alertas, digest       │
├───────────────────────────────────────────────────────────────────────┤
│  EXTERNAL SERVICES                                                    │
│  ├── Anthropic API       → Claude Sonnet 4.6 (primario)               │
│  ├── OpenAI API          → GPT-4o (secundario / tareas específicas)   │
│  ├── Stripe              → facturación suscripciones + portal cliente │
│  ├── Resend              → emails transaccionales + inbox de facturas  │
│  ├── ElevenLabs          → TTS voz Isaak (Fase 4)                     │
│  ├── Whisper (OpenAI)    → STT entrada de voz (Fase 4)               │
│  └── Google/MS OAuth     → autenticación calendar + email (Fase 2)   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Estructura de rutas en el monorepo

```
apps/
  isaak/                          ← app independiente (isaak.verifactu.business)
    app/
      (chat)/
        page.tsx                  ← chat full-page
        layout.tsx
      dashboard/
        page.tsx
      documentos/
        page.tsx
      settings/
        page.tsx
        conectores/page.tsx
        plan/page.tsx
      onboarding/
        page.tsx
      api/
        chat/route.ts             ← endpoint principal: tool_use loop
        dashboard/route.ts        ← KPIs y datos de dashboard
        documents/ocr/route.ts    ← OCR pipeline
        alerts/route.ts           ← alertas proactivas
        connectors/
          holded/route.ts
          google/route.ts         ← Fase 2
          microsoft/route.ts      ← Fase 2
          bank/route.ts           ← Fase 5
      lib/
        ai-router.ts              ← routing Claude vs GPT-4o
        tool-executor.ts          ← ejecutor del loop tool_use
        context-manager.ts        ← historial + embeddings
        response-formatter.ts     ← formato de respuesta (texto/cards/charts)
        connectors/
          holded.ts               ← ya construido en holded-mcp
          google.ts
          microsoft.ts
          bank.ts
        prompts/
          system.ts               ← prompt base de Isaak
          financial-analysis.ts   ← prompts especializados
      components/
        Chat/
          ChatPage.tsx
          MessageBubble.tsx
          ToolCallIndicator.tsx
          ChartEmbed.tsx          ← Recharts inline en chat
          CardEmbed.tsx           ← cards estructuradas en chat
        Dashboard/
          KPICard.tsx
          AlertFeed.tsx
          LineChartWidget.tsx
          BarChartWidget.tsx
        Sidebar/
          ConversationList.tsx
          NewChatButton.tsx
      globals.css
      layout.tsx
```

---

## AI Router — Decisión Claude vs GPT-4o

```typescript
// apps/isaak/app/lib/ai-router.ts

export type TaskType =
  | 'financial_analysis' // análisis contable/fiscal → Claude
  | 'document_ocr' // lectura de imagen/PDF   → Claude Vision
  | 'excel_generation' // tablas/Excel complejos  → GPT-4o
  | 'voice_transcript' // transcripción audio     → Whisper+GPT-4o
  | 'draft_generation' // redacción documentos    → Claude
  | 'data_query' // consulta datos ERP      → Claude
  | 'bank_reconciliation'; // lógica conciliación     → Claude

export type AIEngine = 'claude' | 'gpt4o';
export type Plan = 'trial' | 'starter' | 'pro' | 'business' | 'enterprise';

const ROUTING_TABLE: Record<TaskType, AIEngine> = {
  financial_analysis: 'claude',
  document_ocr: 'claude',
  excel_generation: 'gpt4o',
  voice_transcript: 'gpt4o',
  draft_generation: 'claude',
  data_query: 'claude',
  bank_reconciliation: 'claude',
};

export function routeToAI(task: TaskType, plan: Plan, userOverride?: AIEngine): AIEngine {
  if (plan === 'starter') return 'claude'; // starter solo Claude
  if (userOverride) return userOverride; // usuario puede forzar
  return ROUTING_TABLE[task];
}
```

---

## Tool Executor — Loop tool_use

El corazón de Isaak. Permite a Claude/GPT-4o llamar a herramientas del ERP en tiempo real.

```typescript
// apps/isaak/app/lib/tool-executor.ts

export async function runToolUseLoop(params: {
  engine: AIEngine;
  messages: Message[];
  tools: ToolDefinition[];
  systemPrompt: string;
  maxIterations?: number;
}): Promise<{ reply: string; toolCalls: ToolCallRecord[]; chartPayload?: ChartData }> {
  const { engine, messages, tools, systemPrompt, maxIterations = 8 } = params;
  const toolCallLog: ToolCallRecord[] = [];
  let iteration = 0;
  let currentMessages = [...messages];

  while (iteration < maxIterations) {
    iteration++;

    // 1. Llamar a la IA con tools disponibles
    const response =
      engine === 'claude'
        ? await callClaude({ messages: currentMessages, tools, systemPrompt })
        : await callGPT4o({ messages: currentMessages, tools, systemPrompt });

    // 2. Si la IA quiere llamar una tool
    if (response.stopReason === 'tool_use') {
      const toolCalls = extractToolCalls(response);

      // 3. Ejecutar cada tool call contra el ERP
      const toolResults = await Promise.all(
        toolCalls.map(async (call) => {
          const result = await executeConnectorTool(call.name, call.input);
          toolCallLog.push({ name: call.name, input: call.input, result });
          return { toolUseId: call.id, result };
        })
      );

      // 4. Añadir resultados al historial y continuar
      currentMessages = buildNextMessages(currentMessages, response, toolResults);
      continue;
    }

    // 5. La IA tiene respuesta final
    const reply = extractTextReply(response);
    const chartPayload = detectAndBuildChartPayload(toolCallLog);

    return { reply, toolCalls: toolCallLog, chartPayload };
  }

  throw new Error('Tool use loop exceeded max iterations');
}
```

**Flujo completo de una consulta:**

```
Usuario: "¿Cuánto IVA debo pagar este trimestre?"
    ↓
AI Router → 'financial_analysis' → Claude
    ↓
Tool Executor: Claude recibe tools [get_journal, list_documents, get_tax_summary]
    ↓
Claude llama: get_tax_summary({ period: 'Q2-2026' })
    ↓
Tool Executor → Holded API → { iva_repercutido: 4823, iva_soportado: 1247, cuota: 3576 }
    ↓
Claude llama: list_documents({ type: 'expense', dateFrom: '2026-04-01', pending_iva: true })
    ↓
Tool Executor → Holded API → [lista facturas con IVA pendiente]
    ↓
Claude genera respuesta final + detectamos datos numéricos → chartPayload
    ↓
Response Formatter → { text: "...", card: { tipo: 'iva_summary', data: {...} }, chart: {...} }
    ↓
Frontend renderiza texto + card IVA + gráfico de barras
```

---

## Response Formatter — Respuestas enriquecidas

El chat de Isaak no es texto plano. Las respuestas pueden incluir:

```typescript
interface IsaakResponse {
  text: string; // texto markdown de la respuesta
  chartPayload?: {
    // si hay datos numéricos → gráfico
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: Record<string, unknown>[];
    xKey: string;
    yKeys: string[];
  };
  cardPayload?: {
    // si hay una entidad estructurada
    type: 'invoice' | 'tax_summary' | 'contact' | 'alert' | 'ocr_result';
    data: Record<string, unknown>;
    actions?: CardAction[]; // botones de acción en la card
  };
  suggestions?: string[]; // quick-reply chips (ya implementado)
}
```

El frontend `MessageBubble.tsx` detecta `chartPayload` o `cardPayload` y renderiza el componente correspondiente inline.

---

## Context Manager — Historial y memoria

```typescript
// apps/isaak/app/lib/context-manager.ts

// Historial reciente (últimos N mensajes → pasan al prompt)
const MAX_HISTORY_MESSAGES = 30;

// Memoria semántica (pgvector)
// Cada conversación → chunk → embedding → almacenado
// Recuperación: "¿Qué decíamos sobre Muebles Duran?"
//   → vector search → top 5 chunks relevantes → pasan como contexto

export async function buildContext(params: {
  conversationId: string;
  currentMessage: string;
  userId: string;
}): Promise<ContextBundle> {
  const [history, semanticMemory, erpSnapshot] = await Promise.all([
    getRecentHistory(params.conversationId, MAX_HISTORY_MESSAGES),
    searchSemanticMemory(params.currentMessage, params.userId, (topK = 5)),
    getERPSnapshot(params.userId), // últimos KPIs cacheados
  ]);

  return { history, semanticMemory, erpSnapshot };
}
```

---

## Caché Redis — Estrategia de TTL

```
Key schema:  isaak:{tenantId}:{resource}:{params_hash}

holded:invoices:{month}        TTL: 5 min   (datos en tiempo real)
holded:balance                 TTL: 15 min  (balance puede esperar)
holded:contacts                TTL: 30 min  (contactos cambian poco)
holded:chart_of_accounts       TTL: 60 min  (plan de cuentas estable)
dashboard:kpis:{userId}        TTL: 10 min  (dashboard se refresca al abrir)
alerts:{userId}                TTL: 1 hour  (alertas procesadas por cron)
```

---

## Seguridad

### Credenciales ERP

```typescript
// Almacenamiento en BD → encriptado AES-256-GCM
// Clave de encriptación → env variable ISAAK_ENCRYPTION_KEY
// Desencriptado → solo en el momento de llamar la API, en servidor
// Nunca se envía a Claude/GPT-4o — solo los resultados de las tools

async function getDecryptedCredentials(connectorId: string): Promise<ConnectorAuth> {
  const connector = await prisma.isaakConnector.findUnique({ where: { id: connectorId } });
  return decrypt(connector.credentials, process.env.ISAAK_ENCRYPTION_KEY!);
}
```

### Rate limiting (Redis)

```typescript
// Ventana deslizante por userId + plan
// plan starter: 300 req/mes
// plan pro: ilimitado (pero con burst limit 60 req/hora para evitar abusos)
// plan business: ilimitado
```

### Privacidad de datos ERP

- Datos del ERP del usuario: **nunca se almacenan permanentemente**
- Solo en caché Redis con TTL corto
- Los mensajes del chat SÍ se persisten (el usuario lo acepta en los ToS)
- Opción de borrado total de cuenta: elimina conversaciones + conectores

### Claude/OpenAI

- Se usa la API enterprise → los prompts NO se usan para entrenamiento
- DPA firmado con Anthropic y OpenAI disponible para clientes Business+

---

## Dominio e infraestructura

```
Producción:   isaak.verifactu.business   → Vercel (nuevo proyecto)
Staging:      isaak-staging.verifactu.business
Base de datos: Neon PostgreSQL (compartida con holded app, schema separado)
Caché:         Upstash Redis (serverless, compatible Vercel Edge)
Storage:       Cloudflare R2 (adjuntos, documentos generados)
Email:         Resend (transaccional + inbox de facturas)
Monitoring:    Sentry (errores) + PostHog (analytics de producto)
```

---

## Variables de entorno requeridas

```bash
# IA
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# BD y caché
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=isaak-docs

# Pagos
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# Seguridad
ISAAK_ENCRYPTION_KEY=...  # 32 bytes hex, para encriptar credenciales ERP

# Fase 2+
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

# Fase 5+
NORDIGEN_SECRET_ID=...
NORDIGEN_SECRET_KEY=...
```
