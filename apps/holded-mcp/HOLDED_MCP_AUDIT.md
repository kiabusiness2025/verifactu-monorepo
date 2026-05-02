# Holded MCP — Auditoría de cobertura y bugs

Fecha: 2026-05-01
Alcance auditado: `apps/holded-mcp/src/**` y `apps/holded-mcp/test/**`
Versión: `holded-mcp-server@1.0.0`

## Resumen ejecutivo

El servidor está **bien arquitecturado** (Streamable HTTP, OAuth 2.0 + PKCE, Helmet, rate limit, cifrado AES-256-GCM de la API key, Postgres opcional con fallback stateless, CORS estricto a orígenes Claude). La intención de exponer una superficie tightly read-only para la submission a Anthropic está clara y correcta.

El problema no está en la arquitectura sino en la **fidelidad al contrato real de la API de Holded**. Hay tres bugs que bloquean la submission y un puñado de huecos de cobertura que conviene cerrar.

## P0 — Bugs bloqueantes

### P0-1. `create_invoice_draft` NO crea borradores

**Archivo:** `src/tools/invoicing.ts` líneas 62-97 + `src/holded-client.ts` `createDocument()`.

Holded requiere el campo `approveDoc: false` para crear el documento en modo borrador. Sin ese flag, `POST /api/invoicing/v1/documents/invoice` **emite la factura con número definitivo**, lo que contradice frontalmente la descripción de la tool, el README y los annotations declarados a Claude (`destructiveHint: false`, "draft only").

Esto es exactamente el tipo de discrepancia que un revisor de Anthropic va a detectar: la tool dice "draft only" pero el efecto real es "issue invoice immediately".

**Corrección:**

```ts
// holded-client.ts
async createDocument(docType: string, body: Record<string, unknown>) {
  return this.request<unknown>(`/api/invoicing/v1/documents/${docType}`, {
    method: 'POST',
    body: JSON.stringify({ approveDoc: false, ...body }),
  });
}
```

Mejor aún: forzar `approveDoc: false` en el handler de la tool y no permitir override desde input para que sea imposible que Claude lo desactive accidentalmente.

**Test obligatorio:** un test que mockee fetch y verifique que el body enviado a Holded incluye `approveDoc: false`. Sin este test no hay garantía de que un futuro refactor lo rompa.

### P0-2. Enum `DOC_TYPES` usa nombres que no existen en Holded

**Archivo:** `src/tools/invoicing.ts` líneas 6-16.

| En el código | En Holded API                                      | Resultado actual |
| ------------ | -------------------------------------------------- | ---------------- |
| `proforma`   | `proform`                                          | 404 silencioso   |
| `quote`      | `estimate`                                         | 404 silencioso   |
| `refund`     | `creditnote` (ventas) o `purchaserefund` (compras) | 404 silencioso   |

Además **faltan** `salesreceipt`, `creditnote` y `estimate` como valores válidos.

**Corrección:** alinear el enum 1:1 con la lista oficial de Holded:

```ts
const DOC_TYPES = [
  'invoice',
  'salesreceipt',
  'creditnote',
  'salesorder',
  'proform',
  'waybill',
  'estimate',
  'purchase',
  'purchaseorder',
  'purchaserefund',
] as const;
```

### P0-3. Endpoints CRM usan `/deals` en vez de `/leads`

**Archivo:** `src/holded-client.ts` líneas 97-100.

```ts
async listLeads(funnelId?: string) {
  const path = funnelId ? `/api/crm/v1/funnels/${funnelId}/deals` : '/api/crm/v1/deals';
  // ...
}
```

La API de Holded usa el recurso `leads`, no `deals` (referencia: `developers.holded.com/reference/leads`). Confirmar contra la doc oficial el path exacto — probablemente `GET /api/crm/v1/leads?funnelId=...`. La tool `list_leads` está fallando hoy.

## P1 — Riesgos de exactitud

### P1-1. Endpoints de contabilidad

`get_journal` apunta a `/api/accounting/v1/journal` y `get_daily_book` a `/api/accounting/v1/dailybook`. La doc oficial de Holded documenta `dailyledger` (`/api/accounting/v1/dailyledger`). Hay que verificar:

- si `journal` y `dailybook` son alias no documentados que funcionan
- si en realidad ambas tools deberían llamar a `dailyledger`

Probablemente la decisión correcta es colapsar ambas tools en una sola `list_accounting_entries` que llame a `/dailyledger` con filtros, y dejar `get_chart_of_accounts` como está.

### P1-2. Tipos de fechas

El `create_invoice_draft` acepta `date: z.number()` (timestamp Unix), pero las tools de listado (`list_documents`, `get_journal`, `get_daily_book`) usan `starttmp: z.string()`. Inconsistente y propenso a que Claude pase un ISO 8601 que falle silenciosamente.

