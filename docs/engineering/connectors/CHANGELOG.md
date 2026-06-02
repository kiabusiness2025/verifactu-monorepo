# Changelog · Conectores Holded

Historial de fixes y hardening aplicados a los conectores durante el ciclo de OpenAI App Review (mayo-junio 2026). Cada commit etiquetado con un identificador V3.X reproducible.

## V3.G.9 — 2026-06-02 · Mismatch contactId / contactName (commit `1f92f964`)

> Defensa contra contaminación de contexto del modelo en `create_invoice_draft`.

Reviewer reportó: prompt "Create a draft invoice for Alfa Retail Madrid SL"
pero el consent card de ChatGPT mostraba `Names: Beta Eventos Barcelo...` con
`contactId: 69edd394b6b0967c30052220`. ChatGPT sustituía Alfa→Beta entre el
prompt del usuario y la llamada al tool — contaminación de contexto del modelo
desde turnos / Memory previa.

V3.G.4 y V3.G.8 ya cerraban el caso "contactName que no matchea exacto", pero
aquí el modelo enviaba `contactName Beta` y `contactId Beta` (coherentes entre
sí, ambos apuntando a Beta — solo que NO era lo que el usuario pidió).

**Fix V3.G.9**: cuando el modelo manda BOTH `contactId` Y `contactName`:

1. Hacemos `getContact(contactId)` para obtener el nombre canónico de Holded.
2. Si el nombre canónico no contiene/no es el contactName declarado → throw
   `contact_id_name_mismatch` con mensaje claro: "id resuelve a X pero
   nombre dado fue Y, son contactos distintos. Pasa SOLO contactName para
   resolver limpio, O SOLO el contactId que confíes".
3. Si coinciden, sobrescribimos `contactName` con el canónico de Holded para
   que la consent card muestre el nombre real.

**Limitación aceptada**: no cubre el caso exacto del screenshot (Beta+Beta
coherentes entre sí pero ambos incorrectos respecto a la intención del
usuario) porque desde el backend no conocemos la intención. Mitigación: el
usuario inspecciona el consent card y deniega si ve un contacto distinto al
que tipeó.

**Files**:
- `apps/app/lib/integrations/holdedMcpTools.ts` (ChatGPT MCP)
- `apps/holded-mcp/src/tools/invoicing.ts` (Claude MCP)

Tests: 131/131 apps/app + 81/81 Claude verdes.

## V3.G.8 — 2026-06-02 · Validación robusta `create_invoice_draft` Claude + descriptions `get_contact` con quirks (commit `7af6d991`)

> Cierra bug nuevo del reviewer (V3.G.4 olvidado en Claude) + mitiga bug 5.

Reviewer hizo ronda final y reportó BUG 8 (crítico):

**A) Contacto inexistente reasignado**: `contactName="CLIENTE QUE NO EXISTE
XYZ 99999"` se asignaba a Beta Eventos (items[0]) en silencio.

**B) Importe negativo aceptado**: `subtotal: -500€` pasaba sin error.

**C) Fecha inválida aceptada**: `date: "fecha-invalida-2026"` se ignoraba y
Holded aplicaba "hoy" silenciosamente.

**D) Line item name vacío aceptado**.

**Root cause**: V3.G.4 cerró este patrón en `apps/app` pero NO en
`apps/holded-mcp`. El Claude connector tiene su propia implementación que se
olvidó actualizar (otra trampa de adapters independientes).

**Fix V3.G.8 — Claude**:

1. Cascada `exact` / `unique-partial` / `contact_ambiguous` /
   `contact_not_found` reemplaza el `chosen = exact ?? items[0]` peligroso.
2. `contactName` sobrescrito al canónico → consent card muestra el real.
3. Zod schema reforzado:
   - `name: z.string().min(1)` — no vacío
   - `units: z.number().positive()` — > 0
   - `subtotal: z.number().positive()` — > 0 (refunds usan credit notes,
     no facturas con importe negativo)
   - `items: ...min(1)` — al menos una línea
4. Validación explícita date/dueDate con try/catch → respuesta controlada
   `{"error":"invalid_date","date",message}` legible.

**Fix V3.G.8 — BUG 5 mitigado en ambos connectors**:

Reviewer confirmó que `get_contact` devuelve `type:""` aunque el contacto
sea claramente proveedor, y que el CIF español vive en `code` (no
`vatnumber`, que es EU VIES intracomunitario). No es bug del conector — es
así en la API Holded — pero confunde al modelo.

Descriptions de `get_contact` actualizadas en ambos connectors con sección
"⚠ FIELDS QUIRKS":

- CIF/NIF/NIE → `code`, NO `vatnumber`.
- `type` → no fiable, usar `supplierRecord`/`clientRecord` para el rol.
- IDs de documento → pueden ser legacy y no resolver aquí.

**Files**:
- `apps/holded-mcp/src/tools/invoicing.ts`
- `apps/holded-mcp/src/tools/contacts.ts`
- `apps/app/lib/integrations/holdedMcpTools.ts`

Tests: 131/131 apps/app + 81/81 Claude verdes.

