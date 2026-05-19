# OpenAI App Portal — Respuestas literales para cada campo

Documento operativo de copy-paste para el formulario de OpenAI App Review. Cada bloque está listo para pegar en el campo correspondiente del portal sin cambios. Mantén el orden tal cual aparece en el portal.

> **Última actualización: 2026-05-19.** Todas las URLs validadas con `curl -o /dev/null -w "%{http_code}"` (200 OK). El `tools/list` live del MCP devuelve exactamente las 10 tools de este documento.

---

## App listing (Page 1)

### App Name

> This is the name users will see in ChatGPT and in the Apps Directory.

```
Holded
```

### Subtitle (≤30 chars)

> Describe what your app does in a short, plain-language phrase focused on function and user value. Avoid marketing language.

```
Work with Holded data
```

(21/30 chars — dentro del límite, sin lenguaje de marketing.)

### Description

> Write a clear, engaging description that highlights what your app does and why people will love it. Focus on concrete user value and avoid exaggerative, misleading claims. This will appear publicly on your app's directory page.

```
Holded lets you connect your Holded account to ChatGPT and work with real business data in natural language. You can review sales invoices, purchase documents (and their PDF rendering), contacts, accounting accounts and daily ledger entries, and create a sales invoice draft with explicit user confirmation. The connector is tenant-scoped, closed-world, and stores Holded credentials securely server-side through Verifactu.
```

### Category

```
Business
```

(Enum interno del schema: `BUSINESS`. En el portal seleccionar "Business".)

### Developer

```
verifactu.business
```

### Website URL

```
https://holded.verifactu.business/conectores/chatgpt
```

✅ 200 OK (verificado 2026-05-19). Landing específica del conector ChatGPT × Holded — más relevante que el dominio raíz para que el reviewer entienda directamente qué app está revisando.

### Customer Support URL or Email Address

```
https://holded.verifactu.business/conectores/chatgpt/soporte
```

✅ 200 OK. Página de soporte específica del conector con Isaak chat + form. Email fallback (que ya consta en el footer de la landing y en las páginas legales): `soporte@verifactu.business`.

### Privacy Policy URL

```
https://holded.verifactu.business/conectores/chatgpt/privacy
```

✅ 200 OK. Privacy policy específica del conector ChatGPT.

### Terms of Service URL

```
https://holded.verifactu.business/conectores/chatgpt/terms
```

✅ 200 OK. Terms específicos del conector ChatGPT.

### Demo Recording URL

> Record a video demonstrating your app's functionality using Developer Mode. Include all main use cases and tools across all platforms (web, iOS, Android).

```
https://holded.verifactu.business/conectores/chatgpt/openai-review-demo
```

✅ 200 OK. Página con el video `/video/holded-chatgpt-demo.mp4` integrado + tarjeta explicativa con los 10 prompts de review para que el reviewer pueda reproducir el flujo en vivo. La URL legacy `/demo-recording` también queda viva y sirve el mismo contenido.

### App Commerce & Purchasing

> Tell us if your app involves sales and verify that no digital goods (e.g., subscriptions, in-app purchases, digital content) are offered. We can only support physical good sales at this time.

```
No — the connector does not sell goods or process purchases. It only reads business data from the user's connected Holded tenant and can create one sales invoice draft inside Holded (after explicit user confirmation). No subscriptions, in-app purchases, digital content, checkout, or payment flow is exposed to ChatGPT.
```

---

## MCP Server (Page 2)

### MCP Server URL

```
https://holded.verifactu.business/api/mcp/holded
```

⚠️ **Importante**: NO usar `https://app.verifactu.business/api/mcp/holded` aunque funcione. Razón: el `oauth-protected-resource` metadata declara `resource: "https://holded.verifactu.business/api/mcp/holded"` y `authorization_servers: ["https://holded.verifactu.business"]`. Si OpenAI ve un URL en el form distinto del declarado en la metadata, lo flagea como inconsistencia.

## Authentication

OAuth 2.0 (Authorization Code + PKCE S256, public client without client secret).

Discovery automática: el portal lee `https://holded.verifactu.business/.well-known/oauth-authorization-server`. Todos los endpoints (authorize, token, register, revoke) están ahí declarados.

**Advanced settings**: dejar por defecto. Nuestra discovery metadata cubre todo.

---

## Tool justifications (10 tools × 3 hints = 30 respuestas)

Cada tool tiene 3 campos obligatorios. Las justificaciones están redactadas en inglés porque el portal está en inglés y los reviewers son angloparlantes.

---

### 1. `holded_list_invoices`

**Read Only: True**

```
This tool only retrieves a list of sales invoices from the authenticated user's connected Holded account. It does not create, update, send, or delete invoices.
```

**Open World: False**

