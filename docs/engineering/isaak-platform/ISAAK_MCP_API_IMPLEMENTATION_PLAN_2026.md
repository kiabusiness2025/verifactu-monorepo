# Isaak Platform — Plan de Implementación 2026

**Fecha:** 2026-05-01  
**Propietario:** Platform Engineering  
**Estado:** Aprobado para ejecución incremental

---

## Tesis

> MCP permite que Isaak ejecute acciones conversacionales.  
> API propia permite que terceros construyan sobre Isaak.

> MCP demuestra ejecución. API demuestra plataforma.

---

## Arquitectura objetivo

```
┌─────────────────────────────────────────────────────────────┐
│                    CANALES / CLIENTES                       │
│  Claude · ChatGPT · Isaak UI · Partners · Asesorías        │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
   MCP JSON-RPC               REST API v1
   /api/mcp/isaak             /api/v1/*
        │                           │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │   Capa de servicios       │
        │   lib/isaak-platform/     │
        │   services/               │
        │   permissions/            │
        │   audit/                  │
        │   actions/                │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │   Core canónico           │
        │   apps/app/lib/*          │
        │   (invoice, AEAT, tenant, │
        │   session, email, etc.)   │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │   Infraestructura         │
        │   Prisma DB               │
        │   apps/api (SOAP/VeriFactu│
        │   /PDF)                   │
        └───────────────────────────┘
```

---

## Fase 0 — Auditoría y diseño (✅ Completado)

**Entregables:**

- `ISAAK_MCP_API_AUDIT_2026.md` — mapa de servicios existentes y riesgos
- `ISAAK_MCP_API_IMPLEMENTATION_PLAN_2026.md` — este documento
- `ISAAK_PLATFORM_API_V1_SPEC_2026.md` — especificación API v1
- `ISAAK_MCP_SERVER_SPEC_2026.md` — especificación MCP Isaak
- `ISAAK_PLATFORM_SECURITY_MODEL_2026.md` — modelo de seguridad
- `ISAAK_PLATFORM_INVESTOR_TECH_SUMMARY_2026.md` — resumen para inversores
- `openapi/isaak-platform-api-v1.yaml` — spec OpenAPI inicial

**Regla:** No implementar código hasta completar Fase 0.

---

## Fase 1 — Servicios compartidos mínimos

**Objetivo:** Crear la capa de servicios canónica que consumirán tanto la API v1 como el MCP.  
No migrar ni reescribir rutas existentes. Solo extraer.

### Archivos a crear

```
apps/app/lib/isaak-platform/
  services/
    companyService.ts      ← getCompanyContext(ctx), getCurrentTenant(ctx)
    invoiceService.ts      ← listInvoices, getInvoice, createDraft, issueInvoice
    verifactuService.ts    ← validateInvoice, submitInvoice, getStatus
    expenseService.ts      ← listExpenses, createExpense
    auditService.ts        ← logAction (nuevo servicio centralizado)
    actionService.ts       ← proposeAction, approveAction, executeAction
  permissions/
    checkPermission.ts     ← validateTenant + scope + plan
    scopes.ts              ← ISAAK_MCP_SCOPES, PLATFORM_API_SCOPES
  audit/
    auditLogger.ts         ← wrapper sobre auditService + requestId
  actions/
    confirmationTokens.ts  ← crear/validar tokens de confirmación
  api/
    middleware/
      requireApiToken.ts   ← Bearer → lookup IsaakPlatformKey → tenant
      requireScope.ts      ← assertScope(ctx, 'isaak.invoices.write')
      requestId.ts         ← x-verifactu-request-id
    response.ts            ← ok(), error() helpers
    errors.ts              ← PermissionDeniedError, MissingScopeError, etc.
  schemas/
    invoice.ts             ← zod schemas para Invoice API
    company.ts
    expense.ts
    action.ts
```

### Modelo de contexto común