## V3.G.7 — 2026-06-02 · `attachments[]` es array de strings, NO objetos (commit `417fb400`)

> Causa raíz definitiva del BUG 7 reportado por reviewer.

Tras V3.G.5 + V3.G.6, el reviewer ejecutó curl directo contra Holded y
compartió evidencia empírica del shape REAL de la respuesta:

```
GET /api/invoicing/v1/documents/purchase/{id}/attachments/list
→ 200 OK
→ {"status":1,"attachments":["31PTaxInvoice299055226B001260000000235.pdf"]}
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                            Array de STRINGS (filenames), NO objetos.
```

En V3.G.5 escribí el fallback asumiendo objetos:

```ts
const first = attachments[0] as Record<string, unknown>;
const fileName = String(first.fileName ?? first.name ?? first.filename ?? '').trim();
//                       ↑ undefined porque first es un STRING
```

Resultado: `fileName` vacío, no se descargaba el adjunto, caía al
`no_attachment` genérico.

**Fix V3.G.7** (apps/app + apps/holded-mcp): acepta ambas formas:

```ts
const first = attachments[0] as unknown;
let fileName = '';
if (typeof first === 'string') {
  fileName = first.trim();
} else if (first && typeof first === 'object') {
  const obj = first as Record<string, unknown>;
  fileName = String(obj.fileName ?? obj.name ?? obj.filename ?? '').trim();
}
```

**Otros hallazgos empíricos del curl del reviewer** (documentados):

- `GET /documents/purchase/{id}` → NO incluye attachments en el payload.
- `/documents/purchase/{id}/attachment` (singular) → HTML 404.
- `/documents/purchase/{id}/attach` → header `Allow: POST`, no GET.
- `/documents/purchase/{id}/files` → HTML 404.
- **Único endpoint válido**: `/documents/purchase/{id}/attachments/list`.

Tests V3.G.7 añadidos con shape REAL Holded.

## V3.G.6 — 2026-06-02 · Diagnostic logging para `listDocumentAttachments` (commit `41d6607b`)

> Iteración intermedia entre V3.G.5 y V3.G.7. Defensa diagnóstica.

Tras V3.G.5 el reviewer seguía viendo `no_attachment` para P250001. Sospechas:
endpoint correcto pero Holded responde "HTML 200 con widget de error" cuando
no aplica para un docType específico, y nuestro adapter silenciaba esa
respuesta tratándola como lista vacía.

**Fix V3.G.6** (defensivo en `apps/app/lib/integrations/accounting.ts`):
`listDocumentAttachments` ahora distingue cuatro casos:

1. Array directo → devuelve.
2. `{attachments:[]}` wrapper → unwrap.
3. `{status:0, info:"..."}` (Holded soft error) → `console.warn` + `[]`.
4. Cualquier otra cosa (HTML, string raw) → `console.warn` + `[]`.

Los `console.warn` dejan traza en Vercel logs para diagnosticar.

Tests: 95/95 verdes (sin regresión).

Investigación paralela del agent + curl del reviewer (que llegaron poco
después) confirmaron que el endpoint era correcto y el bug real era el
parsing → V3.G.7.

## V3.G.5 — 2026-06-02 · Timezone Madrid en fechas ISO + fallback a attachments en PDF (commit `e9dd3ac1`)

> Cierra BUG 6 (timezone) y abre la cadena de fixes que culmina en V3.G.7.

**BUG 6 (ALTO) — Off-by-one por timezone**:

Reviewer reportó: `list_documents` con `starttmp=01/01/2025` excluía
silenciosamente la factura P250001 (date=1735686000, fecha visible
01/01/2025, 918 €). Bajando starttmp un día reaparecía. Afectaba cualquier
corte fiscal: auditorías por ejercicio/trimestre perdían las facturas del
primer día.

Root cause: Holded almacena las fechas a la medianoche LOCAL del tenant
(Europe/Madrid → CET +1 / CEST +2). Nuestro parser ISO interpretaba
`"2025-01-01"` como UTC midnight (1735689600). En Madrid son las 01:00 — 1
hora DESPUÉS de la medianoche local (1735686000). Filtros con
starttmp=UTC-midnight excluían los docs fechados ese mismo día local.

**Fix V3.G.5**:

- `apps/app/lib/integrations/holdedMcpTools.ts:parseIsoDateToUnix`
- `apps/holded-mcp/src/utils.ts:toUnixSecondsString`

Para `YYYY-MM-DD` (sin tiempo), parsea como medianoche LOCAL Europe/Madrid
usando `Intl.DateTimeFormat` para detectar el offset dinámico (maneja DST).
ISO completos con tiempo/TZ explícito se respetan tal cual.

Repro tests:
- `"2025-01-01"` → 1735686000 (Madrid midnight CET) — antes 1735689600 (UTC).
- `"2025-07-01"` → 1751320800 (Madrid midnight CEST = UTC+2) — antes 1751328000.

**BUG 7 (ALTO) — primer intento — fallback a attachments**:

`get_document_pdf` solo intentaba `/pdf` renderizado. Si el usuario subió
PDF manualmente en Holded UI (caso real P250001), el conector decía no_attachment.

