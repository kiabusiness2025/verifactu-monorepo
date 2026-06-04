# Claude MCP Connector

Servidor MCP standalone para Anthropic Claude. Vive como Node.js + Express en `apps/holded-mcp` y se despliega como serverless function en Vercel.

> Path en repo: `apps/holded-mcp/`
> Cliente HTTP a Holded: `apps/holded-mcp/src/holded-client.ts`
> Tools: `apps/holded-mcp/src/tools/*.ts` (invoicing, contacts, other, taxes, ...)
> Despliegue: `claude.verifactu.business` (Vercel)

## Endpoint público

```
POST https://claude.verifactu.business/mcp
Authorization: Bearer <claude_oauth_token>
Content-Type: application/json
```

Discovery vía MCP SDK estándar:

- `.well-known/oauth-authorization-server` (proxy a apps/app)
- `mcp/tools/list` con bearer token

## Diferencias arquitectónicas con ChatGPT MCP

| | ChatGPT MCP (apps/app) | Claude MCP (apps/holded-mcp) |
|---|---|---|
| **SDK** | Implementación custom JSON-RPC | `@modelcontextprotocol/sdk` (oficial Anthropic) |
| **Framework** | Next.js 15 App Router | Node + Express |
| **Despliegue** | Mismo monolito que el dashboard | Vercel function aislada |
| **Tipos de tool definition** | TS interface `HoldedMcpToolDefinition` | `server.tool(name, desc, schema, annotations, handler)` |
| **Output schemas** | JSON Schema inline (V3.H) | No expuestos (MCP SDK ESM puro — ESM stripping en Vercel) |
| **OAuth** | Backend completo en este proceso | Proxy ligero → backend OAuth de apps/app |
| **Persistencia** | Compartida (Prisma + Postgres) | Sin estado propio |
| **Retry HTTP** | Sí (200ms × 2^attempt, max 2) | No nativo (TODO post-aprobación) |
| **Tools** | 10 preset / 29 claude_parity / 50+ admin | 8 submission_v1 / 29 claude_parity |

## Tools del submission v1 (preset Anthropic-approved)

8 tools (nombres sin prefijo `holded_` por convención del directorio Claude):

| Tool | Tipo | Endpoint Holded |
|---|---|---|
| `list_invoices` | read | GET /api/invoicing/v1/documents/invoice |
| `get_invoice` | read | GET /api/invoicing/v1/documents/invoice/{id} |
| `list_contacts` | read (sort+filter client-side) | GET /api/invoicing/v1/contacts |
| `get_contact` | read | GET /api/invoicing/v1/contacts/{id} |
| `get_chart_of_accounts` | read (caveat balances incompletos) | GET /api/accounting/v1/chartofaccounts |
| `get_journal` | read (auto-paginated since V3.G.2) | GET /api/accounting/v1/dailyledger (loop) |
| `get_document_pdf` | read (magic-byte validated) | GET /api/invoicing/v1/documents/{docType}/{id}/pdf |
| `create_invoice_draft` | write (confirm via judge) | POST /api/invoicing/v1/documents/invoice |

## Claude-specific quirks

### 1. ESM-pure MCP SDK

El SDK oficial `@modelcontextprotocol/sdk` es ESM puro. Esto impide:

- Importarlo directamente en jest sin transform (causa el error `SyntaxError: Unexpected token 'export'`).
- Compartir tipos con apps/app (que usa CommonJS interop).

Workaround: tests en Claude connector usan `node --test` con tsx en lugar de jest. Ver `package.json:scripts.test`.

### 2. Pagination wrappers

El SDK no expone metadata de paginación nativa. Los conectores añaden manualmente un objeto `pagination` con `likelyHasMorePages`, `suggestedNextPage`, `hint` (ver `apps/holded-mcp/src/utils.ts:buildPaginationMeta`).

Desde V3.G.2 el campo `likelyHasMorePages` se calcula como `itemsInPage > 0` (cualquier página no vacía → probar siguiente) porque Holded no garantiza páginas llenas.

### 3. WebView detection en login

El form `/auth/holded-direct` (servido por apps/holded) detecta si el navegador es un WebView de Claude mobile (User-Agent específico) y oculta el botón Google sign-in — el WebView no soporta Google OAuth y Firebase devuelve `disallowed_useragent`. Magic link sigue funcionando.

## Configuración de Anthropic submission

Submission v1 (aprobada): 8 tools listadas arriba.

Files relevantes:

- `apps/holded-mcp/src/tools/presets.ts` — define `submission_v1`, `claude_parity`, `admin_full`.
- `docs/anthropic-submission/` — el manifest declarado a Anthropic.
- `apps/holded-mcp/.well-known/` — metadata OAuth (proxy a apps/app).

## Deployment y observability

- **Domain**: `claude.verifactu.business` (CNAME → Vercel).
- **Logs**: Vercel logs accessible via `vercel logs claude-verifactu-business`.
- **Health check**: GET `/health` retorna `{"ok":true,"version":"x.y.z","commit":"abc123"}`.
- **Smoke test**: `pnpm holded:claude:smoke` (script en root package.json — TODO si no existe).

## Cómo añadir una tool (post-aprobación Anthropic v1)

1. Implementa en `apps/holded-mcp/src/tools/invoicing.ts` (o el módulo apropiado).
2. Usa `server.tool(name, description, zodSchema, annotations, handler)`.
3. Añade a `apps/holded-mcp/src/tools/presets.ts` en el preset apropiado.
4. Si requiere endpoint Holded nuevo, añade método al `holded-client.ts`.
5. Añade el test al `package.json:scripts.test` (los tests fuera de esa lista NO se ejecutan automáticamente).
6. Re-submit a Anthropic Claude Connectors si el preset público cambia.
