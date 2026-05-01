# Isaak MCP Server — Especificación Técnica v1

**Fecha:** 2026-05-01  
**Versión:** 1.0-draft  
**Estado:** Diseño aprobado, pendiente implementación (Fase 3)

---

## 1. Identidad y separación

El **Isaak MCP Server** es un servidor MCP independiente del **Holded MCP Server**:

| Atributo       | Holded MCP                                 | Isaak MCP                              |
| -------------- | ------------------------------------------ | -------------------------------------- |
| Endpoint       | `/api/mcp/holded`                          | `/api/mcp/isaak`                       |
| Resource OAuth | `holded.verifactu.business/api/mcp/holded` | `app.verifactu.business/api/mcp/isaak` |
| Metadata       | `/.well-known/.../api/mcp/holded`          | `/.well-known/.../api/mcp/isaak`       |
| Datos          | Proxy a Holded API                         | Datos propios Prisma                   |
| Tools          | 91 tools Holded                            | 8-12 tools Isaak                       |
| Scopes         | `holded.*`                                 | `isaak.*`                              |
| Propósito      | Conector específico Holded                 | Servidor del producto Isaak            |

**El MCP de Isaak NO es un wrapper del MCP de Holded.**

---

## 2. Endpoint

```
Ubicación:  apps/app/app/api/mcp/isaak/route.ts
URL pública: https://app.verifactu.business/api/mcp/isaak
Protocolo:  JSON-RPC 2.0 (MCP spec)
Métodos:    GET (descriptor) + POST (RPC) + OPTIONS (CORS)
```

---

## 3. Autenticación

### Modo 1: OAuth (para Claude, ChatGPT u otros agentes IA)

Flujo estándar OAuth 2.0 con PKCE:

```
1. Cliente → GET /.well-known/oauth-protected-resource/api/mcp/isaak
2. Obtiene: authorization_server, scopes_supported
3. Cliente → GET /oauth/authorize?resource=...&scope=isaak.invoices.read&...
4. Usuario autentica y aprueba scopes
5. Cliente → POST /oauth/token (PKCE code exchange)
6. Recibe: access_token (JWT, 1h TTL)
7. Cliente → POST /api/mcp/isaak con Authorization: Bearer {token}
```

Token JWT payload:

```json
{
  "type": "mcp_access_token",
  "resource": "https://app.verifactu.business/api/mcp/isaak",
  "scope": "isaak.invoices.read isaak.company.read",
  "tenantId": "uuid",
  "uid": "firebase-uid",
  "email": "user@example.com"
}
```

### Modo 2: Shared Secret (para uso interno / Isaak UI)

```
Authorization: Bearer {ISAAK_MCP_SHARED_SECRET}
→ Acceso con scopes completos del tenant de sesión
```

### Sin token (público)

`initialize` y `tools/list` son métodos públicos (sin token).

---

## 4. Well-known resource metadata

**Ruta:** `/.well-known/oauth-protected-resource/api/mcp/isaak`

```json
{
  "resource": "https://app.verifactu.business/api/mcp/isaak",
  "authorization_servers": ["https://app.verifactu.business"],
  "bearer_methods_supported": ["header"],
  "scopes_supported": [
    "mcp.read",
    "isaak.company.read",
    "isaak.invoices.read",
    "isaak.invoices.write",
    "isaak.verifactu.validate",
    "isaak.verifactu.submit",
    "isaak.fiscal.read",
    "isaak.actions.propose",
    "isaak.actions.execute",
    "isaak.audit.read"
  ]
}
```

---

## 5. Respuesta 401 (WWW-Authenticate)

```
HTTP 401
WWW-Authenticate: Bearer
  resource_metadata="https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/isaak",
  authorization_uri="https://app.verifactu.business/oauth/authorize",
  resource="https://app.verifactu.business/api/mcp/isaak"
```

---

## 6. Métodos MCP soportados

