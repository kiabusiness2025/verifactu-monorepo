# Arquitectura · Conectores Holded

## Vista de 10.000 metros

```
┌────────────────────┐     ┌────────────────────┐
│      ChatGPT       │     │       Claude       │
└──────────┬─────────┘     └──────────┬─────────┘
           │ MCP                       │ MCP
           │ (JSON-RPC over HTTPS)     │ (JSON-RPC over HTTPS)
           ▼                           ▼
┌────────────────────────┐   ┌─────────────────────────────┐
│ apps/app               │   │ apps/holded-mcp             │
│  /app/api/mcp/holded   │   │  (Node.js Express server)   │
│  · OAuth 2.1 + PKCE    │   │  · OAuth 2.1 + PKCE         │
│  · 10 tools + 19 hidden│   │  · 8 tools submission_v1    │
│  · Scope clamp         │   │  · 29 tools claude_parity   │
└──────────┬─────────────┘   └──────────┬──────────────────┘
           │                            │
           │  Llama directamente        │  Llama directamente
           │  con su propio cliente     │  con su propio cliente
           ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│             Holded REST API (api.holded.com)                │
│   /api/invoicing/v1/*  ·  /api/accounting/v1/*  ·  /v1/team │
└─────────────────────────────────────────────────────────────┘
```

## Decisión clave: tres adapters independientes

ChatGPT MCP, Claude MCP e Isaak tienen **clientes HTTP propios** que NO comparten código. Razones históricas:

1. **Claude MCP es un servidor Node standalone** (`apps/holded-mcp`) — desplegado en Vercel como serverless function fuera del monolito Next.js. Necesita ser autocontenido para mantener el bundle pequeño.
2. **ChatGPT MCP vive dentro del monolito** (`apps/app`) — comparte tipos Prisma, middleware, sesiones Firebase y crons con el resto del producto.
3. **Isaak tiene su propio adapter** (`apps/isaak/app/lib/holded-api.ts`) — porque el equipo del chat lo construyó antes que los conectores MCP existieran.

Consecuencia operativa: **un bug del adapter Holded debe arreglarse en los 3 sitios** (o se documenta explícitamente que solo aplica a uno).

### Comparativa

| | ChatGPT MCP (apps/app) | Claude MCP (apps/holded-mcp) | Isaak (apps/isaak) |
|---|---|---|---|
| Framework | Next.js 15 App Router | Node + Express + MCP SDK | Next.js 15 App Router |
| Endpoint MCP | `/api/mcp/holded` | `/mcp` | (no MCP — chat directo) |
| OAuth backend | `/oauth/authorize` en apps/app | Delegado vía proxy a apps/app | N/A (cookie session) |
| Cliente HTTP | `accounting.ts` con retry + backoff | `holded-client.ts` standalone | `holded-api.ts` standalone |
| Esquema tools | `HoldedMcpToolDefinition` (TS type) | `server.tool(...)` (MCP SDK) | Vercel AI SDK tool schemas |
| Output schemas | JSON Schema en cada tool (V3.H) | No expuestos (MCP SDK ESM puro) | No expuestos |
| Tenant ID | Cookie `__session` (HS256) | Token OAuth (cookie + bearer) | Cookie `__session` |
| Tools en producción | 10 (preset `openai_review_invoicing_v1`) | 8 (submission_v1) / 29 (claude_parity) | 19 holded tools + 32 ledger + 6 banking + 8 google + 8 microsoft + 5 sector |
| Crons | `prisma migrate deploy` en build | No (sin estado propio) | (compartidos con apps/app) |
| Tests | jest (apps/app) | node:test + tsx | jest |

## Modelo de tenant

```
User (Firebase Admin)
  └── Membership (rol per tenant)
       └── Tenant
            └── AccountingIntegration (provider='holded')
                 └── api_key_enc (AES-256-GCM ciphertext)
```

Cuando el usuario autoriza el conector:

1. ChatGPT/Claude redirige a `/oauth/authorize?client_id=...&redirect_uri=chatgpt.com/...&...`.
2. El backend autentica al usuario (Firebase) y resuelve su tenant activo.
3. Si el tenant no tiene `accountingIntegration.api_key_enc`, redirige al wizard `/auth/holded-direct` para pegar la API key.
4. El usuario pega la API key, se valida llamando `/api/team/v1/users` contra Holded.
5. La API key se cifra con `HOLDED_KEY_SECRET` y se persiste.
6. El consent screen (`/oauth/consent`) firma un `consent_proof` HMAC con `SESSION_SECRET` (V3.E).
7. Al aceptar, el code se intercambia por un access_token con scope ≤ preset público (V2: 10 tools).
8. ChatGPT/Claude pueden llamar `tools/list` y `tools/call` con el token.