```typescript
// apps/app/lib/isaak-platform/context.ts
export type IsaakExecutionContext = {
  tenantId: string;
  userId: string;
  authSubject?: string;
  channel: 'isaak' | 'api' | 'mcp' | 'chatgpt' | 'claude' | 'dashboard';
  scopes: string[];
  plan?: string;
  requestId: string;
  source: 'cookie' | 'oauth' | 'api_key';
};
```

### Errores tipados

```typescript
// apps/app/lib/isaak-platform/api/errors.ts
export class PermissionDeniedError extends Error { ... }
export class MissingScopeError extends Error { ... }
export class TenantNotFoundError extends Error { ... }
export class ValidationError extends Error { ... }
export class ConfirmationRequiredError extends Error { ... }
export class ExternalConnectorError extends Error { ... }
export class VerifactuSubmissionError extends Error { ... }
export class RateLimitError extends Error { ... }
```

### Modelos Prisma nuevos (Fase 1)

```prisma
model IsaakPlatformKey {
  id         String    @id @default(cuid())
  tenantId   String    @db.Uuid
  userId     String
  name       String
  keyHash    String    @unique
  keyPrefix  String                    // primeros 8 chars para display
  scopes     String[]
  rateLimit  Int       @default(1000)  // req/hora
  lastUsedAt DateTime?
  expiresAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  tenant     Tenant    @relation(...)
  auditLogs  IsaakApiAuditLog[]
  @@unique([tenantId, name])
  @@map("isaak_platform_keys")
}

model IsaakApiAuditLog {
  id            String   @id @default(cuid())
  requestId     String
  tenantId      String   @db.Uuid
  userId        String?
  keyId         String?
  channel       String   // 'api' | 'mcp' | 'dashboard' | 'chatgpt' | 'claude'
  method        String
  endpoint      String
  toolOrAction  String?
  status        Int
  durationMs    Int?
  riskLevel     String?  // 'low' | 'medium' | 'high'
  confirmationRequired Boolean @default(false)
  ip            String?
  meta          Json?
  createdAt     DateTime @default(now())
  @@index([tenantId, createdAt])
  @@map("isaak_api_audit_logs")
}

model IsaakWebhookEndpoint {
  id          String   @id @default(cuid())
  tenantId    String   @db.Uuid
  url         String
  secret      String
  events      String[]
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  @@map("isaak_webhook_endpoints")
}
```

---

## Fase 2 — API v1 privada (cookie-auth)

**Objetivo:** Endpoints REST versionados, auth por cookie, formato estándar, audit log.  
Sin API keys externas todavía.

### Ubicación: `apps/app/app/api/v1/`

```
app/api/v1/
  companies/
    route.ts              GET /api/v1/companies/current
  invoices/
    route.ts              GET (list) + POST (create draft)
    [id]/
      route.ts            GET (detail)
      validate/route.ts   POST → validate para AEAT
      issue/route.ts      POST → submit a AEAT (requiere confirmación)
      pdf/route.ts        GET → PDF
      verifactu-status/route.ts  GET → estado AEAT
  verifactu/
    events/route.ts       GET → historial de eventos AEAT
  actions/
    route.ts              GET (list) + POST (propose)
    [id]/
      route.ts            GET
      approve/route.ts    POST (requiere confirmationToken)
      execute/route.ts    POST (requiere confirmationToken)
      cancel/route.ts     POST
  audit/
    events/route.ts       GET → audit log del tenant
```

### Formato de respuesta estándar

