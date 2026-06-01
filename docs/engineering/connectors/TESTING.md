# Testing · Conectores Holded

Cómo verificar localmente cada surface antes de un push a producción o una resubmisión a OpenAI/Anthropic.

## Tenant demo

```
HOLDED_TEST_API_KEY=0ecf1267eacc89ff45acab1b8ca28396
```

Tenant: **NOVA GESTION, SL**. Contiene:

- 6 contactos demo (Retail Norte, Servicios Delta Tech, Construcciones Bahía 2030, Clínica Horizonte, Logística Atlas, Studio Naranja).
- Facturas y estimates de 2025 y 2026 generadas vía `scripts/seed-holded-demo.mjs`.
- Plan contable PGC español por defecto de Holded.
- Libro diario 2025 completo: Debe = Haber = 606.722,28 €, 408 asientos, 1.114 líneas (incluye manuales que la API NO expone via /chartofaccounts).

⚠ Cuando el reviewer cambie de tenant, todos estos números cambian. Actualizar este doc.

## Tests automáticos

### Apps/app (ChatGPT MCP)

```bash
cd apps/app
pnpm jest --runInBand --runTestsByPath \
  lib/integrations/accounting.test.ts \
  lib/integrations/holdedMcpTools.test.ts \
  lib/integrations/holdedMcpScopes.test.ts \
  app/api/mcp/holded/route.test.ts \
  app/oauth/authorize/route.test.ts
```

Cobertura actual: ~103 tests (V3.G.2 / V3.H). Validan:

- OAuth flow + PKCE + consent HMAC binding
- Schema alignment manifest ↔ runtime
- Auto-pagination de daily ledger
- Magic byte validation en binarios
- Sort estable del libro diario
- Type filter de contactos (`supplier`/`client`)

### Apps/holded-mcp (Claude MCP)

```bash
cd apps/holded-mcp
pnpm test
```

Cobertura: 81 tests (V3.G.2). Validan:

- MCP tools/list + scopes
- Smart lookup de contactos
- Pagination metadata `itemsInPage > 0`
- Sort `date_asc_then_number_asc`
- PDF magic byte validation

⚠ Los tests en `apps/holded-mcp/test/*.test.ts` solo se ejecutan si están listados en `package.json:scripts.test`. Tests nuevos hay que añadirlos a esa lista manualmente.

### Apps/isaak (adapter Holded interno)

```bash
cd apps/isaak
pnpm jest --runInBand app/lib/__tests__/holded-api.test.ts
```

Cobertura: 18 tests (V3.G.2). Validan:

- Retry de Holded API
- PDF magic byte validation
- (TODO: auto-pagination tests)

## Smoke tests contra Holded API live

Requieren la API key del demo tenant.

### Sanity check del adapter compartido

```bash
HOLDED_TEST_API_KEY=0ecf1267eacc89ff45acab1b8ca28396 \
  pnpm holded:demo:smoke
```

Script: `scripts/holded-full-smoke.mjs`. Hace una pasada por:

- `/api/invoicing/v1/documents/invoice` (lista facturas 2026)
- `/api/invoicing/v1/contacts` (lista contactos)
- `/api/accounting/v1/chartofaccounts` (chart of accounts)
- `/api/accounting/v1/dailyledger?starttmp=...&endtmp=...` (libro diario reciente)

Reporta count + sample por endpoint.

### Smoke MCP ChatGPT

```bash
node scripts/chatgpt-mcp-smoke.mjs
```

Hace 3 bloques:

1. MCP sin auth (initialize + tools/list public surface) — verifica que la superficie pública está activa.
2. MCP con OAuth token (`MCP_BEARER_TOKEN` env) — verifica que la auth real funciona.
3. Holded directo (con `HOLDED_TEST_API_KEY`) — aísla si un fallo es de Holded o del conector.

### Validación submission JSON

```bash
node scripts/validate-openai-submission.mjs
```