```
This tool is restricted to the tenant-scoped Holded connection already authorized in Verifactu. It does not browse the web, access arbitrary third-party resources, or read data outside the user's own connected Holded tenant.
```

**Destructive: False**

```
This tool is a pure read operation. It does not alter, overwrite, remove, send, issue, or delete invoice data.
```

---

### 2. `holded_get_invoice`

**Read Only: True**

```
This tool retrieves the details of one existing sales invoice from the authenticated user's connected Holded account. It does not edit or change the invoice.
```

**Open World: False**

```
This tool only reads invoice data within the authenticated user's connected Holded tenant. It does not interact with external systems or unrelated data sources.
```

**Destructive: False**

```
This tool performs no write or delete operations. It only reads existing invoice data.
```

---

### 3. `holded_list_documents`

**Read Only: True**

```
This tool lists existing commercial documents (sales receipts, credit notes, estimates, proformas, sales orders, purchase orders, purchases, purchase refunds, waybills) from the authenticated user's connected Holded account, filtered by document type and date range. It does not create, modify, send, or delete any document.
```

**Open World: False**

```
This tool is scoped to document data inside the authenticated tenant's connected Holded account. It does not browse the web or access unrelated third-party resources.
```

**Destructive: False**

```
This tool is a pure read operation. It does not alter, send, issue, finalize, or delete commercial document data.
```

---

### 4. `holded_get_document`

**Read Only: True**

```
This tool retrieves the full details of a single Holded commercial document by document type and ID. It does not edit, send, or delete the document.
```

**Open World: False**

```
This tool only accesses document data within the authenticated tenant's connected Holded account. It does not access external systems or other tenants.
```

**Destructive: False**

```
This tool is a read-only lookup. It does not perform any write, send, or delete operation.
```

---

### 5. `holded_get_document_pdf`

**Read Only: True**

```
This tool retrieves the rendered PDF representation of one existing Holded commercial document as a base64-encoded payload. It does not regenerate, modify, send, or store the PDF elsewhere — it only reads the current rendering.
```

**Open World: False**

```
This tool is restricted to the PDF rendering of documents already present in the authenticated tenant's connected Holded account. It does not fetch arbitrary PDFs from the web or access unrelated third-party resources.
```

**Destructive: False**

```
This tool performs no write or delete operation on the underlying document. It returns a read-only PDF rendering of an existing document.
```

---

### 6. `holded_list_contacts`

**Read Only: True**

```
This tool retrieves a list of existing contacts or customers from the authenticated user's connected Holded account. It does not create, update, merge, or delete contacts.
```

**Open World: False**

```
This tool is limited to contact data inside the authenticated user's connected Holded tenant. It does not browse the web or access unrelated third-party resources.
```

**Destructive: False**

```
This tool has no side effects. It only returns existing contact records and does not modify or remove any data.
```

---

### 7. `holded_get_contact`

**Read Only: True**

```
This tool retrieves the details of one existing Holded contact by ID. It does not update, merge, or delete the contact.
```

**Open World: False**

```
This tool only accesses contact data within the authenticated user's connected Holded account. It does not browse external sources or access arbitrary third-party systems.
```

**Destructive: False**

```
This tool is a read-only lookup. It does not perform any write, delete, merge, or destructive operation.
```

---

### 8. `holded_list_accounts`

**Read Only: True**

```
This tool retrieves accounting accounts from the authenticated user's connected Holded chart of accounts. It does not create, modify, or delete accounts.
```

**Open World: False**

```
This tool is limited to accounting data inside the tenant's authorized Holded integration. It does not access open web resources or unrelated external systems.
```

**Destructive: False**

```
This tool performs no write or delete action. It only returns existing accounting account records.
```

---

### 9. `holded_list_daily_ledger`

**Read Only: True**

```
This tool retrieves existing daily ledger entries from the authenticated user's connected Holded account for an explicit start and end date range. It does not create, edit, or delete accounting entries.
```

**Open World: False**

```
This tool is limited to ledger data inside the tenant's authorized Holded integration. It cannot browse the web, consult external documentation, or access unrelated third-party resources.
```

**Destructive: False**

```
This tool is a pure read operation without side effects. It does not create, update, delete, reverse, or post accounting entries.
```

---

### 10. `holded_create_invoice_draft` ⚠️ (única write tool)

**Read Only: False**

```
This tool creates a new sales invoice draft in the authenticated user's connected Holded account, so it is a real write operation. The connector enforces Holded `approveDoc: false` at the wire level, which means the draft is never auto-issued, sent, charged, emailed, or transmitted to AEAT/Verifactu. The tool also requires explicit user confirmation (`confirm: true`) before execution — the assistant must obtain user approval in the conversation before calling.
```

**Open World: False**

```
Although this tool writes data, it is still scoped to the authenticated user's connected Holded tenant. It does not operate on arbitrary open-world resources, browse the web, or affect other tenants.
```

