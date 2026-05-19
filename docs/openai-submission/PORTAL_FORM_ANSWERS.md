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