**Recomendación:** aceptar ISO 8601 (`z.string().datetime()`) en input, convertir a Unix timestamp internamente. Mucho más fácil para el LLM.

### P1-3. `list_warehouses` describe stock que no devuelve

La descripción dice "Lists Holded warehouses and available stock" pero el endpoint `/warehouses` solo devuelve los almacenes, no el stock. El stock está en `/products/stock`. Dos opciones:

- corregir la descripción (mínimo)
- añadir tool `list_products_stock` (recomendado, es uno de los endpoints más útiles)

### P1-4. Sin manejo de errores "blandos" de Holded

`HoldedClient.request()` solo trata como error las respuestas con `!res.ok`. Holded tiene el patrón conocido de devolver `200 OK` con `{ status: 0, info: "error message" }` en escrituras fallidas. Sin este manejo, `create_invoice_draft` puede devolver "borrador creado" cuando en realidad falló.

**Corrección sugerida:**

```ts
const data = await res.json();
if (data && typeof data === 'object' && 'status' in data && data.status === 0) {
  throw new HoldedApiError(`Holded soft error: ${data.info ?? 'unknown'}`, res.status, path);
}
return data;
```

### P1-5. Sin retry/backoff

Aunque Holded no publica límite hoy, su roadmap incluye limits por plan. Recomendable un retry exponencial con jitter sobre 429 y 5xx, máx 2 reintentos. Hoy no hay nada.

## P2 — Cobertura: huecos importantes

Estos endpoints son **read-only y de bajo riesgo**, perfectamente alineados con la postura conservadora del MCP, y resuelven preguntas naturales de usuarios ("muéstrame el stock de X", "qué métodos de pago tengo", "dame el PDF de la factura X"). Se pueden añadir a la submission inicial o en una v1.1.

| Tool propuesta          | Endpoint Holded                                      | Valor                                                       |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `get_document_pdf`      | `GET /api/invoicing/v1/documents/{docType}/{id}/pdf` | Crítica: "muéstrame la factura"                             |
| `list_products_stock`   | `GET /api/invoicing/v1/products/stock`               | Alta: "cuánto stock tengo de X"                             |
| `list_taxes`            | `GET /api/invoicing/v1/taxes`                        | Alta: necesario para resolver IDs en `create_invoice_draft` |
| `list_numbering_series` | `GET /api/invoicing/v1/numberingseries`              | Alta: idem                                                  |
| `list_payment_methods`  | `GET /api/invoicing/v1/payments`                     | Media                                                       |
| `list_payments`         | `GET /api/invoicing/v1/payments`                     | Media                                                       |
| `list_expense_accounts` | `GET /api/invoicing/v1/expensesaccounts`             | Media                                                       |
| `list_sales_channels`   | `GET /api/invoicing/v1/saleschannels`                | Baja                                                        |
| `list_contact_groups`   | `GET /api/invoicing/v1/contacts/groups`              | Baja                                                        |
| `list_services`         | `GET /api/invoicing/v1/services`                     | Baja                                                        |
| `list_remittances`      | `GET /api/invoicing/v1/remittances`                  | Baja                                                        |
| `list_crm_events`       | `GET /api/crm/v1/events`                             | Baja                                                        |
| `list_crm_bookings`     | `GET /api/crm/v1/bookings`                           | Baja                                                        |

**Observación:** `create_invoice_draft` se beneficiaría enormemente de exponer `list_taxes` y `list_numbering_series` antes que él, porque hoy Claude tiene que adivinar IDs específicos del tenant.

## P3 — Mejoras de calidad

### P3-1. `validateApiKey` consume cuota

Llama a `listContacts({page:'1'})` que puede traerse muchos datos. Holded no tiene `/me`, pero podemos forzar que devuelva poco con `?limit=1`. Verificar si Holded acepta `limit`; si no, dejar como está.

### P3-2. Logger debug deja la API key fuera del log, bien

Auditado: el log de `HoldedClient.request()` solo loguea método y path, no la key. ✅

### P3-3. `apps/holded-mcp/test/` solo cubre la "shape" de tools

Los tests verifican que el set de nombres y annotations es exacto, pero no que cada tool produzca la URL correcta hacia Holded. **Recomendación crítica:** añadir un test por tool con `fetch` mockeado que verifique la URL final y el método HTTP. Esto habría detectado P0-2 y P0-3 inmediatamente.

### P3-4. README declara "no destructive operations" — alinear con realidad

Hoy el README es preciso _si_ P0-1 se arregla. Si no, el README es falso porque `create_invoice_draft` sí emite. Resolver P0-1 antes de la submission.

## Plan recomendado