| Método                      | Auth                   | Descripción                                    |
| --------------------------- | ---------------------- | ---------------------------------------------- |
| `initialize`                | No                     | Descriptor del servidor                        |
| `notifications/initialized` | No                     | ACK del cliente                                |
| `tools/list`                | No (filtered by scope) | Lista tools disponibles según scopes del token |
| `tools/call`                | Sí                     | Ejecuta una tool                               |

### Respuesta `initialize`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": {
      "name": "Isaak MCP Server",
      "version": "1.0.0",
      "description": "MCP server del producto Isaak para facturación Verifactu, análisis empresarial y gestión fiscal. Datos en tiempo real del tenant autenticado."
    }
  }
}
```

---

## 7. Tools — Catálogo Fase 1

### Principios de diseño

- **Prefijo `isaak_`** en todas las tools (sin excepción)
- **Closed-world:** Sin acceso web abierto, sin URLs arbitrarias, sin cruce de tenants
- **Confirmación obligatoria** para acciones irreversibles (VeriFactu, AEAT)
- **Annotations** completas en cada tool: `readOnlyHint`, `destructiveHint`, `requiresConfirmation`, `riskLevel`

### 7.1 Lectura (no require confirmación)

#### `isaak_get_company_context`

```typescript
{
  name: "isaak_get_company_context",
  title: "Obtener contexto de la empresa",
  description: "Retorna nombre, NIF, plan, conexiones activas y KPIs básicos del tenant autenticado.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    requiresConfirmation: false,
    riskLevel: "low",
    scopes: ["isaak.company.read"]
  },
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
}
```

**Output:** `{ name, nif, plan, holdedConnected, currentMonthSales, currentMonthExpenses, pendingCollections }`

---

#### `isaak_list_invoices`

```typescript
{
  name: "isaak_list_invoices",
  title: "Listar facturas",
  description: "Lista facturas emitidas del tenant. Filtra por estado, rango de fechas o cliente.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    requiresConfirmation: false,
    riskLevel: "low",
    scopes: ["isaak.invoices.read"]
  },
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["draft", "issued", "paid", "all"], description: "Estado de la factura" },
      limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      offset: { type: "integer", minimum: 0, default: 0 },
      dateFrom: { type: "string", description: "Fecha inicio YYYY-MM-DD" },
      dateTo: { type: "string", description: "Fecha fin YYYY-MM-DD" },
      customerName: { type: "string", description: "Filtro por nombre de cliente" }
    }
  }
}
```

---

#### `isaak_get_invoice`

```typescript
{
  name: "isaak_get_invoice",
  description: "Obtiene el detalle completo de una factura incluyendo estado VeriFactu.",
  annotations: { readOnlyHint: true, riskLevel: "low", scopes: ["isaak.invoices.read"] },
  inputSchema: {
    type: "object",
    properties: {
      invoiceId: { type: "string", description: "ID interno de la factura" }
    },
    required: ["invoiceId"]
  }
}
```

---

#### `isaak_get_verifactu_status`

```typescript
{
  name: "isaak_get_verifactu_status",
  title: "Estado VeriFactu AEAT",
  description: "Resumen del estado de facturas en VeriFactu: emitidas, borradores, errores, último hash.",
  annotations: { readOnlyHint: true, riskLevel: "low", scopes: ["isaak.invoices.read"] },
  inputSchema: { type: "object", properties: {} }
}
```

---

#### `isaak_get_fiscal_summary`

```typescript
{
  name: "isaak_get_fiscal_summary",
  title: "Resumen fiscal y vencimientos",
  description: "Próximos vencimientos fiscales (IVA, IRPF, IS), estimación IVA trimestral y estado de modelos.",
  annotations: { readOnlyHint: true, riskLevel: "low", scopes: ["isaak.fiscal.read"] },
  inputSchema: {
    type: "object",
    properties: {
      daysAhead: { type: "integer", default: 90, description: "Horizonte en días para vencimientos" }
    }
  }
}
```

---

### 7.2 Preparación (escritura, sin confirmación)

#### `isaak_create_invoice_draft`

```typescript
{
  name: "isaak_create_invoice_draft",
  title: "Crear borrador de factura",
  description: "Crea un borrador de factura en el sistema. No la emite a AEAT. Requiere confirmación explícita para emitir.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    requiresConfirmation: false,
    riskLevel: "low",
    scopes: ["isaak.invoices.write"]
  },
  inputSchema: {
    type: "object",
    properties: {
      customerName: { type: "string" },
      customerNif: { type: "string" },
      description: { type: "string" },
      amountNet: { type: "number" },
      taxRate: { type: "number", description: "0.21 para 21%, 0.10 para 10%, etc." },
      issueDate: { type: "string", description: "YYYY-MM-DD" }
    },
    required: ["customerName", "description", "amountNet", "taxRate"]
  }
}
```

---

#### `isaak_validate_verifactu_invoice`

```typescript
{
  name: "isaak_validate_verifactu_invoice",
  title: "Validar factura para VeriFactu",
  description: "Valida los datos de una factura borrador antes de enviarla a AEAT. No envía nada. Devuelve errores de validación.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    requiresConfirmation: false,
    riskLevel: "low",
    scopes: ["isaak.verifactu.validate"]
  },
  inputSchema: {
    type: "object",
    properties: {
      invoiceId: { type: "string" }
    },
    required: ["invoiceId"]
  }
}
```

---

#### `isaak_propose_action`

```typescript
{
  name: "isaak_propose_action",
  title: "Proponer acción empresarial",
  description: "Crea una propuesta de acción (emitir factura, registrar gasto, etc.) para revisión y aprobación del usuario.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    requiresConfirmation: false,
    riskLevel: "medium",
    scopes: ["isaak.actions.propose"]
  },
  inputSchema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["issue_invoice", "register_expense", "create_contact"] },
      summary: { type: "string" },
      payload: { type: "object" }
    },
    required: ["type", "summary", "payload"]
  }
}
```

---

### 7.3 Ejecución controlada (requiere confirmación)

#### `isaak_issue_verifactu_invoice` — ⚠️ REQUIERE CONFIRMACIÓN

```typescript
{
  name: "isaak_issue_verifactu_invoice",
  title: "Emitir factura a VeriFactu (AEAT)",
  description: "Registra la factura ante AEAT mediante VeriFactu. ACCIÓN IRREVERSIBLE. Requiere confirmación explícita. Primer call: devuelve preview + confirmationToken. Segundo call con confirm=true + confirmationToken: ejecuta el registro.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    requiresConfirmation: true,
    riskLevel: "high",
    scopes: ["isaak.verifactu.submit"]
  },
  inputSchema: {
    type: "object",
    properties: {
      invoiceId: { type: "string" },
      confirm: { type: "boolean", default: false },
      confirmationToken: { type: "string" }
    },
    required: ["invoiceId"]
  }
}
```

**Flujo de dos pasos:**

```
// Paso 1: confirm=false (por defecto)
→ { preview: { invoiceNumber, customerName, amountTotal, hash },
    confirmationToken: "tok_xxx",
    warning: "Esta acción registrará la factura FAC-2026-0042 ante la AEAT. Es irreversible." }

