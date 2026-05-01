# Isaak MCP Server + Platform API — Auditoría de Servicios Existentes

**Fecha:** 2026-05-01  
**Autor:** Platform Engineering (asistido por Claude)  
**Alcance:** Monorepo `kiabusiness2025/verifactu-monorepo`  
**Estado:** Fase 0 — Solo auditoría, sin implementación

---

## 1. Objetivo de esta auditoría

Mapear todo lo que ya existe antes de diseñar e implementar:

- **Isaak MCP Server** (`/api/mcp/isaak`)
- **Isaak Platform API v1** (`/api/v1/*`)
- **Capa de servicios compartidos** (`lib/isaak-platform/`)

Sin este mapa, el riesgo de duplicar lógica crítica (facturación, VeriFactu, AEAT, permisos) es alto y caro.

---

## 2. Mapa de aplicaciones del monorepo

| App               | Stack          | Puerto | Rol                                                                    |
| ----------------- | -------------- | ------ | ---------------------------------------------------------------------- |
| `apps/app`        | Next.js 15     | 3000   | Core canónico: facturación, OAuth, MCP Holded, AEAT, integraciones     |
| `apps/api`        | Express + Node | 3001   | Microservicio: VeriFactu SOAP/AEAT, generación PDF, QR, hash VeriFactu |
| `apps/admin`      | Next.js        | —      | Panel de administración: tenants, billing, soporte                     |
| `apps/isaak`      | Next.js        | 3012   | Producto conversacional: chat Holded, facturación, settings            |
| `apps/holded`     | Next.js        | —      | Hub conector: landing Holded, onboarding ChatGPT                       |
| `apps/holded-mcp` | Express+TS     | —      | Servidor MCP standalone para Holded (alternativa a ruta de apps/app)   |
| `apps/client`     | Next.js        | —      | Portal de clientes externos                                            |
| `apps/landing`    | Next.js        | —      | Marketing site                                                         |

### ¿Existe `claude-mcp` o `isaak-mcp`?

**No.** No existe ninguna app `apps/claude-mcp` ni `apps/isaak-mcp` en el monorepo a fecha de esta auditoría. El MCP de Holded vive en:

- `apps/app/app/api/mcp/holded/route.ts` — ruta Next.js con OAuth
- `apps/holded-mcp/` — servidor MCP Express standalone (alternativa para deployment)

---

## 3. Servicios existentes a reutilizar

### 3.1 Facturación

**Rutas existentes en `apps/app`:**

```
app/api/invoices/route.ts              GET (list) + POST (create)
app/api/invoices/[id]/route.ts         GET (detail) + DELETE
app/api/invoices/[id]/issue/route.ts   POST → registro AEAT + VeriFactu
app/api/invoices/[id]/mark-paid/route.ts
app/api/invoices/[id]/pdf/route.ts     GET → genera PDF vía apps/api
app/api/invoices/[id]/send/route.ts    POST → envío email
```

**Rutas quotes:**

```
app/api/quotes/route.ts                GET + POST
app/api/quotes/[id]/route.ts
app/api/quotes/[id]/accept/route.ts
app/api/quotes/[id]/convert-to-invoice/route.ts
app/api/quotes/[id]/reject/route.ts
app/api/quotes/[id]/send/route.ts
```

**Patron de datos:** Uso directo de Prisma en rutas. Solo `quotes` tiene un repo helper (`apps/app/lib/quotes/repo.ts`).

**CRÍTICO:** La API v1 debe reutilizar esta lógica, no replicarla. El path correcto es:

1. Extraer servicios de las rutas actuales → `apps/app/lib/isaak-platform/services/invoiceService.ts`
2. Las rutas actuales y la API v1 consumen el mismo servicio

### 3.2 VeriFactu + AEAT

**Lógica de VeriFactu split entre dos apps:**

En `apps/api` (Express, Node.js):

```
verifactu-generator.js  → calculateInvoiceHash(), generateInvoiceQR()
soap-client.js          → registerInvoice() via SOAP AEAT
invoice-pdf.js          → buildInvoicePdfBuffer() con PDFKit
```

En `apps/app` (Next.js):

```
app/api/invoices/[id]/issue/route.ts  → orquesta el flow completo
lib/aeat/books.ts                     → cálculos libros IVA (303, 130)
lib/aeat/period.ts                    → periodos tributarios
lib/aeat/response.ts                  → formateo respuestas AEAT
app/api/aeat/books/sales/             → libro registro ventas
app/api/aeat/books/purchases/         → libro registro compras
app/api/aeat/export/130/              → exportación Modelo 130
app/api/aeat/export/303/              → exportación Modelo 303
app/api/aeat/preview/130/             → preview Modelo 130
app/api/aeat/preview/303/             → preview Modelo 303
```

