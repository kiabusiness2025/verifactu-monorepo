# ChatGPT MCP Connector

Conector MCP servido desde `apps/app/api/mcp/holded` para que ChatGPT consulte y modifique datos de Holded vía OAuth 2.1 + PKCE.

> Path en repo: `apps/app/app/api/mcp/holded/route.ts` (771 líneas)
> Adapter HTTP a Holded: `apps/app/lib/integrations/accounting.ts` (~1700 líneas)
> Tools: `apps/app/lib/integrations/holdedMcpTools.ts` (~3200 líneas)
> Scopes: `apps/app/lib/integrations/holdedMcpScopes.ts`

## Endpoint público

```
POST https://holded.verifactu.business/api/mcp/holded
Authorization: Bearer <access_token>
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"holded_list_invoices","arguments":{"limit":5}}}
```

### Discovery

ChatGPT descubre las tools automáticamente via:

1. `GET https://holded.verifactu.business/.well-known/oauth-authorization-server` → metadata OAuth.
2. `GET https://holded.verifactu.business/.well-known/oauth-protected-resource` → resource URL.
3. `POST /api/mcp/holded` con `{"method":"initialize"}` → server info.
4. `POST /api/mcp/holded` con `{"method":"tools/list"}` → array de tool definitions (con `inputSchema` y `outputSchema` desde V3.H).

## Preset público (submission v2)

`openai_review_invoicing_v1` — 10 tools:

| Tool | Tipo | Endpoint Holded |
|---|---|---|
| `holded_list_invoices` | read | GET /api/invoicing/v1/documents/invoice |
| `holded_get_invoice` | read | GET /api/invoicing/v1/documents/invoice/{id} |
| `holded_list_documents` | read | GET /api/invoicing/v1/documents/{docType} |
| `holded_get_document` | read | GET /api/invoicing/v1/documents/{docType}/{id} |
| `holded_get_document_pdf` | read | GET /api/invoicing/v1/documents/{docType}/{id}/pdf |
| `holded_list_contacts` | read | GET /api/invoicing/v1/contacts |
| `holded_get_contact` | read | GET /api/invoicing/v1/contacts/{id} |
| `holded_list_accounts` | read | GET /api/accounting/v1/chartofaccounts |
| `holded_list_daily_ledger` | read (auto-paginates) | GET /api/accounting/v1/dailyledger (loop) |
| `holded_create_invoice_draft` | write (confirm:true) | POST /api/invoicing/v1/documents/invoice (approveDoc:false) |

Cobertura de scopes:

```
mcp.read
holded.invoices.read     → list_invoices, get_invoice, list_documents, get_document, get_document_pdf
holded.invoices.write    → create_invoice_draft
holded.contacts.read     → list_contacts, get_contact
holded.accounts.read     → list_accounts, list_daily_ledger
```

## Diferencias vs claude_parity (presets internos)

Hay también el preset `claude_parity` con 29 tools para uso interno post-aprobación (no expuesto a ChatGPT). Y un preset `holded_full_admin` con todas las tools (shared_secret only, para internal admin).

Cambiar el preset público requiere:

1. Actualizar `DEFAULT_PUBLIC_SCOPE_PRESET` en `apps/app/lib/oauth/mcp.ts`.
2. Actualizar `docs/openai-submission/chatgpt-app-submission.json` para que los manifests OpenAI sigan alineados.
3. Re-submitir a OpenAI App Review.

## Annotations declaradas a OpenAI

Las 10 tools usan estas annotations (manifest + runtime alineados — ver `docs/openai-submission/chatgpt-app-submission.json`):

| Tool | readOnlyHint | openWorldHint | destructiveHint |
|---|---|---|---|
| 9 read tools | true | false | false |
| `holded_create_invoice_draft` | false | false | false |

Razonamiento detallado de cada justificación: ver el formulario OpenAI llenado el 2026-06-01 y los comentarios en el código.

## Output formatting

`formatToolResult(data)` en `route.ts:398` produce dos representaciones:

- `content[].text` — markdown conciso human-readable (truncado a ~1500 chars, paginación hint si aplica).
- `structuredContent` — el JSON crudo del handler.

Ejemplo `holded_list_invoices`:

```json
{
  "content": [{
    "type": "text",
    "text": "Found 25 item(s). Showing the first 10:\n\n- **Sample Customer SL** · `abc123...` · 2026-05-15 · 1500 · _approved_\n- ...\n\n_…and 15 more in this page. Use page+limit to paginate._"
  }],
  "structuredContent": {
    "items": [{"id":"...","docNumber":"F0030","total":1500,...}, ...]
  }
}
```

Para empty results devuelve un mensaje explícito ("The connector returned 0 items for this query — this is a valid read-only result, not an error.") para evitar que el modelo interprete vacío como fallo.

## Capas de validación de un `tools/call`

1. **Auth**: bearer token válido (Firebase admin valida la sesión, derive `tenantId`).
2. **Scope**: tool requiere ciertos scopes; access token tiene scope clampado al preset.
3. **Confirm**: si es WRITE, `arguments.confirm === true` obligatorio (devuelve `confirmation_required` si no).
4. **Tenant**: `decryptHoldedApiKey(tenantId)` requiere AccountingIntegration activa.
5. **Holded API**: el handler llama el endpoint Holded con retry + backoff.
6. **Output**: `formatToolResult` formatea + structuredContent crudo.

## Limitaciones conocidas

- `holded_list_daily_ledger` auto-pagina hasta 10 páginas Holded (2500 entries cap). Queries más grandes requieren narrower date range.
- `holded_list_accounts` balances son los pre-computados por Holded — manuales NO incluidos (limitación Holded API, ver [`HOLDED_API_QUIRKS.md`](./HOLDED_API_QUIRKS.md) Q6.1).
- ChatGPT no acepta `dynamic` MCP server descriptions — la tool list es estática post-discovery hasta que el usuario re-conecta el conector.

## Cómo añadir una nueva tool al preset (post-aprobación)

1. Implementa el handler en `holdedMcpTools.ts:holdedMcpTools` con `readTool()` o `writeTool()`.
2. Define `outputSchema` para alinearte con V3.H (recomendado por OpenAI).
3. Añade los scopes al preset en `holdedMcpScopes.ts:OPENAI_REVIEW_INVOICING_V1_SCOPE_SET`.
4. Si requiere un endpoint Holded nuevo, añádelo al adapter `accounting.ts`.
5. Actualiza `docs/openai-submission/chatgpt-app-submission.json` con la justification.
6. Añade tests en `holdedMcpTools.test.ts`.
7. Resubmit a OpenAI con el nuevo manifest.