Valida `docs/openai-submission/chatgpt-app-submission.json` contra la spec de OpenAI App Submission v1. Falla si hay drift entre el manifest declarado y el preset runtime.

## Matriz POS-01..POS-10 (OpenAI submission test cases)

Los 10 prompts que el reviewer de OpenAI ejecutará. Cada uno debe producir resultados sin error en el demo tenant:

| # | Tool | Prompt |
|---|---|---|
| POS-01 | `holded_list_invoices` | "List my latest Holded invoices." |
| POS-02 | `holded_get_invoice` | "Show me the details of one invoice from the list." |
| POS-03 | `holded_list_documents` (`docType: purchase`) | "List my 5 most recent Holded purchase documents." |
| POS-04 | `holded_get_document` | "Show me the details of one document from that list." |
| POS-05 | `holded_get_document_pdf` | "Get me the PDF of that document." |
| POS-06 | `holded_list_contacts` | "List my Holded contacts." |
| POS-07 | `holded_get_contact` | "Show me the details of one contact from that list." |
| POS-08 | `holded_list_accounts` | "List my main accounting accounts in Holded." |
| POS-09 | `holded_list_daily_ledger` | "Show my Holded daily ledger entries from `<date_range>`." |
| POS-10 | `holded_create_invoice_draft` (`confirm: true`) | "Create a draft invoice for an existing customer for 100 euros plus VAT. Ask for confirmation before creating it." |

Riesgos empíricos por tenant data:

- POS-03 requiere que el tenant tenga `docType=purchase` documents. El seed `seed-holded-demo.mjs` solo crea invoice + estimate — añadir purchases manualmente o cambiar el prompt a sales.
- POS-05 requiere que el doc del POS-04 tenga PDF. Si no, el conector devuelve error legible (V3.F.II).
- POS-09 requiere entries en el rango pedido. El default range del prompt es Q1/Q2 — verificar que el demo tenant tenga data ahí.

## Negative test cases (NEG-01..NEG-06)

Definidos en `chatgpt-app-submission.json` → `negative_test_cases`. El modelo debe REHUSAR:

- Daily ledger sin rango explícito.
- Crear draft sin confirmar.
- Send/issue/delete invoice (fuera del preset).
- Acceder a otro tenant.
- Revelar la API key.

## Cómo añadir un test al pipeline

### apps/app (Jest)

Cualquier `*.test.ts` en `apps/app/lib` o `apps/app/app` se ejecuta automáticamente con `pnpm jest`.

### apps/holded-mcp (node:test)

Hay que añadir el path a `apps/holded-mcp/package.json:scripts.test`. Si no, NO se ejecuta. Ejemplo del comando current:

```json
"test": "node --import tsx --test test/tools.test.ts test/oauth.test.ts ..."
```

### apps/isaak (Jest)

Cualquier `*.test.ts` en `apps/isaak/app` se ejecuta automáticamente con `pnpm jest`.

## Debug en producción

### Logs OAuth

`apps/app/lib/integrations/connectorObservability.ts:logConnectorEvent` registra cada paso del flow OAuth con un `requestId` único. Filtrar en Vercel logs:

```
service:apps/app component:oauth/authorize
```

### MCP Inspector

Para inspeccionar tools/list y tools/call:

1. `npx @modelcontextprotocol/inspector https://holded.verifactu.business/api/mcp/holded`
2. Pegar el bearer token OAuth.
3. Probar llamadas individuales.

Ver `docs/engineering/mcp/MCP_INSPECTOR_GUIDE.md` para más detalles.

## Sandbox limitaciones

- Desde el sandbox de Claude Code (este entorno), `holded.verifactu.business` y `api.holded.com` están detrás del firewall Vercel y devuelven 403 "Host not in allowlist". Tests live deben correrse desde:
  - Vercel preview environment
  - Una máquina con acceso público
  - El laptop del desarrollador