**RIESGO:** Lógica VeriFactu distribuida entre apps/api (SOAP, hash, QR, PDF) y apps/app (orquestación). La API v1 debe unificar esta orquestación sin duplicar la lógica de bajo nivel.

### 3.3 Generación PDF + QR

**Ubicación:** `apps/api/invoice-pdf.js` + `apps/api/verifactu-generator.js`

- PDFKit para generación de PDF
- QR con base64 embedding
- Accesible vía `/api/invoices/:id/pdf` en apps/api (Express)
- También accesible vía `/api/invoices/[id]/pdf` en apps/app (Next.js, proxea a apps/api)

**Para la API v1:** No replicar. Usar el endpoint de apps/api o extraer a `packages/verifactu-core`.

### 3.4 Tenant + Autenticación + Sesión

**Helpers canónicos en `apps/app`:**

```typescript
// apps/app/lib/api/tenantAuth.ts
requireTenantContext(options?)
→ { tenantId, tenant, supportMode, supportSessionId }
→ Soporta: 'dashboard' | 'chatgpt' | 'internal'

// apps/app/lib/session.ts
getSessionPayload()   → Lee __session cookie → payload JWT
requireUserId()       → Lanza si no hay user

// apps/app/src/server/tenant/resolveActiveTenant.ts
resolveActiveTenant({ userId, sessionTenantId })
→ { tenantId, tenant, supportMode, supportSessionId }
```

**CRÍTICO:** La API v1 DEBE usar `requireTenantContext()` como base auth para el modo cookie. Para Bearer/API keys, crear middleware nuevo que llame a la misma resolución de tenant.

### 3.5 MCP Holded (infraestructura OAuth)

**`apps/app/lib/oauth/mcp.ts`** — 1100+ líneas, sirve de base completa:

```typescript
// Token management
verifyAccessToken(token)       → Verifica JWT MCP access token
mintAccessToken(input)         → Crea token 1h
mintAuthorizationCode(input)   → Crea código OAuth 5m
consumeAuthorizationCode()     → Marca código como usado

// URLs + metadata
getMcpResourceUrl()            → URL del recurso MCP (Holded)
getProtectedResourceMetadata() → Well-known metadata Holded
getAuthorizationEndpoint()     → /oauth/authorize
getTokenEndpoint()             → /oauth/token

// CORS + Scope
applyOpenAiCorsHeaders()       → CORS para ChatGPT
ensureScopesAllowed()          → Validación de scopes
normalizeScope()               → Parsing de scope strings
hasRequiredScopes()            → Check de scopes
getSupportedScopes()           → Lista de scopes Holded soportados
```

**Para Isaak MCP:** Crear `apps/app/lib/oauth/isaakMcp.ts` que:

- Reutilice `verifyAccessToken()` (genérico, no Holded-specific)
- Defina `ISAAK_MCP_RESOURCE_PATH = '/api/mcp/isaak'`
- Defina `getIsaakProtectedResourceMetadata()` propio
- Use los mismos authorize/token endpoints pero con `resource` diferente

### 3.6 Integración Holded (MCP tools)

**`apps/app/lib/integrations/holdedMcpTools.ts`** — 91 tools definidas:

- Invoicing, Documents, Contacts, Accounting, CRM, Projects, Treasury, Expenses, Products, Employees...
- Cada tool tiene `name`, `description`, `inputSchema`, `annotations`

**`apps/app/lib/integrations/holdedMcpScopes.ts`** — 35 scopes + 6 presets

**CRÍTICO:** El MCP de Isaak NO debe ser un wrapper del MCP de Holded. Operan en dominios distintos:

- **Holded MCP** → proxy a Holded API, 91 tools, datos externos
- **Isaak MCP** → datos propios (Prisma), 8-12 tools, lógica de negocio interna

### 3.7 Sync + Auditoría

**`apps/app/lib/integrations/accountingStore.ts`** — Patrón sync outbox:

```typescript
createSyncOutbox(args) → Cola un item para sync con Holded
```

**Estado actual de auditoría:**

- No existe tabla/servicio central de audit log todavía
- El logging está embebido en servicios individuales (holdedGovernanceService, route handlers)
- Action `"INVOICE.DELETE"` se loggea en la ruta de facturas

**Para la API v1:** Crear `IsaakApiAuditLog` como modelo Prisma central.

### 3.8 Expenses

**Rutas existentes:**

```
app/api/expenses/[id]/route.ts
app/api/expenses/[id]/confirm/route.ts
app/api/expenses/[id]/isaak-suggest/route.ts
app/api/expenses/intake/route.ts
app/api/banks/movements/[id]/create-expense/route.ts
```

