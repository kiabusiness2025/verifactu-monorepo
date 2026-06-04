# Holded API · Comportamientos no documentados y bugs

Catálogo de quirks, bugs y limitaciones encontradas en la API REST de Holded (`api.holded.com`) durante el desarrollo de los conectores. Documentado para que cualquier ingeniero que tope con uno de estos comportamientos sepa que es Holded y no nuestro código.

> Última actualización: 2026-06-03 · V3.G.17

## ⚠ Quirks críticos descubiertos 2026-06-03 (V3.G.17)

### Q0.1 — POST `/documents/{type}` debe usar `items`, NO `lines`

**Síntoma**: el draft se crea con `products: []`, `subtotal: 0`, `total: 0` pese a que el wire body lleva un array de líneas con todos los campos rellenos. HTTP 200 OK + `status: 1` + `id`. Sin error ni warning.

**Causa**: la API espera el array bajo la key **`items`** (`[{ name, units, subtotal, tax }]`), no `lines`. Cuando se envía `lines`, Holded acepta el POST y **descarta el array silenciosamente** — no devuelve error.

Confirmado contra el wrapper community [`vshopes/holded`](https://github.com/vshopes/holded) y verificado empíricamente contra el tenant Nova Gestión SL el 2026-06-03 con 15+ drafts (V3.G.10-16 con `lines` → todos vacíos; V3.G.17 con `items` → líneas persisten).

**Cómo lo manejamos** (V3.G.17): los handlers de `create_invoice_draft` en `apps/app` y `apps/holded-mcp` normalizan el input del modelo al shape canónico:

```ts
items: [{ name, units, subtotal, tax, productId? }]
```

**Histórico**: V3.G.10 (2026-06-02) hizo el cambio inverso `items → lines` asumiendo (incorrectamente) que `lines` era la key correcta. Ese commit rompió un connector que funcionaba bien. V3.G.17 lo revierte.

### Q0.2 — Status `0` vs `1` distingue draft válido vs draft roto

Marcador útil para detectar instantáneamente si Holded persistió las líneas:

| `status` | `products` | Significado |
|---|---|---|
| `0` | poblado | Draft válido con líneas — el caso correcto |
| `1` | `[]` | Draft roto sin líneas — firma del bug Q0.1 |

Ambos casos tienen `draft: true` y `approvedAt: null`. El `status` es la única señal in-band que permite verificar persistencia sin leer `products.length`. Si en futuro alguien ve `status: 1 + total: 0` en un draft recién creado, **es la firma exacta del bug Q0.1**: revisar que el wire body use `items` y no `lines`.

### Q0.3 — `get_document` tiene latencia/indexación para docs recién creados

**Síntoma**: tras `POST /documents/{type}` exitoso (status 200 + id válido), un `GET /documents/{type}/{id}` inmediato puede devolver `{"status":0,"info":"..."}` (soft error). El documento existe pero no es legible vía read-by-id durante una ventana corta.

**Workaround**: usar `GET /documents/{type}` con filtro de fecha (`starttmp` + `endtmp` del día del create) para verificar — la respuesta del listing **sí** incluye el documento recién creado. La latencia parece afectar solo al endpoint individual `/{id}`, no al de listado.

Verificado empíricamente 2026-06-03 — el delta entre create y read-by-id consistente fue ~5-30 segundos. Cualquier herramienta MCP que necesite verificar inmediatamente debe usar `list_documents` filtrado, NO `get_document`.

## Quirks por categoría

### 1. Pagination

#### Q1.1 — Page size no determinista en `/api/accounting/v1/dailyledger`

Holded **no documenta** el page size por defecto del libro diario. Empíricamente observado:

- **Tenant pequeño** (< 50 entries en el rango): devuelve todo en una sola página, sin paginación.
- **Tenant medio** (50-300 entries): page size ~250.
- **Tenant grande** (Nova Gestión SL con 408 entries en 2025): page 1 = 155, page 2 = 219, page 3 = 0.

⚠ El page size NO es estable entre páginas dentro de la misma query. Page 1 puede ser menor que page 2.

**Cómo lo manejamos** (V3.G.1):

```ts
// apps/holded-mcp/src/utils.ts
const likelyHasMorePages = itemsInPage > 0;
```

Cualquier página no vacía sugiere probar la siguiente. La pagina vacía cierra el bucle. Coste: 1 llamada extra al final. Beneficio: cero falsos negativos en aggregates fiscales.

#### Q1.2 — `/api/invoicing/v1/contacts` ignora `?page=N`

Holded `/contacts` no soporta paginación nativa. Si pides `?page=2`, devuelve el mismo conjunto que `?page=1` (probablemente la "primera página" implícita).

**Cómo lo manejamos**: el conector descarga TODOS los contactos en una llamada y aplica `slice((page-1)*limit, page*limit)` client-side. Implementado en `paginateInMemory` (`apps/holded-mcp/src/utils.ts`).

Trade-off: cada llamada descarga el dataset completo. Para cuentas con miles de contactos es ineficiente, pero es lo único correcto mientras Holded no exponga paginación real.

#### Q1.3 — `/api/invoicing/v1/documents/{type}` paginación parcial

`/documents/{type}` honra `?page` y `?limit` para los primeros 200 documentos, pero no más allá. Para histórico completo hay que usar el endpoint history con `?year=YYYY` que devuelve un set completo de ese año.

**Cómo lo manejamos**: `apps/app/lib/integrations/accounting.ts:listInvoices` + `listInvoicesHistory` se complementan. Si `listInvoices` (default scope) devuelve 0, intenta `listInvoicesHistory` con `year=currentYear` y luego `year=currentYear-1` (V3.D fallback).

### 2. Respuestas binarias

#### Q2.1 — `/api/invoicing/v1/documents/{type}/{id}/pdf` devuelve JSON cuando no hay PDF

Holded **NO devuelve 404** cuando el documento no tiene PDF adjunto. Devuelve HTTP 200 con body JSON `{"status":0,"info":"No attachments found"}` y, peor, sin `Content-Type` consistente — a veces `application/pdf`, a veces `application/octet-stream`, a veces `application/json`.

**Cómo lo manejamos** (V3.F + V3.F.II + V3.G.1):

```ts
// Validación de magic bytes %PDF- (0x25 0x50 0x44 0x46 0x2D) ANTES de
// exponer al cliente.
const magic = buf.subarray(0, 5).toString('latin1');
const isPdfMagic = magic.startsWith('%PDF-');

if (!isPdfMagic) {
  const body = buf.toString('utf8');
  const parsed = JSON.parse(body); // best-effort
  throw new Error(parsed?.info ?? 'no_attachment');
}
```

Patrón replicado en 4 sitios (cada adapter tiene su propia validación):
- `apps/app/lib/integrations/accounting.ts:getDocumentPdf`
- `apps/app/lib/integrations/accounting.ts:getContactAttachment`
- `apps/app/lib/integrations/accounting.ts:getProductMainImage` + `getProductSecondaryImage`
- `apps/holded-mcp/src/tools/invoicing.ts:get_document_pdf`
- `apps/isaak/app/lib/holded-api.ts:holdedGetDocumentPdf`

Para attachments e imágenes, el helper `ensureHoldedBinaryNotJsonError` acepta 3 modos (`'pdf'`, `'image'`, `'any'`) con magic bytes apropiados (PNG `\x89PNG`, JPEG `\xFF\xD8\xFF`, GIF `GIF8`, WebP `RIFF`, BMP `BM`).

#### Q2.2 — Brotli compression rompe parsing en Vercel Edge

Node.js `fetch` (undici) envía por defecto `Accept-Encoding: br, gzip, deflate`. Holded responde con brotli cuando hay >2KB. La descompresión transparente fallaba detrás del edge proxy de Vercel → `safeJsonParse` recibía bytes truncados → devolvía `[]` o `null` silenciosamente.

**Cómo lo manejamos** (commit `08eb029a`):

```ts
headers: {
  'Accept-Encoding': 'identity', // forzar respuesta sin compresión
  ...
}
```

Aplicado en los 3 adapters. Causa rejection 2 de OpenAI App Review (2026-05-18, "did not produce correct results"). Test de regresión en `accounting.test.ts:20`.

### 3. Filtros server-side poco fiables

#### Q3.1 — `/contacts?type=supplier` mezcla roles

Holded server-side filter `type=supplier` devuelve también contactos con `supplierRecord: 0` (rol histórico inactivo). Sintoma: el modelo pide "lista mis proveedores" y recibe clientes mezclados.

**Cómo lo manejamos** (V3.F + V3.G.1 para Claude):

```ts
const filteredByRole = all.filter((c) => {
  const record = type === 'supplier' ? c.supplierRecord : c.clientRecord;
  if (record === undefined || record === null) return true;
  if (typeof record === 'number') return record > 0;
  if (typeof record === 'object') return Object.keys(record).length > 0;
  return Boolean(record);
});
```

Filtro client-side adicional. Replicado en apps/app y apps/holded-mcp.

#### Q3.2 — `/documents/{type}?status=draft` puede devolver no-drafts

(No verificado contra el live API pero el subagent V3.G.1 audit lo flaggeó como sospechoso.) Si encontramos evidencia, aplicar el mismo patrón que Q3.1: filtro client-side adicional.

### 4. Identificadores

#### Q4.1 — IDs legacy embebidos en documentos

Holded mantiene IDs internos legacy en versiones históricas de documentos. Ejemplo:

- `GET /api/invoicing/v1/documents/invoice/{id}` devuelve un campo `contact` con un id de tipo `69cfb7ca...`.
- Si pasas ese mismo id a `GET /api/invoicing/v1/contacts/{id}` → 404.
- El contacto vivo en el CRM tiene un id diferente.

Esto rompe el "join lógico" documento → contacto. El nombre (`contactName`) sí es estable, el id no.

**Cómo lo manejamos** (V3.F):

```ts
// apps/app/lib/integrations/holdedMcpTools.ts:holded_get_contact
try {
  return await holdedAdapter.getContact(apiKey, contactId);
} catch (err) {
  if (isHoldedNotFound(err)) {
    // Fallback por contactName si el caller lo pasó
    const fallbackName = optionalString(input, 'contactName') ?? optionalString(input, 'name');
    if (fallbackName) {
      const matches = await holdedAdapter.listContacts(apiKey, { name: fallbackName });
      const exact = matches.find((c) => c.name?.toLowerCase() === fallbackName.toLowerCase());
      if (exact ?? matches[0]) return { item: exact ?? matches[0] };
    }
    return notFoundResponse('contact', contactId);
  }
  throw err;
}
```

Tool description actualizada para guiar al modelo a pasar `contactName` junto al `contactId` cuando lo conoce.

#### Q4.2 — `docNumber` visible vs `id` interno

Cada documento Holded tiene dos identificadores:

- `id` (cuid 24 hex) — interno, opaco, devuelto por la API.
- `docNumber` (string visible, e.g. "F0030", "P0045") — lo que el usuario ve en la UI.

ChatGPT/Claude casi siempre intentan pasar el `docNumber` porque es lo que ven en los listings. Sin smart lookup → 404.

**Cómo lo manejamos** (V3.D + V3.F.II):

Smart lookup en `holded_get_invoice` y `holded_get_document`:

```ts
if (/^[a-f0-9]{24}$/i.test(idOrNumber)) {
  return await holdedAdapter.getInvoice(apiKey, idOrNumber); // direct
}
// docNumber → buscar en listings (default + year history)
const matches = await holdedAdapter.listInvoices(apiKey, { page: 1, limit: 100 });
const candidate = matches.find(inv => inv.docNumber === idOrNumber);
if (candidate) return await holdedAdapter.getInvoice(apiKey, candidate.id);
```

### 5. Orden de respuestas

#### Q5.1 — `/dailyledger` orden no garantizado

Holded devuelve los asientos del libro diario en orden interno de Mongo (insertion order, sin garantías). Resultado típico observado por el reviewer:

```
122, 123, 124, 125, 126, 127, 128, 129, 280, 356, 384, ..., 660, 677, 137
```

Imposible cuadrar contablemente.

**Cómo lo manejamos** (V3.G):

```ts
// sortJournalEntries(entries) — orden estable por date ASC + number ASC
const sorted = sortJournalEntries(rawEntries);
```

Aplicado en `apps/holded-mcp/src/utils.ts` y `apps/app/lib/integrations/accounting.ts`. Output del tool incluye `sortApplied: 'date_asc_then_number_asc'` para que el modelo lo sepa.

### 6. Limitaciones críticas (Holded API ≠ Holded UI)

#### Q6.1 — `/chartofaccounts` balances incompletos (BUG 1 reviewer audit 2026-06-01)

**Síntoma**: tenant Nova Gestión SL, 15 cuentas aparecen con saldo 0 cuando tienen saldo real (396.395 € omitidos en total).

Ejemplos comparativos (export "Libro diario 2025" Holded UI vs `/chartofaccounts` API):

| Cuenta | UI nativa | API REST |
|---|---|---|
| 11800000 Aportaciones de socios | −155.200,00 € | 0 € |
| 21100000 Construcciones | 120.000,00 € | 0 € |
| 21600000 Mobiliario | 18.000,00 € | 0 € |
| 21700000 Equipos | 17.200,00 € | 0 € |
| 28110000 Amortización acumulada | −3.461,92 € | 0 € |
| 28160000 Amortización acumulada | −1.706,30 € | 0 € |
| 28170000 Amortización acumulada | −2.417,83 € | 0 € |
| 57200001 Banco nóminas | −29.520,00 € | 0 € |
| 70500000 Prestaciones de servicios | −61.835,00 € | −6.221,00 € |

**Root cause** (hipótesis confirmada por patrón): Holded `/chartofaccounts` solo agrega asientos de **tipo documental** (auto-generados desde facturas/compras). Los **asientos manuales** (amortización, regularización, cierres anuales, aportaciones de socios) se IGNORAN.

**Estado**: No es un bug del conector. Sin documentación pública de Holded sobre cómo solicitar la cobertura completa.

**Mitigación** (V3.G.1):

```ts
// apps/holded-mcp/src/tools/other.ts:get_chart_of_accounts
return {
  content: [{
    type: 'text',
    text: JSON.stringify({
      accounts: data,
      holdedApiCaveat:
        'Balances reflect documental entries only. Manual journal entries '
        + '(amortization, regularization, closings) are NOT included. '
        + 'Re-aggregate via get_journal for an accurate total.',
    }, null, 2)
  }]
};
```

El modelo verá literalmente el `holdedApiCaveat` y puede avisar al usuario.

**Investigación pendiente** (post-aprobación OpenAI):

- Probar `?includeAll=1`, `?type=all`, `?source=manual,documental` (no documentados).
- Verificar si existe `/api/accounting/v1/journal` o `/api/accounting/v1/manualentries`.
- Comparar con lo que devuelve la API de Holded en planes diferentes (Free vs Premium).

Ver `[ROOT_CAUSE_INVESTIGATION]` al final de este doc para los hallazgos del agent investigation 2026-06-01.

#### Q6.2 — `/dailyledger` subset de asientos (BUG 2 reviewer audit 2026-06-01)

**Síntoma**: conector devuelve ~155 de 408 asientos reales del libro diario 2025. Faltan rangos consecutivos enteros (359-372, 426-484, 496-575, 577-659) y tipos enteros (la amortización acumulada real es −2.417,83 €, por API solo se obtiene −229,33 €).

**Root cause**: misma raíz que Q6.1. Holded `/dailyledger` API omite asientos manuales.

**Estado y mitigación**: igual que Q6.1. Caveat añadido a la description de `get_journal`.

### 7. Otros quirks menores

#### Q7.1 — `/contacts` no expone `sort=createdAt`

No hay parámetro nativo para ordenar. Los conectores ordenan client-side antes de paginar.

#### Q7.2 — `/dailyledger` requiere `starttmp` y `endtmp` como mandatory

Si se omiten → Holded devuelve 400. Los conectores aplican defaults conservadores (año en curso) y avisan al modelo via `defaultsAppliedByConnector`.

#### Q7.3 — `/documents/{type}` no respeta `?status` siempre

En tenants donde el campo `status` no está mapeado correctamente, Holded devuelve todos los docs ignorando el filtro. No verificado contra el live API en V3.G.1 — TODO en el changelog.

#### Q7.4 — Rate limits no documentados

Empíricamente: HTTP 429 con `Retry-After` aparece tras ~50 req/s sostenidos. El adapter de apps/app implementa retry con backoff exponencial (200ms × 2^attempt, max 2 retries) para 429/502/503/504.

apps/holded-mcp NO tiene retry — depende del MCP SDK que NO retry por defecto. TODO en el changelog.

apps/isaak NO tiene retry tampoco — TODO post-V1.

---

## [ROOT_CAUSE_INVESTIGATION] BUGS 1+2 · Hallazgos 2026-06-01

### Endpoints alternativos — **NO EXISTEN**

La Accounting API oficial de Holded tiene exactamente **4 endpoints** (verificado contra la spec OpenAPI completa scrapeada en dos forks community independientes):

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/accounting/v1/dailyledger` | GET | listDailyLedger |
| `/api/accounting/v1/dailyledger` (alias `/entry`) | POST | createentry |
| `/api/accounting/v1/chartofaccounts` | GET | listaccounts |
| `/api/accounting/v1/account` | POST | createaccount |

Endpoints probados que NO existen: `/journal`, `/dailybook`, `/accountingbook`, `/entries`, `/manualentries`, `/export/journal`, API v2 (devuelve 403 a todo — requiere OAuth app registrada con Holded Developer).

Fuente: [`energio-es/holded-mcp/holded_api_specs/accounting-api.json`](https://github.com/energio-es/holded-mcp/blob/main/holded_api_specs/accounting-api.json).

### Query params no documentados — **NO HAY**

La spec oficial define solo:

- `/dailyledger`: `page`, `starttmp`, `endtmp`.
- `/chartofaccounts`: `starttmp`, `endtmp`, `includeEmpty` (0|1).

Ningún wrapper community (energio-es, albertov, pepesanchezb, ikerls, BonifacioCalindoro, homedoctor-es) usa params adicionales como `type`, `includeManual`, `source`, `includeAll`. Si existieran, alguien ya los habría documentado.

### Root cause confirmado

**BUG 1 (chartofaccounts incompleto)** — comportamiento de producto Holded, NO bug de la API.

Citado textualmente de [Holded Academy](https://help.holded.com/en/articles/6895943-use-the-predefined-accounting-entries):

> "Si registras los asientos de regularización y cierre manualmente, no aparecerán en el Balance ni en la cuenta de Pérdidas y Ganancias."

Holded por diseño excluye los asientos manuales de cierre/regularización del balance sintético — están pensados para no romper informes intra-año. Los asientos SÍ existen en el libro diario, pero NO se reflejan en `/chartofaccounts`.

**Causa secundaria**: `/chartofaccounts` está scoped al ejercicio fiscal actual por defecto. Si el conector no pasa `starttmp/endtmp` explícitos, Holded usa el rango por defecto del tenant. Confirmado en [energio-es/holded-mcp/ENDPOINT_MAPPING.md](https://github.com/energio-es/holded-mcp/blob/main/ENDPOINT_MAPPING.md).

**BUG 2 (dailyledger subset)** — paginación server-side ausente, NO una limitación de Holded.

La spec dice "limited to 500 entries por respuesta" pero empíricamente Holded devuelve hasta 250 por página. Si no paginas, recibes solo la primera página. Con 408 asientos reales y page 1 = 155, el conector se quedaba en la primera página → 155 de 408 reportados por el reviewer.

Cita relevante de la auditoría interna de un equipo distinto que también tocó Holded ([nobodies-collective/Humans](https://github.com/search?q=nobodies-collective+dailyledger+broken&type=code)):

> "Pagination works `?page=N&limit=M` respected (distinct pages observed). Unlike the broken `dailyledger`."

→ Otros equipos ya habían detectado que el código común que toca dailyledger no estaba paginando correctamente.

### Acciones aplicadas (V3.G.2 — 2026-06-01)

1. **Server-side auto-pagination en los 3 adapters** — el adapter ahora itera `page=1, 2, 3, ...` hasta que recibe menos de `HOLDED_LEDGER_PAGE_SIZE = 250` items o llega a `HOLDED_LEDGER_MAX_PAGES = 10` (≈2500 entries, suficiente para queries trimestrales/anuales típicas). El array agregado se sortea por date ASC + number ASC antes de devolverse.

2. **`/chartofaccounts` acepta y forwardea `starttmp`/`endtmp`** — el modelo puede ahora consultar el balance de un ejercicio fiscal específico. Sin esto, Holded usaba el rango por defecto del tenant que casi nunca coincide con el ejercicio real.

3. **Documentación explícita en las descriptions** — el modelo verá literalmente:
   - `get_chart_of_accounts`: "manual closing/regularization entries are excluded by Holded design — to compute the real balance, re-aggregate from get_journal."
   - `get_journal`: "the connector auto-paginates up to 2500 entries; if you need a wider window, call again with a narrower date range."

4. **Fallback de cómputo real** (TODO post-aprobación OpenAI): añadir una tool `holded_compute_account_balance` que toma una cuenta + rango y devuelve el saldo real aggregado desde el libro diario completo. Sería una superficie nueva, no se mete antes de la aprobación.

### Fuentes consultadas

- Spec OpenAPI Holded (mirror community): https://github.com/energio-es/holded-mcp/blob/main/holded_api_specs/accounting-api.json
- Patrón de paginación 250 vs 500: https://github.com/energio-es/holded-mcp/blob/main/src/tools/accounting/account-balances.ts
- Endpoint mapping con fiscal year scoping: https://github.com/energio-es/holded-mcp/blob/main/ENDPOINT_MAPPING.md
- Holded Academy sobre manuales: https://help.holded.com/en/articles/6895943-use-the-predefined-accounting-entries
- Mirror docs Holded (albertov): https://github.com/albertov/holded-mcp/tree/main/api-docs

## [INVESTIGATION 2] Purchases endpoint · Hallazgos 2026-06-01

> Investigación separada tras reviewer confirmar que Nova Gestión tiene
> facturas de compras visibles en `https://app.holded.com/expenses/list`.

### Q6.3 — `docType` es path parameter en `/documents`, NO query

Confirmado contra spec OpenAPI oficial Holded + 4 wrappers community
(`mawrkus/holded-client`, `iamsamuelfraga/mcp-holded`, `BonifacioCalindoro/holded-python`,
`energio-es/holded-mcp`):

```
GET /api/invoicing/v1/documents/{docType}   ← path parameter, OBLIGATORIO
```

NO funciona como query: `GET /documents?docType=purchase` devuelve subset arbitrario
o ignora el filtro. La sintaxis correcta es siempre path-prefixed con uno de los
docTypes válidos (lista oficial en Q6.4).

### Q6.4 — Lista oficial de docTypes válidos

```
invoice           → Facturas de venta emitidas
salesreceipt      → Tickets de venta
creditnote        → Abonos / rectificativas de venta
salesorder        → Pedidos de venta
proform           → Facturas proforma
waybill           → Albaranes
estimate          → Presupuestos
purchase          → Facturas de COMPRA (gastos / facturas de proveedor)
purchaseorder     → Pedidos a proveedor
purchaserefund    → Abonos de compra (rectificativas de compra)
receiptnote       → Albaranes de recepción (no en todos los wrappers community)
```

**Mapeo UI → API**:

| UI Holded | docType API |
|---|---|
| `app.holded.com/invoices` | `invoice` |
| `app.holded.com/expenses/list` (sección "Gastos") | **`purchase`** + opcionalmente `purchaserefund` |
| Tickets simplificados dentro de Expenses | `purchase` (modelo con flag de "ticket") |
| `app.holded.com/purchaseorder` | `purchaseorder` |
| `app.holded.com/estimates` | `estimate` |

Confirmado por Holded Academy: *"En Holded, la opción Purchase te lleva a Expenses"*
y *"para acceder a las facturas de compra, ve a Expenses > Expenses"*.

### Q6.5 — `expensesaccounts` ≠ `expenses` (semánticas distintas)

`/api/invoicing/v1/expensesaccounts` es el **plan contable de categorías de gasto**
(cuentas 6xx — Suministros, Viajes, etc.), NO los documentos de gasto. Es una
confusión semántica frecuente: la UI "Expenses" tiene dos significados.

### Q6.6 — Bug histórico en `fetchHoldedSnapshot` (cerrado V3.G.3)

Síntoma: el snapshot de Isaak (business context, weekly digest, chat) devolvía
`invoices: []` incluso en tenants ricos como Nova Gestión SL.

Root cause: el código pre-V3.G.3 llamaba `/api/invoicing/v1/documents` SIN docType
en el path y aplicaba como fallback queries `?docType=invoice`, `?doctype=invoice`,
`?type=invoice`, `?documentType=invoice` — TODOS ignorados por Holded.

Fix (V3.G.3): iteración paralela por los 4 docTypes principales
(`invoice`, `purchase`, `creditnote`, `purchaserefund`) usando path-prefix
correcto, devolviendo cada doc tageado con `docType` para que el consumidor
los distinga.

El return shape ahora expone:
- `invoices` (sales — backward compat)
- `purchases` (gastos / facturas de compra)
- `creditnotes` (rectificativas venta)
- `purchaserefunds` (rectificativas compra)
- `documents` (agregado de todos los anteriores)
- `contacts`
- `accounts`

⚠ Nota: el MCP path (`apps/app/api/mcp/holded`) usaba la sintaxis correcta
(`listTypedDocuments(apiKey, docType, args)` con path-prefix) — solo el código
de snapshot interno tenía el bug. La tool `holded_list_documents(docType=purchase)`
expuesta a ChatGPT/Claude SIEMPRE ha funcionado bien.

### Q6.7 — API Holded v2 en preview (junio 2026)

Holded ha lanzado API v2 en preview pública con acceso a producción abriendo
**junio 2026** (este mes). 305 endpoints, REST/JSON, bearer auth, cursor
pagination. OpenAPI spec disponible públicamente. El modelo de docTypes
NO cambia — `purchase` sigue siendo el docType de facturas de compra.

v1 sigue operativa y será soportada durante el periodo de migración (sin
fecha de sunset anunciada).

TODO post-aprobación OpenAI: evaluar migración a v2 cuando esté en producción.

### Fuentes consultadas (Investigación 2)

- [List Documents — Holded API v1](https://developers.holded.com/reference/list-documents-1)
- [DOCUMENTS overview — Holded API](https://developers.holded.com/reference/documents)
- [Create Document — Holded API v1](https://developers.holded.com/reference/create-document-1)
- [Holded Developers Portal](https://www.holded.com/developers)
- [Expenditure: advanced guide — Holded Academy](https://help.holded.com/en/articles/7941994-expenditure-advanced-guide)
- [Manage your purchases — Holded Academy](https://help.holded.com/en/articles/6899952-manage-your-purchases)
- [mawrkus/holded-client (Node wrapper)](https://github.com/mawrkus/holded-client)
- [iamsamuelfraga/mcp-holded (MCP server)](https://github.com/iamsamuelfraga/mcp-holded)
- [BonifacioCalindoro/holded-python](https://github.com/BonifacioCalindoro/holded-python)
- [Rollout — Holded API Essential Guide](https://rollout.com/integration-guides/holded/api-essentials)
- [Unified.to — Holded integration](https://unified.to/integrations/holded)