// Paso 2: confirm=true + confirmationToken="tok_xxx"
→ { issued: true, verifactuHash: "sha256:...", aeatStatus: "accepted" }
```

---

#### `isaak_execute_action` — ⚠️ REQUIERE CONFIRMACIÓN

```typescript
{
  name: "isaak_execute_action",
  title: "Ejecutar acción aprobada",
  description: "Ejecuta una acción previamente propuesta y aprobada. Requiere confirmationToken válido.",
  annotations: {
    requiresConfirmation: true,
    riskLevel: "high",
    scopes: ["isaak.actions.execute"]
  },
  inputSchema: {
    type: "object",
    properties: {
      actionId: { type: "string" },
      confirmationToken: { type: "string" }
    },
    required: ["actionId", "confirmationToken"]
  }
}
```

---

## 8. Scopes MCP

```typescript
export const ISAAK_MCP_SUPPORTED_SCOPES = [
  'openid',
  'email',
  'profile',
  'mcp.read',
  'isaak.company.read',
  'isaak.invoices.read',
  'isaak.invoices.write',
  'isaak.verifactu.validate',
  'isaak.verifactu.submit',
  'isaak.fiscal.read',
  'isaak.actions.propose',
  'isaak.actions.execute',
  'isaak.actions.read',
  'isaak.audit.read',
] as const;