V3.G.5 añadió cascada en `holded_get_document_pdf`:

1. Intenta `/pdf`.
2. Si falla con "no PDF" → list_attachments + get del primer file.
3. Si tampoco hay → notFoundResponse legible.

⚠ Asumió incorrectamente que `attachments[0]` era un objeto → causó la
cadena V3.G.6 → V3.G.7 hasta cerrar.

Files también modificados: `apps/holded-mcp/src/holded-client.ts`,
`apps/holded-mcp/src/tools/invoicing.ts`, `apps/isaak/app/lib/holded-api.ts`.

Tests V3.G.5: 3 nuevos (timezone CET + CEST + fallback attachments).

## V3.G.4 — 2026-06-01 · `create_invoice_draft` rechaza contactos ambiguos + drafts de €0 (commit `a5149006`)

> Cierra Bug A y Bug B reportados por el reviewer en producción.

**Bug A — Cliente equivocado en draft**:

Usuario pidió "Create a draft invoice for Alfa Retail Madrid SL..." y el
ChatGPT consent card mostraba `contactId: 69edd394...` con `Name: Beta Eventos
Barcelona SL`. Tras confirmar, draft creado para Beta en vez de Alfa.

Root cause (apps/app): `const chosen = exact ?? items[0]`. Si no había
match exacto por nombre, cogíamos el primer contacto que Holded devolviese.
Holded `/contacts` ordena por insertion order interno, no por relevancia al
filtro `name=` → para "Alfa Retail Madrid SL" Holded devolvía "Beta Eventos
Barcelona SL" como items[0] y ese era el cliente al que se creaba la factura.

**Fix V3.G.4 — cascada de 3 niveles**:

1. Match EXACTO case-insensitive → acepta.
2. Match parcial ÚNICO (solo 1 contacto contiene el nombre) → acepta.
3. Cualquier otro caso (0 matches, múltiples partials no exactos) →
   `HoldedUserError` con mensaje legible (`contact_ambiguous` o
   `contact_not_found`).

Bonus: cuando aceptamos contacto, sobrescribimos `contactName` con el
canónico de Holded → consent card muestra el nombre real.

**Bug B — Drafts de €0 silenciosamente**:

En Holded UI aparecen 2 drafts "Borrador Factura" para Alfa Retail Madrid
SL con Subtotal 0€ / IVA 0€ / Total 0€. Causa: el normalizer de líneas
exigía `desc, units, price` definidos pero NO exigía que `units > 0` o
`price > 0`.

**Fix V3.G.4**: `normalizeDocumentLineItem` ahora exige `units > 0` Y
`price > 0`. Si falla → throw con mensaje específico ("units must be
greater than 0", "price must be greater than 0").

⚠ Aplicado SOLO en `apps/app` — V3.G.8 lo portó a Claude tras nuevo reporte.

Tests V3.G.4: 6 nuevos (contact ambiguous, not_found, exact case-insensitive,
unique partial, units=0, price=0).

## V3.G.3 — 2026-06-01 · Fix fetchHoldedSnapshot purchases

> Cierra bug histórico que afectaba el business context de Isaak.

Reviewer confirmó que Nova Gestión SL tiene facturas de compras en
`/expenses/list` (UI). Pero `fetchHoldedSnapshot` devolvía `invoices: []`
incluso en ese tenant rico, por dos errores:

1. Llamaba `/api/invoicing/v1/documents` SIN docType en el path.
2. Aplicaba fallbacks `?docType=invoice` como query (Holded ignora).

**Fix**: `packages/integrations/holded/connection.ts:fetchHoldedSnapshot`
ahora itera en paralelo por los 4 docTypes principales (`invoice`,
`purchase`, `creditnote`, `purchaserefund`) usando path-prefix correcto
(`/documents/{docType}`). Devuelve los items tageados con `docType`.

Return shape expandido (backward-compat — `invoices` sigue conteniendo
solo sales):
- `invoices` (sales — backward compat con consumers existentes)
- `purchases` (gastos / facturas de compra) ← nuevo, antes no se exponía
- `creditnotes` (rectificativas venta) ← nuevo
- `purchaserefunds` (rectificativas compra) ← nuevo
- `documents` (agregado) ← nuevo
- `contacts` (sin cambios)
- `accounts` (sin cambios)

Verificado contra spec OpenAPI Holded + 4 wrappers community + Holded
Academy. El MCP path (`apps/app/api/mcp/holded`) NO tenía este bug —
usaba `listTypedDocuments(apiKey, docType, args)` con path-prefix
correcto desde siempre.

Script smoke nuevo: `pnpm holded:purchases:smoke` prueba 12 endpoints
contra la API live para verificar cuál devuelve las purchases del
tenant. Útil para diagnosticar tenants futuros con problemas similares.

Doc añadido: HOLDED_API_QUIRKS.md sección [INVESTIGATION 2] con la
lista oficial de docTypes válidos, mapeo UI→API, y caveats sobre la
API v2 en preview (acceso a prod junio 2026).

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