**Libs:**

```
apps/app/lib/expenses/canonical.ts  → Forma canónica de gasto
apps/app/lib/expenses/classify.ts   → Clasificación IA
```

### 3.9 Packages compartidos

```
packages/auth/         → @verifactu/auth: authOptions, requireAuth, signSessionToken, verifySessionToken
packages/db/           → Schema Prisma, migraciones
packages/integrations/ → Integraciones externas
packages/utils/        → getAppUrl, getLandingUrl, signSessionToken, verifySessionToken
packages/ui/           → Componentes UI compartidos
```

---

## 4. Mapa de duplicaciones + riesgos

| Área                   | Riesgo   | Descripción                                                                                            |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| Lógica VeriFactu       | 🔴 ALTO  | Split entre apps/api (hash/QR/SOAP) y apps/app (orquestación). Difícil de testear de forma unitaria.   |
| Invoice endpoints      | 🟠 MEDIO | Si API v1 replica rutas en vez de reutilizar, habrá divergencia de lógica.                             |
| Tenant resolution      | 🟠 MEDIO | Cada app (isaak, holded, app) tiene su propia sesión. Necesita unificación vía `requireTenantContext`. |
| Audit log              | 🟠 MEDIO | Embebido en servicios individuales. Sin centralización, el audit de la API v1 será inconsistente.      |
| MCP scopes             | 🟡 BAJO  | Si se mezclan scopes de Holded MCP con Isaak MCP, el authorize endpoint se complica.                   |
| PDF/QR                 | 🟡 BAJO  | apps/api ya tiene la lógica. Riesgo de duplicarla en apps/app para la API v1.                          |
| Holded MCP + Isaak MCP | 🟡 BAJO  | Tanto holded-mcp como apps/app/api/mcp/holded hacen lo mismo. Dos implementaciones del mismo conector. |

---

## 5. Lo que NO se debe tocar

### Congelado por revisión externa (OpenAI/Anthropic):

```
apps/app/app/.well-known/oauth-authorization-server/route.ts
apps/app/app/.well-known/oauth-protected-resource/route.ts
apps/app/app/.well-known/oauth-protected-resource/api/mcp/holded/route.ts
apps/app/app/.well-known/openai-apps-challenge/route.ts
apps/app/app/oauth/authorize/route.ts       → contrato OAuth con ChatGPT
apps/app/app/oauth/token/route.ts           → PKCE token exchange
apps/app/app/oauth/register/route.ts
apps/app/app/oauth/userinfo/route.ts
apps/app/app/api/mcp/holded/route.ts        → MCP Holded activo en producción
apps/app/lib/oauth/mcp.ts                   → NO modificar lógica existente (additive only)
apps/app/lib/integrations/holdedMcpScopes.ts → NO cambiar scopes ya en revisión
```

### Preset protegido:

```
openai_review_v2   → Preset de scopes enviado a OpenAI para revisión
```

---

## 6. Lo que SÍ se puede reutilizar

| Servicio                   | Ubicación                             | Cómo reutilizar                           |
| -------------------------- | ------------------------------------- | ----------------------------------------- |
| `requireTenantContext()`   | apps/app/lib/api/tenantAuth.ts        | Middleware base para API v1 (modo cookie) |
| `verifyAccessToken()`      | apps/app/lib/oauth/mcp.ts             | Verificación JWT para Isaak MCP           |
| `applyOpenAiCorsHeaders()` | apps/app/lib/oauth/mcp.ts             | CORS para clientes IA                     |
| `getSessionPayload()`      | apps/app/lib/session.ts               | Resolución de sesión en rutas Next.js     |
| `resolveActiveTenant()`    | apps/app/src/server/tenant/           | Resolución canónica de tenant             |
| `emailService`             | apps/app/lib/email/emailService.ts    | Notificaciones de API v1                  |
| `aeat/*` libs              | apps/app/lib/aeat/                    | Cálculos de libros fiscales               |
| `getFiscalDeadlines()`     | apps/isaak/app/lib/fiscal-calendar.ts | Vencimientos fiscales (ya implementado)   |
| `buildInvoicePdfBuffer()`  | apps/api/invoice-pdf.js               | PDF generation                            |
| `calculateInvoiceHash()`   | apps/api/verifactu-generator.js       | Hash VeriFactu                            |

---

## 7. Lo que debe extraerse (futuros servicios compartidos)

Actualmente embebido en rutas de apps/app; debe moverse a `lib/isaak-platform/services/`:

| Servicio propuesto    | Lógica actual en                                                    |
| --------------------- | ------------------------------------------------------------------- |
| `invoiceService.ts`   | `app/api/invoices/route.ts`, `app/api/invoices/[id]/issue/route.ts` |
| `verifactuService.ts` | `app/api/invoices/[id]/issue/route.ts` + apps/api                   |
| `companyService.ts`   | `app/api/tenants/route.ts`, `app/api/app/me/route.ts`               |
| `expenseService.ts`   | `app/api/expenses/*`, `lib/expenses/canonical.ts`                   |
| `auditService.ts`     | Nuevo — no existe todavía                                           |
| `actionService.ts`    | Nuevo — no existe todavía                                           |

---

## 8. Propuesta de carpetas (incremental)

### Primera opción: dentro de apps/app (sin nuevos packages)

```
apps/app/lib/isaak-platform/
  services/
    companyService.ts
    invoiceService.ts
    verifactuService.ts
    expenseService.ts
    auditService.ts
    actionService.ts
  permissions/
    checkPermission.ts
    scopes.ts
  audit/
    auditLogger.ts
  actions/
    confirmationTokens.ts
  mcp/
    isaakMcpTools.ts
    isaakMcpScopes.ts
    isaakMcpRegistry.ts
    isaakMcpAnnotations.ts
  api/
    middleware/
      requireApiToken.ts
      requireScope.ts
      requestId.ts
    response.ts        ← formato estándar { ok, data, meta }
    errors.ts          ← errores tipados
  schemas/
    invoice.ts
    company.ts
    expense.ts
    action.ts
```

### Segunda opción: packages dedicados (largo plazo)

```
packages/
  verifactu-core/
    invoices/ aeat/ qr/ pdf/ validation/ numbering/ errors/
  isaak-platform/
    actions/ permissions/ audit/ schemas/ scopes/ rate-limit/ openapi/ webhooks/
  isaak-tools/
    mcp/ registry/ annotations/ confirmations/
```

**Decisión para Fase 1:** Usar `apps/app/lib/isaak-platform/` con estructura documentada. Migrar a packages cuando haya estabilidad de interfaz (Fase 4+).

---

## 9. Propuesta de fases

| Fase | Entregable                                                                                                                             | Estado        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 0    | Auditoría + documentación (este documento)                                                                                             | ✅ Completado |
| 1    | Servicios compartidos mínimos (`companyService`, `invoiceService`, `verifactuService`, `auditService`, `permissions`, errores comunes) | Pendiente     |
| 2    | API v1 privada (cookie-auth, endpoints mínimos: companies, invoices CRUD+issue, verifactu-status, audit)                               | Pendiente     |
| 3    | Isaak MCP Server (`/api/mcp/isaak`, 8 tools, OAuth+shared_secret, confirmaciones)                                                      | Pendiente     |
| 4    | API partner beta (Platform API keys, scopes, sandbox, rate limits, OpenAPI pública)                                                    | Pendiente     |
| 5    | Public developer portal (cuando haya partners beta + seguridad validada)                                                               | Futuro        |

---

## 10. Riesgos pendientes

### Seguridad

- No implementar API keys externas sin hash, expiry, rate-limit y audit
- Datos fiscales no deben cruzar entre tenants en ningún endpoint
- Confirmación obligatoria para acciones mutativas en VeriFactu (son irreversibles ante AEAT)

### OpenAI/Anthropic

- No ensanchar `/api/mcp/holded` ni sus scopes sin volver a enviar a revisión
- El Isaak MCP debe ser un recurso OAuth separado (`resource` diferente)

### Legal + Fiscal

- Facturas emitidas a AEAT no son reversibles; el servicio `isaak_issue_verifactu_invoice` debe tener doble confirmación
- Datos de terceros (Holded) no deben exponerse en la API v1 sin resolver el contrato de datos

### Producción

- apps/api (VeriFactu SOAP) tiene certificado AEAT con ruta absoluta en Windows (`C:/dev/...`). Verificar path en producción antes de llamar a verifactuService desde API v1
- Prisma Accelerate activo en producción; si API v1 lo usa, respetar limits de conexiones

---

## 11. Próximos PRs propuestos

1. **PR-Fase1:** `lib/isaak-platform/` foundation — servicios, permisos, audit, errores
2. **PR-Fase2:** `/api/v1/` routes — companies, invoices, verifactu-status, audit
3. **PR-Fase3:** `/api/mcp/isaak/` + `/.well-known/oauth-protected-resource/api/mcp/isaak/`
4. **PR-Fase4:** Platform API keys (IsaakPlatformKey Prisma model, Bearer auth middleware)

---

_Documento generado: 2026-05-01. Actualizar al iniciar cada fase._