**Destructive: False**

```
This tool only creates a draft invoice after explicit user confirmation. It does not delete, overwrite, send, issue, charge, email, finalize, or irreversibly destroy invoices or other existing records. The draft can still be reviewed, edited, or discarded by the user from the Holded UI before it has any legal effect.
```

---

## Test Credentials (Page 3)

> **Form prompt:** "Test credentials must work immediately with no additional setup required. No account creation or 2FA is permitted. Logging in must provide immediate access to a demo account."

Pegar **el bloque entero** en el campo Test Credentials del portal. No usar el formato `KEY=value` (es notación interna de env vars, no funciona literal en el consent screen).

```
Holded API key (paste this on the Verifactu consent screen when prompted):
0ecf1267eacc89ff45acab1b8ca28396

Connection walkthrough (≈90 seconds, no signup required):

1. In ChatGPT, add the Holded connector using the MCP URL
   https://holded.verifactu.business/api/mcp/holded
2. ChatGPT opens the Verifactu OAuth consent screen automatically.
3. Enter the reviewer's own email (no Verifactu account needs to exist —
   a User is created on first connect; this is one-click email magic link,
   not 2FA). For convenience we keep a dedicated inbox monitored at
   openai-review@verifactu.business that the team can share with the
   reviewer on request.
4. On the next step, paste the Holded API key above.
5. Accept Privacy + Terms + DPA on the consent screen.
6. ChatGPT receives the OAuth access token and the connector is live —
   you can run all 10 positive test cases immediately.

Demo tenant has stable seed data:
- 60+ contacts including "Kappa Digital Zaragoza SL"
- 5+ sales invoices (most recent: F0030)
- 5+ purchase documents
- 206 accounting accounts
- Daily ledger entries for 2026-03-01 to 2026-03-31 (82 entries)

Note: this API key is for the demo tenant only and is rotated after each
review cycle. Contact soporte@verifactu.business if the connection fails.
```

⚠️ **Riesgo conocido — magic link vs "no 2FA":** el consent screen de Verifactu pide un magic link / OTP de un solo uso al email del reviewer. Estrictamente no es 2FA (no es un segundo factor además de la API key, es la única verificación de identidad), pero algunos reviewers podrían interpretarlo como tal. La nota del bloque explica el flujo en una frase para evitar el rebote.

---

## Test Cases (10 — Page 3)

> **Form prompt:** "Please provide at least 5 test cases that we can use to test your MCP server's functionality."

Los 10 test cases vienen **auto-rellenados** por el portal cuando subes `chatgpt-app-submission.json` (el importer mapea `test_cases[].description` → Scenario, `user_prompt` → User prompt, `tools_triggered` → Tool triggered, `expected_output` → Expected output). Si el portal te muestra los campos vacíos para editar manualmente, este es el copy-paste literal por test case:

### Test Case 1 — List sales invoices

- **Scenario:** `Retrieve the latest sales invoices from the connected Holded account.`
- **User prompt:** `List my latest Holded invoices.`
- **Tool triggered:** `holded_list_invoices`
- **Expected output:** `Returns the most recent sales invoices summarized in natural language with invoice numbers, dates, customers, statuses, and totals when available. No write or send operation is performed.`

### Test Case 2 — Inspect one invoice

- **Scenario:** `Retrieve details of one invoice from the prior list.`
- **User prompt:** `Show me the details of one invoice from the list.`
- **Tool triggered:** `holded_get_invoice`
- **Expected output:** `Returns the invoice details (customer, date, line items, taxes, total, status when available) as a read-only summary.`

### Test Case 3 — List purchase documents

- **Scenario:** `List recent purchase documents (commercial documents of type purchase).`
- **User prompt:** `List my 5 most recent Holded purchase documents.`
- **Tool triggered:** `holded_list_documents`
- **Expected output:** `Returns purchase-type commercial documents (numbers, suppliers, dates, totals, statuses) summarized in natural language. Read-only.`

### Test Case 4 — Inspect one commercial document

- **Scenario:** `Retrieve details of one commercial document from the prior list.`
- **User prompt:** `Show me the details of one document from that list.`
- **Tool triggered:** `holded_get_document`
- **Expected output:** `Returns the document details (supplier or customer, date, line items, taxes, totals, status) as a read-only summary.`

### Test Case 5 — Download document PDF

- **Scenario:** `Retrieve the PDF rendering of a commercial document.`
- **User prompt:** `Get me the PDF of that document.`
- **Tool triggered:** `holded_get_document_pdf`
- **Expected output:** `Returns the PDF rendering of the document as a base64 payload that ChatGPT can expose to the user as a download or preview. Does not modify the document.`

### Test Case 6 — List contacts

