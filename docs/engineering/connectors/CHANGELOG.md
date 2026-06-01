# Changelog · Conectores Holded

Historial de fixes y hardening aplicados a los conectores durante el ciclo de OpenAI App Review (mayo-junio 2026). Cada commit etiquetado con un identificador V3.X reproducible.

## V3.G.2 — 2026-06-01 · Auto-pagination del libro diario

> Cierra BUGS 1+2 reportados por reviewer 2026-06-01 (chartofaccounts saldos incompletos + dailyledger subset de asientos).

**Hallazgo clave** (investigación spec OpenAPI Holded scrapeada por dos forks community):

- Holded **no expone endpoints alternativos** para el libro diario completo. `/journal`, `/dailybook`, `/accountingbook`, `/manualentries` no existen.
- Tampoco hay query params no documentados (`?type=all`, `?includeManual=1`) que devuelvan más entries.
- El root cause de BUG 2 es paginación: Holded `/dailyledger` devuelve hasta 250 entries por página (doc oficial dice 500, real es 250) y antes hacíamos UNA sola llamada → 155 de 408 entries.
- BUG 1 (chartofaccounts) es comportamiento de producto Holded confirmado: los manuales de cierre/regularización están excluidos del balance sintético by design (https://help.holded.com/en/articles/6895943).

**Acciones aplicadas**:

1. **Auto-paginación server-side** en los 3 adapters (`accounting.ts`, `holded-client.ts`, `holded-api.ts`):
   - Loop page=1,2,...,10 hasta página parcial.
   - Constantes: `HOLDED_LEDGER_PAGE_SIZE=250`, `HOLDED_LEDGER_MAX_PAGES=10` (=2500 entries cap).
   - `fetchHoldedDailyLedgerAllPages` / `getDailyLedgerAllPages` helpers.

2. **`/chartofaccounts` acepta `starttmp/endtmp`** para escopear al ejercicio fiscal. Sin esto Holded usa el rango default del tenant que rara vez cuadra. Expuesto en `holded_list_accounts` (ChatGPT MCP) y `get_chart_of_accounts` (Claude MCP) con descripciones de ISO date alternative.

3. **Caveats explícitos en tool descriptions** — el modelo verá literalmente:
   - "manual closing/regularization entries excluded by Holded design — re-aggregate from get_journal for real balance"
   - "auto-paginated by connector; for ranges larger than ~2500 entries narrow the date window"

**Files cambiados**:
- `apps/app/lib/integrations/accounting.ts`
- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/accounting.test.ts` (test V3.G.2 regression)
- `apps/holded-mcp/src/holded-client.ts`
- `apps/holded-mcp/src/tools/other.ts`
- `apps/isaak/app/lib/holded-api.ts`
- `docs/engineering/connectors/*` (docs nuevos)

**Tests**: apps/app 103/103, apps/holded-mcp 81/81, apps/isaak 18/18.

## V3.H — 2026-06-01 · outputSchema MCP

> Cumple la recomendación de OpenAI App Review form: "Add an outputSchema so models can better understand this tool's results".

- Extendido `HoldedMcpToolDefinition` con `outputSchema?: HoldedMcpJsonSchema` (TS type).
- `readTool()` y `writeTool()` aceptan outputSchema opcional.
- Schemas reusables definidos: `holdedInvoiceItemSchema`, `holdedDocumentItemSchema`, `holdedContactItemSchema`, `holdedAccountItemSchema`, `holdedJournalEntrySchema`.
- Wrappers: `listOutputSchema(item)`, `singleOutputSchema(item)`, `pdfOutputSchema`, `createInvoiceDraftOutputSchema`.
- Aplicado a las 10 tools del preset `openai_review_invoicing_v1`.
- Test V3.H: itera el preset y asserts que cada tool publica outputSchema.

Commit: `4d565d3d`.

## V3.G.1 — 2026-06-01 · Pagination + sort en Claude MCP

> Cierra BUGS 3, 4, 5 reportados por reviewer (pagination flag inestable, get_document_pdf contentType mentiroso, list_contacts mezcla roles).

**El Claude connector** (`apps/holded-mcp`) tiene clientes HTTP propios separados de apps/app. Los fixes V3.F y V3.F.II se aplicaron primero a apps/app — había que portarlos al Claude connector también.

- BUG 3: `likelyHasMorePages` cambió de `itemsInPage >= pageSize` a `itemsInPage > 0`. Antes Holded devolvía 155 entries (menos de pageSize 250) y el flag era false → modelo paraba → 219 entries más en page 2 quedaban fuera. Ahora cualquier página no vacía → probar siguiente.
- BUG 4: `get_document_pdf` valida magic bytes `%PDF-` antes de exponer. Si no, devuelve `{error:'no_attachment',message:...}` legible.
- BUG 5: `list_contacts(type=supplier)` aplica filtro client-side adicional — exige `supplierRecord` truthy. Antes Holded devolvía contactos con `supplierRecord:0` (rol histórico).

Commit: `9261dea6`.

## V3.G — 2026-06-01 · Pagination + sort del libro diario (primera iteración)

> Cierra BUGS reportados sobre orden incoherente + pagination flag default.

- `apps/holded-mcp/src/utils.ts:buildPaginationMeta` default `pageSize` cambió de 500 → 250 (cifra real observada de Holded /dailyledger).
- Helper `sortJournalEntries` añadido — orden estable por `date` ASC + `number` ASC.
- Aplicado en `get_journal` y `get_daily_book` (Claude) + `listDailyLedger` adapter (apps/app).
- Output del tool incluye `sortApplied: 'date_asc_then_number_asc'` como metadata.
- 6 tests V3.G en `test/sort-journal-entries.test.ts` (Claude).

⚠ V3.G.1 (24h después) hizo el pagination flag aún más agresivo (`> 0` siempre) porque V3.G aún producía falsos negativos en tenants donde Holded segmenta páginas en sizes variables.

Commit: `8f2df739`.

## V3.F / V3.F.II — 2026-06-01 · Binary validation + smart lookup contactos

> Cierra los 3 bugs del primer audit del reviewer (PDF base64 falso, contact ID legacy, type=supplier filter).

- **Bug A — get_document_pdf falsifica PDFs**: Holded responde HTTP 200 + JSON error cuando no hay PDF. El adapter encodeaba ese JSON como base64 con contentType: 'application/pdf' falso. Fix: validar magic bytes `%PDF-`.
- **Bug B — get_contact 404 con IDs de documento**: los IDs embebidos en documentos (legacy `69cfb7ca...`) no resuelven en `/contacts/{id}`. Fix: fallback automático por `contactName`.
- **Bug C — `type=supplier` mezcla roles**: Holded incluye contactos con `supplierRecord:0`. Fix: filtro client-side adicional.

Patrón `ensureHoldedBinaryNotJsonError` extraído en V3.F.II para reusar la validación binaria en `getContactAttachment`, `getProductMainImage`, `getProductSecondaryImage` y `holdedGetDocumentPdf` (Isaak).

Commits: `24200b5c`, `9fc4e113`.

## V3.E — 2026-06-01 · Consent screen HMAC binding (security hardening)

> Cierra replay attack del consent screen.

Antes: `/oauth/authorize?...&consent_confirmed=1` permitía saltar el consent screen completamente con solo una flag suelta. Cualquier atacante con cookie `__session` del usuario podía construir una URL y mintar code sin ver consent.

Fix: `consent_proof = HMAC-SHA256(SESSION_SECRET, uid|client_id|redirect_uri|scope|code_challenge)`. Se firma en `/oauth/authorize` al redirigir a consent, se forwardea por la consent page al link "Autorizar", y se verifica al volver. Cambio en cualquier de los 5 valores → HMAC inválido → redirige a consent screen.

Archivos:
- `packages/utils/consent-proof.ts` (nuevo módulo aislado de jose).
- `apps/app/app/oauth/authorize/route.ts`.
- `apps/holded/app/oauth/consent/page.tsx`.
- `apps/app/app/oauth/authorize/route.test.ts` (2 nuevos tests: blocks replay + rejects tampered HMAC).

Commit: `cc9bca51`.

## V3.D — 2026-06-01 · Output formatting + tool description hardening

> Mejoras pre-resubmisión basadas en patrón de rejection de OpenAI ("did not produce correct results").

- `formatToolResult` empty result message mejorado: ahora explica que 0 items es resultado válido (no fallo del conector).
- `holded_list_documents` description con caso `docType: "purchase"` en MAYÚSCULAS.
- `holded_list_invoices` description documenta el fallback automático a year history.

Commit: `06ee8b8c`.

## V3.C — 2026-05-31 · Link discreto "No tengo Holded"

> UX en el form `/auth/holded-direct`.

Pequeño footer link "¿Aún no usas Holded? Pruébalo gratis" → `www.holded.com/es`. Solo visible en el paso 2 (API key), no en el paso 1 (Google/magic link).

Commit: `bc33614b`.

## V3.A / V3.B — 2026-05 · Submission v2 narrowing

> Estrecha el preset público a 10 tools tras 2 rejections OpenAI.

- Antes: 29 tools `claude_parity`. Reviewer reportó "did not produce correct results" sin tool específica.
- Decisión: narrow a 10 tools `openai_review_invoicing_v1` enfocadas en invoicing + contabilidad mínima.
- Si OpenAI aprueba esta superficie, ampliamos a `claude_parity` como submission v3.

Commits: `b4a33cc0`.

## Histórico previo

Los commits antes de V3.A están documentados en:

- `docs/engineering/HOLDED_CONNECTOR_OPENAI_REQUIREMENTS_HISTORY.md`
- Git log filtrado por `apps/app/api/mcp/holded` y `apps/holded-mcp`.