Cada `tools/call` desencripta la API key del tenant del token y llama Holded en nombre del usuario.

## Scope preset y enforcement

Los scopes están declarados en `apps/app/lib/integrations/holdedMcpScopes.ts`:

```ts
const OPENAI_REVIEW_INVOICING_V1_SCOPE_SET = [
  'mcp.read',
  'holded.invoices.read',
  'holded.invoices.write',
  'holded.contacts.read',
  'holded.accounts.read',
  'holded.documents.read',
] as const;
```

10 tools mapean a estos 6 scopes (ver `getAllowedHoldedMcpToolNames(scopes)`). En `/oauth/authorize`:

1. El cliente OAuth puede solicitar scopes arbitrarios en el `scope` param.
2. El backend hace **intersección** con el preset público (`getPublicScopePreset()`).
3. Si el cliente pide algo fuera del preset, se ignora silenciosamente — el code se mintea solo con los scopes intersectados.
4. `tools/list` filtra las tools visibles a las que tienen permiso.

Esto cierra el riesgo de que un cliente OAuth honesto pero malformado expanda accidentalmente el surface.

## Capas del request flow (ejemplo: `tools/call holded_list_invoices`)

```
1. Client (ChatGPT) → POST /api/mcp/holded
   Authorization: Bearer <access_token>
   Body: {"jsonrpc":"2.0","id":1,"method":"tools/call",
          "params":{"name":"holded_list_invoices","arguments":{"page":1,"limit":25}}}
   
2. Route (apps/app/app/api/mcp/holded/route.ts)
   2a. validateBearerToken(access_token) → { tenantId, scope, uid, ... }
   2b. resolveVisibleTools(access) → 10 tools
   2c. callTool({mode:'oauth',tenantId,scope,uid}, 'holded_list_invoices', args)
   
3. callTool (apps/app/lib/integrations/holdedMcpTools.ts)
   3a. requireScopes(['mcp.read','holded.invoices.read'])
   3b. apiKey = await decryptHoldedApiKey(tenantId)
   3c. holdedMcpTools.holded_list_invoices(apiKey, args)
   
4. Handler (holdedMcpTools.ts:806)
   4a. holdedAdapter.listInvoices(apiKey, {page, limit, status, year, from, to})
   4b. Si items vacíos y sin filtros → fallback a year=currentYear y previousYear
   
5. Adapter (accounting.ts:777)
   5a. holdedRequest({method:GET, path:'/api/invoicing/v1/documents/invoice', query:{page,limit,...}})
   5b. Retry 429/502/503/504 hasta 2 veces con backoff exponencial
   5c. Accept-Encoding: identity (sin brotli — fix bug 2026-05-18)
   
6. Holded API
   GET https://api.holded.com/api/invoicing/v1/documents/invoice?page=1&limit=25
   ← 200 OK {[...]}
   
7. Vuelta al route → formatToolResult({items: [...]})
   → text concise para humanos + structuredContent crudo para programas
   → JSON-RPC response 200 OK
```

## Limitaciones conocidas

Tres limitaciones importantes que NO son bugs nuestros sino comportamiento de Holded:

1. **Chart of accounts incompleto** — la API REST de Holded `/chartofaccounts` solo devuelve balances pre-computados que excluyen asientos manuales (amortización, regularización, cierres). Ver [`HOLDED_API_QUIRKS.md`](./HOLDED_API_QUIRKS.md) BUG 1.

2. **Daily ledger subset** — `/dailyledger` devuelve un subconjunto de los asientos visibles en la UI Holded (export "Libro diario"). Documentado en BUG 2 del mismo fichero.

3. **Paginación no determinista** — Holded `/dailyledger` no garantiza un page size estable ni una flag `hasMore`. El conector ahora siempre sugiere probar page+1 hasta recibir array vacío (V3.G.1).

Estas limitaciones se documentan en las tool descriptions vía caveats que el modelo verá literalmente, para que el usuario final reciba un aviso cuando los aggregates puedan ser parciales.
