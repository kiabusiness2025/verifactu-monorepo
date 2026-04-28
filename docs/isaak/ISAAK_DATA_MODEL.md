# ISAAK — Modelo de Datos

> Última actualización: 2026-04-28

Extensión del esquema Prisma existente en `packages/db/prisma/schema.prisma`.  
Los modelos de Isaak usan prefijo `Isaak` para no colisionar con modelos existentes.

---

## Extensiones del esquema Prisma

```prisma
// ─── ENUMS ────────────────────────────────────────────────────────────────

enum IsaakPlan {
  TRIAL
  STARTER    // €29/mes
  PRO        // €69/mes
  BUSINESS   // €149/mes
  ENTERPRISE // custom
}

enum IsaakSubStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELED
  PAUSED
}

enum IsaakAIEngine {
  CLAUDE
  GPT4O
  AUTO    // router decide
}

enum IsaakConnectorType {
  HOLDED
  SAGE50
  A3
  CONTAPLUS
  ODOO
  QUICKBOOKS
  GOOGLE_WORKSPACE
  MICROSOFT_365
  NORDIGEN_BANK
}

enum IsaakConnectorStatus {
  ACTIVE
  ERROR
  EXPIRED     // token expirado, necesita re-auth
  DISCONNECTED
}

enum IsaakAlertType {
  OVERDUE_INVOICE       // factura vencida
  VAT_DEADLINE          // IVA próximo
  CASH_LOW              // tesorería baja
  ANOMALY               // transacción inusual
  CASHFLOW_RISK         // previsión negativa
  RECONCILIATION_NEEDED // movimiento sin conciliar
}

enum IsaakAlertStatus {
  PENDING
  SENT
  DISMISSED
  RESOLVED
}

enum IsaakAttachmentType {
  IMAGE
  PDF
  EXCEL
  AUDIO
}

// ─── SUSCRIPCIONES ────────────────────────────────────────────────────────

model IsaakSubscription {
  id               String         @id @default(cuid())
  tenantId         String         @unique
  userId           String
  plan             IsaakPlan      @default(TRIAL)
  status           IsaakSubStatus @default(TRIALING)
  trialEndsAt      DateTime?
  currentPeriodEnd DateTime?
  stripeCustomerId String?
  stripePriceId    String?
  stripeSubId      String?
  queriesUsed      Int            @default(0)
  queriesLimit     Int            @default(100)  // -1 = unlimited
  aiPreference     IsaakAIEngine  @default(AUTO)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

// ─── CONECTORES ───────────────────────────────────────────────────────────

model IsaakConnector {
  id           String               @id @default(cuid())
  tenantId     String
  userId       String
  type         IsaakConnectorType
  // credentials almacenadas encriptadas (AES-256-GCM)
  // nunca en texto plano. Se desencriptan solo en runtime.
  credentials  String               // JSON encriptado
  scopes       String[]
  status       IsaakConnectorStatus @default(ACTIVE)
  lastSync     DateTime?
  errorMessage String?
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt

  @@unique([tenantId, type])        // un conector de cada tipo por tenant
  @@index([tenantId])
}

// ─── CONVERSACIONES ───────────────────────────────────────────────────────
// Extiende los modelos IsaakConversation / IsaakConversationMsg existentes
// Añade campos necesarios para el chat full-page

model IsaakConversation {
  id           String               @id @default(cuid())
  tenantId     String
  userId       String
  title        String               // primeras palabras del usuario
  context      String               // 'holded_chat' | 'connector_support' | etc.
  pinned       Boolean              @default(false)
  lastActivity DateTime             @default(now())
  messageCount Int                  @default(0)
  createdAt    DateTime             @default(now())
  messages     IsaakConversationMsg[]

  @@index([tenantId, lastActivity])
}

model IsaakConversationMsg {
  id             String               @id @default(cuid())
  conversationId String
  role           String               // 'user' | 'assistant' | 'tool'
  content        String               @db.Text
  toolCalls      Json?                // array de tool calls/results
  aiEngine       IsaakAIEngine?       // qué motor respondió
  tokensUsed     Int?
  chartPayload   Json?                // datos para renderizar gráfico en UI
  cardPayload    Json?                // datos para card estructurada
  attachments    IsaakAttachment[]
  createdAt      DateTime             @default(now())

  conversation   IsaakConversation    @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId, createdAt])
}

// ─── ADJUNTOS ─────────────────────────────────────────────────────────────

model IsaakAttachment {
  id         String              @id @default(cuid())
  messageId  String
  type       IsaakAttachmentType
  fileName   String
  mimeType   String
  sizeBytes  Int
  storageKey String              // clave en R2/S3
  ocrResult  Json?               // datos extraídos por OCR/Vision
  booked     Boolean             @default(false) // contabilizada en ERP?
  bookedAt   DateTime?
  createdAt  DateTime            @default(now())

  message    IsaakConversationMsg @relation(fields: [messageId], references: [id], onDelete: Cascade)
}

// ─── ALERTAS ──────────────────────────────────────────────────────────────

model IsaakAlert {
  id        String            @id @default(cuid())
  tenantId  String
  userId    String
  type      IsaakAlertType
  title     String
  body      String
  payload   Json              // datos específicos del tipo de alerta
  status    IsaakAlertStatus  @default(PENDING)
  dueAt     DateTime?         // cuándo debe mostrarse
  sentAt    DateTime?
  createdAt DateTime          @default(now())

  @@index([tenantId, status, dueAt])
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────

model IsaakDashboard {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  widgets   Json     // array de WidgetConfig
  updatedAt DateTime @updatedAt
}

// WidgetConfig JSON schema:
// {
//   id: string,
//   type: 'kpi' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'alert_feed' | 'table',
//   title: string,
//   dataSource: 'holded_invoices' | 'holded_expenses' | 'holded_balance' | ...,
//   params: Record<string, unknown>,
//   position: { col: number, row: number, colSpan: number, rowSpan: number }
// }

// ─── EMBEDDINGS (memoria semántica) ───────────────────────────────────────
// Requiere extensión pgvector en PostgreSQL

model IsaakEmbedding {
  id             String   @id @default(cuid())
  tenantId       String
  conversationId String
  chunkText      String   @db.Text  // fragmento de texto para recuperar
  embedding      Unsupported("vector(1536)")?  // ada-002 / claude embeddings
  createdAt      DateTime @default(now())

  @@index([tenantId])
}

// ─── PROCESOS AUTOMÁTICOS ─────────────────────────────────────────────────

model IsaakCronRun {
  id        String   @id @default(cuid())
  job       String   // 'daily_analysis' | 'weekly_digest' | 'ocr_inbox' | ...
  tenantId  String?  // null = run global
  status    String   // 'success' | 'error' | 'skipped'
  result    Json?
  durationMs Int?
  runAt     DateTime @default(now())

  @@index([job, runAt])
}

// ─── DOCUMENTOS GENERADOS ─────────────────────────────────────────────────

model IsaakDocument {
  id         String   @id @default(cuid())
  tenantId   String
  userId     String
  type       String   // 'contract' | 'quote' | 'report' | 'tax_draft' | ...
  title      String
  storageKey String   // PDF en R2/S3
  sourceData Json?    // datos usados para generarlo (de Holded, etc.)
  createdAt  DateTime @default(now())

  @@index([tenantId, createdAt])
}
```