export const ISAAK_MCP_TOOL_SCOPES: Record<string, string[]> = {
  isaak_get_company_context: ['isaak.company.read'],
  isaak_list_invoices: ['isaak.invoices.read'],
  isaak_get_invoice: ['isaak.invoices.read'],
  isaak_get_verifactu_status: ['isaak.invoices.read'],
  isaak_get_fiscal_summary: ['isaak.fiscal.read'],
  isaak_create_invoice_draft: ['isaak.invoices.write'],
  isaak_validate_verifactu_invoice: ['isaak.verifactu.validate'],
  isaak_issue_verifactu_invoice: ['isaak.verifactu.submit'],
  isaak_propose_action: ['isaak.actions.propose'],
  isaak_execute_action: ['isaak.actions.execute'],
};
```

---

## 9. Audit log por tool

Todas las tools mutativas (`destructiveHint: false` pero `readOnlyHint: false` o `requiresConfirmation: true`) deben crear un `IsaakApiAuditLog`:

```typescript
await auditLogger.log({
  requestId,
  tenantId,
  userId,
  channel: 'mcp',
  endpoint: '/api/mcp/isaak',
  toolOrAction: 'isaak_issue_verifactu_invoice',
  status: 200,
  riskLevel: 'high',
  confirmationRequired: true,
  meta: { invoiceId, confirmationToken: tokenHash },
});
```

---

## 10. Estructura de archivos

```
apps/app/
  app/
    api/
      mcp/
        isaak/
          route.ts                          ← Endpoint MCP Isaak
    .well-known/
      oauth-protected-resource/
        api/
          mcp/
            isaak/
              route.ts                      ← Resource metadata Isaak MCP
  lib/
    oauth/
      isaakMcp.ts                           ← Auth utilities (NO modificar mcp.ts)
    isaak-platform/
      mcp/
        isaakMcpTools.ts                    ← Definiciones de tools
        isaakMcpScopes.ts                   ← Scopes + mapping tool→scope
        isaakMcpRegistry.ts                 ← Registro de tools
        isaakMcpAnnotations.ts              ← Anotaciones y helpers
```

---

## 11. Restricciones de seguridad

1. **Un tenant por token:** El MCP no puede operar sobre otro tenant
2. **Closed-world:** Sin llamadas a URLs externas arbitrarias
3. **Sin Holded API key expuesta:** Si el tenant tiene Holded conectado, usarlo internamente (nunca exponer la key al cliente MCP)
4. **Sin datos de producción en test:** Modo test/sandbox separado
5. **TTL corto en confirmationTokens:** 5 minutos máximo, uso único
6. **requestId en toda respuesta:** Para traceabilidad

---

## 12. Tests requeridos (Fase 3)

```typescript
// app/api/mcp/isaak/route.test.ts

describe('Isaak MCP Server', () => {
  test('GET → returns server descriptor');
  test('initialize → returns protocolVersion + serverInfo');
  test('tools/list sin token → devuelve tools de scope público');
  test('tools/list con token → filtra por scopes del token');
  test('tools/call sin token → 401 con WWW-Authenticate');
  test('tools/call con scope incorrecto → error "Missing required scope"');
  test('isaak_get_company_context → devuelve datos del tenant');
  test('isaak_list_invoices → lista correctamente');
  test('isaak_issue_verifactu_invoice sin confirm → devuelve preview + confirmationToken');
  test('isaak_issue_verifactu_invoice con confirm válido → emite');
  test('isaak_issue_verifactu_invoice con confirmToken expirado → error');
  test('audit log creado para tool mutativa');
  test('datos de otro tenant no accesibles');
  test('MCP Holded no afectado por cambios en Isaak MCP');
});
```