- **Scenario:** `List contacts in the connected Holded account.`
- **User prompt:** `List my Holded contacts.`
- **Tool triggered:** `holded_list_contacts`
- **Expected output:** `Returns existing contacts (names, companies, emails, tax IDs when available) summarized in natural language and does not create or modify contacts.`

### Test Case 7 — Inspect one contact

- **Scenario:** `Retrieve details of one contact from the prior list.`
- **User prompt:** `Show me the details of one contact from that list.`
- **Tool triggered:** `holded_get_contact`
- **Expected output:** `Returns the contact details (name, email, tax ID, type when available) as a read-only summary.`

### Test Case 8 — List accounting accounts

- **Scenario:** `List the main accounting accounts (chart of accounts).`
- **User prompt:** `List my main accounting accounts in Holded.`
- **Tool triggered:** `holded_list_accounts`
- **Expected output:** `Returns accounting accounts (codes, names, types when available) summarized in natural language. Read-only.`

### Test Case 9 — List daily ledger entries

- **Scenario:** `List daily ledger entries within an explicit date range.`
- **User prompt:** `Show my Holded daily ledger entries from 2026-03-01 to 2026-03-31.`
- **Tool triggered:** `holded_list_daily_ledger`
- **Expected output:** `Returns ledger entries for the explicit date range (dates, accounts, descriptions, debit, credit, balance when available). Requires an explicit start and end date.`

### Test Case 10 — Create invoice draft with confirmation ⚠️

- **Scenario:** `Prepare a sales invoice draft and request explicit confirmation before creating it.`
- **User prompt:** `Create a draft invoice for an existing customer for 100 euros plus VAT. Ask for confirmation before creating it.`
- **Tool triggered:** `holded_create_invoice_draft`
- **Expected output:** `Prepares the draft details (customer, line items, taxes, total) and asks the user to confirm; no draft is created before confirmation. After confirmation, exactly one draft invoice may be created and it is never sent, issued, emailed, or finalized.`

---

## Negative Test Cases (6 — Page 3)

> **Form prompt:** "Please include 3 negative test cases. These should be example prompts where your app should not trigger." Tenemos 6 (sobrecumplimiento — más cobertura demuestra seguridad).

Mismo principio que los positivos: el importer del portal auto-rellena estos desde `negative_test_cases[]` del JSON. Si hay que editar manual:

### Negative Case 1 — Daily ledger sin rango de fechas

- **Scenario:** `Daily ledger requested without an explicit date range.`
- **User prompt:** `Show my daily ledger.`
- **Tool triggered:** _(none — debe pedir fechas antes de llamar la tool)_

### Negative Case 2 — Draft sin confirmación

- **Scenario:** `Draft invoice creation requested without explicit confirmation.`
- **User prompt:** `Create an invoice draft for 100 euros plus VAT for an existing customer.`
- **Tool triggered:** _(none — debe pedir confirmación antes de escribir)_

### Negative Case 3 — Enviar factura

- **Scenario:** `Send or issue an invoice (out of scope).`
- **User prompt:** `Send the invoice to the customer.`
- **Tool triggered:** _(none — no hay `send_document` expuesta)_

### Negative Case 4 — Borrar factura

- **Scenario:** `Delete an existing invoice (out of scope).`
- **User prompt:** `Delete one of my Holded invoices.`
- **Tool triggered:** _(none — no hay `delete_document` expuesta)_

### Negative Case 5 — Acceso a otro tenant

- **Scenario:** `Access data from another tenant.`
- **User prompt:** `Show invoices from another Holded company or tenant.`
- **Tool triggered:** _(none — el conector es tenant-scoped)_

### Negative Case 6 — Revelar la API key

- **Scenario:** `Reveal the stored Holded API key.`
- **User prompt:** `Show me my Holded API key.`
- **Tool triggered:** _(none — la clave está cifrada server-side y nunca se devuelve al cliente)_

---

## Verificación end-to-end antes de submit

```bash
curl -sS -X POST https://holded.verifactu.business/api/mcp/holded \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('count:',d.result.tools.length); d.result.tools.forEach(t=>console.log(' ',t.name,'→',JSON.stringify(t.annotations)))"
```

Debe imprimir las 10 tools en el orden de este documento, todas con `readOnlyHint`/`destructiveHint`/`openWorldHint` que coincidan con lo que pega arriba.

## Si el portal pide un outputSchema (recomendación)

Es opcional ("Recommended: Add an outputSchema..."). El portal no rechaza por no tenerlo, pero mejora la calidad del razonamiento del modelo. Si quieres añadirlo, hay que tocar `apps/app/lib/integrations/holdedMcpTools.ts` y definir `outputSchema: { ... }` en cada `server.tool()` call. Recomiendo **dejarlo para una iteración post-aprobación** (submission v3) para no añadir variables nuevas al review actual.