---

## Migración incremental

### Fase 1

```sql
-- Tablas nuevas necesarias en Fase 1:
-- IsaakSubscription, IsaakConnector (tipo HOLDED),
-- IsaakConversation + IsaakConversationMsg (extensiones de lo existente),
-- IsaakAttachment, IsaakAlert, IsaakDashboard, IsaakCronRun

-- IsaakEmbedding requiere pgvector — habilitar antes de migrar:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Fase 2

```sql
-- Añadir tipo GOOGLE_WORKSPACE y MICROSOFT_365 a IsaakConnectorType
-- No hay tablas nuevas
```

### Fase 3

```sql
-- Añadir IsaakDocument
-- Añadir tipos SAGE50, A3, etc. al enum
```

### Fase 5

```sql
-- Añadir tipo NORDIGEN_BANK
-- Añadir IsaakBankTransaction (tabla de cache de transacciones bancarias)
```

---

## Índices críticos para rendimiento

```sql
-- Búsqueda de conversaciones por tenant (sidebar)
CREATE INDEX isaak_conv_tenant_activity ON "IsaakConversation"("tenantId", "lastActivity" DESC);

-- Mensajes de una conversación en orden
CREATE INDEX isaak_msg_conv_created ON "IsaakConversationMsg"("conversationId", "createdAt" ASC);

-- Alertas pendientes de enviar
CREATE INDEX isaak_alert_pending ON "IsaakAlert"("tenantId", "status", "dueAt");

-- Embeddings por tenant (búsqueda semántica con pgvector)
CREATE INDEX isaak_embedding_tenant ON "IsaakEmbedding"("tenantId");
-- Vector index para similitud coseno:
CREATE INDEX isaak_embedding_vector ON "IsaakEmbedding" USING ivfflat (embedding vector_cosine_ops);
```

---

## Notas de diseño

- **Multi-tenant desde día 1**: todo tiene `tenantId`. Nunca cruzamos datos entre tenants.
- **Soft deletes**: no borramos conversaciones — marcamos como `deleted` (GDPR: export antes de borrar).
- **Encriptación de credenciales**: el campo `credentials` en `IsaakConnector` es un JSON encriptado con AES-256-GCM. La clave de encriptación vive en `ISAAK_ENCRYPTION_KEY` (env var). Nunca se almacena la clave en BD.
- **pgvector**: extensión PostgreSQL para embeddings. Neon PostgreSQL la soporta nativamente.
- **R2/S3 keys**: el campo `storageKey` en adjuntos/documentos es solo la clave del objeto en R2. La URL de acceso se genera con signed URLs de duración corta (15 min).