```typescript
// Éxito
{
  "ok": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "tenantId": "uuid",
    "environment": "live",
    "timestamp": "2026-05-01T12:00:00Z"
  }
}

// Error
{
  "ok": false,
  "error": {
    "code": "permission_denied",
    "message": "No tienes permiso para emitir facturas.",
    "stage": "authorization",
    "reason": "missing_scope"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

## Fase 3 — Isaak MCP Server

**Objetivo:** Endpoint MCP propio, herramientas nativas Isaak, separado de Holded MCP.

### Ubicación: `apps/app/app/api/mcp/isaak/route.ts`

### Well-known resource metadata

```
apps/app/app/.well-known/oauth-protected-resource/api/mcp/isaak/route.ts
```

### Tools (8 tools Fase 3)

| Tool                               | Tipo        | Scope                      | Confirmación |
| ---------------------------------- | ----------- | -------------------------- | ------------ |
| `isaak_get_company_context`        | Lectura     | `isaak.company.read`       | No           |
| `isaak_list_invoices`              | Lectura     | `isaak.invoices.read`      | No           |
| `isaak_get_invoice`                | Lectura     | `isaak.invoices.read`      | No           |
| `isaak_get_verifactu_status`       | Lectura     | `isaak.invoices.read`      | No           |
| `isaak_get_fiscal_summary`         | Lectura     | `isaak.fiscal.read`        | No           |
| `isaak_create_invoice_draft`       | Escritura   | `isaak.invoices.write`     | No           |
| `isaak_validate_verifactu_invoice` | Preparación | `isaak.verifactu.validate` | No           |
| `isaak_issue_verifactu_invoice`    | Ejecución   | `isaak.verifactu.submit`   | **Sí**       |
| `isaak_propose_action`             | Escritura   | `isaak.actions.propose`    | No           |
| `isaak_execute_action`             | Ejecución   | `isaak.actions.execute`    | **Sí**       |

---

## Fase 4 — API partner beta

**Objetivo:** API keys externas, scopes, sandbox, rate limits, webhooks básicos.

### Modelo API key

```
Formato:    isk_live_[32-bytes-base64url]
           isk_test_[32-bytes-base64url]
Almacén:   SHA256 hash en IsaakPlatformKey
Display:   prefix: isk_live_xxxx...
```

### Scopes API (vs MCP)

```
company.read           → isaak.company.read
invoices.read          → isaak.invoices.read
invoices.write         → isaak.invoices.write
invoices.issue         → isaak.verifactu.submit
verifactu.validate     → isaak.verifactu.validate
verifactu.submit       → isaak.verifactu.submit
actions.read           → isaak.actions.read
actions.propose        → isaak.actions.propose
actions.execute        → isaak.actions.execute
audit.read             → isaak.audit.read
webhooks.write         → isaak.webhooks.write
```

---

## Fase 5 — Public developer portal

**Solo cuando exista:**

- Uso interno estable (Fase 1-4 completadas)
- Partners beta con feedback
- Tests de integración completos
- Seguridad auditada
- Documentación completa
- Pricing/API limits definidos

---

## Restricciones transversales

1. **No tocar Holded MCP** ni sus scopes en ninguna fase
2. **No exponer API keys** de Holded ni tokens OAuth al cliente
3. **Confirmación obligatoria** para toda acción VeriFactu/AEAT (irreversible)
4. **No cruzar datos** entre tenants en ningún endpoint
5. **Closed-world por defecto** en el MCP: sin acceso web abierto, sin URLs arbitrarias
6. **requestId** en todas las respuestas API y MCP

---

## Criterios de aceptación final

- [ ] Documentación Fase 0 completa
- [ ] Capa `lib/isaak-platform/` con servicios mínimos
- [ ] `GET /api/v1/companies/current` funcional
- [ ] `GET /api/v1/invoices` funcional
- [ ] `POST /api/v1/invoices/[id]/issue` con confirmación
- [ ] `GET /api/v1/audit/events` funcional
- [ ] `/api/mcp/isaak` con 8 tools, separado de Holded MCP
- [ ] Tools mutativas requieren `confirmationToken`
- [ ] Audit log en cada acción sensible
- [ ] No secretos expuestos
- [ ] TypeScript check limpio
- [ ] Tests principales pasan
- [ ] MCP Holded sigue funcionando sin cambios