**Sprint 1 — Pre-submission (1-2 días):**

1. P0-1: forzar `approveDoc: false` + test que lo verifica.
2. P0-2: alinear `DOC_TYPES`.
3. P0-3: corregir paths CRM.
4. P1-1: confirmar endpoint correcto de journal/dailybook contra la API real.
5. P1-4: capturar errores "blandos" de Holded.
6. Añadir tests de URL exacta por tool.

**Sprint 2 — Pulido (2-3 días):**

7. P1-2: aceptar ISO 8601 en fechas.
8. P1-3: corregir descripción `list_warehouses` + añadir `list_products_stock`.
9. P1-5: retry/backoff.
10. P2: añadir `get_document_pdf`, `list_taxes`, `list_numbering_series`.

**Sprint 3 — Cobertura completa (opcional, post-submission):**

11. Resto de P2.
12. Decidir si exponer escritura más allá de drafts (con MCP `elicitation` para confirmaciones).

## Apéndice: tabla de cobertura actual vs API de Holded

Leyenda: ✅ implementado, ⚠️ implementado con bug, ❌ no implementado, 🚫 fuera de scope (escritura no draft).

### Invoicing (`/api/invoicing/v1/`)

| Recurso            | Holded                                | MCP actual              |
| ------------------ | ------------------------------------- | ----------------------- |
| Documents — list   | `GET /documents/{docType}`            | ⚠️ enum incorrecto      |
| Documents — get    | `GET /documents/{docType}/{id}`       | ⚠️ enum incorrecto      |
| Documents — create | `POST /documents/{docType}`           | ⚠️ no fuerza draft      |
| Documents — update | `PUT /documents/{docType}/{id}`       | 🚫                      |
| Documents — delete | `DELETE /documents/{docType}/{id}`    | 🚫                      |
| Documents — send   | `POST /documents/{docType}/{id}/send` | 🚫                      |
| Documents — pay    | `POST /documents/{docType}/{id}/pay`  | 🚫                      |
| Documents — PDF    | `GET /documents/{docType}/{id}/pdf`   | ❌ recomendado añadir   |
| Documents — ship   | `POST /documents/{docType}/{id}/ship` | 🚫                      |
| Contacts — list    | `GET /contacts`                       | ✅                      |
| Contacts — get     | `GET /contacts/{id}`                  | ✅                      |
| Contacts — create  | `POST /contacts`                      | 🚫                      |
| Contact groups     | `GET /contacts/groups`                | ❌ recomendado          |
| Products — list    | `GET /products`                       | ✅                      |
| Products — get     | `GET /products/{id}`                  | ✅                      |
| Products — stock   | `GET /products/stock`                 | ❌ alta prioridad       |
| Warehouses         | `GET /warehouses`                     | ⚠️ descripción engañosa |
| Treasury accounts  | `GET /treasury`                       | ✅                      |
| Taxes              | `GET /taxes`                          | ❌ alta prioridad       |
| Numbering series   | `GET /numberingseries`                | ❌ alta prioridad       |
| Expense accounts   | `GET /expensesaccounts`               | ❌                      |
| Sales channels     | `GET /saleschannels`                  | ❌                      |
| Payments           | `GET /payments`                       | ❌                      |
| Services           | `GET /services`                       | ❌                      |
| Remittances        | `GET /remittances`                    | ❌                      |

### CRM (`/api/crm/v1/`)

| Recurso  | Holded          | MCP actual           |
| -------- | --------------- | -------------------- |
| Funnels  | `GET /funnels`  | ✅                   |
| Leads    | `GET /leads`    | ⚠️ usa path `/deals` |
| Events   | `GET /events`   | ❌                   |
| Bookings | `GET /bookings` | ❌                   |

### Accounting (`/api/accounting/v1/`)

| Recurso           | Holded                 | MCP actual           |
| ----------------- | ---------------------- | -------------------- |
| Daily ledger      | `GET /dailyledger`     | ⚠️ paths a verificar |
| Chart of accounts | `GET /chartofaccounts` | ✅                   |

### Projects (`/api/projects/v1/`)

| Recurso         | Holded                           | MCP actual |
| --------------- | -------------------------------- | ---------- |
| Projects — list | `GET /projects`                  | ✅         |
| Projects — get  | `GET /projects/{id}`             | ✅         |
| Tasks           | `GET /projects/{id}/tasks`       | ✅         |
| Time records    | `GET /projects/{id}/timerecords` | ✅         |

### Team (`/api/team/v1/`)

| Recurso          | Holded                | MCP actual |
| ---------------- | --------------------- | ---------- |
| Employees — list | `GET /employees`      | ✅         |
| Employees — get  | `GET /employees/{id}` | ✅         |
