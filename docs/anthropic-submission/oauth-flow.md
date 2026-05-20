# OAuth 2.1 + PKCE Flow — Holded MCP for Claude

## Resumen técnico

- **Spec:** OAuth 2.1 con PKCE (RFC 7636) S256 mandatorio
- **Authorization Server:** `https://holded-claude.verifactu.business`
- **Resource Server:** `https://holded-claude.verifactu.business/mcp`
- **Discovery:** `https://holded-claude.verifactu.business/.well-known/oauth-authorization-server`
- **Protected resource metadata:** `https://holded-claude.verifactu.business/.well-known/oauth-protected-resource`

## Endpoints

| Endpoint           | Path               | Método    | Auth               |
| ------------------ | ------------------ | --------- | ------------------ |
| Authorization      | `/oauth/authorize` | GET, POST | Public             |
| Token              | `/oauth/token`     | POST      | client_secret_post |
| Registration (DCR) | `/oauth/register`  | POST      | Public             |
| Token revocation   | `/oauth/revoke`    | POST      | Bearer             |
| Userinfo           | `/oauth/userinfo`  | GET       | Bearer             |
| MCP resource       | `/mcp`             | POST      | Bearer             |

## Redirect URI allowlist

```ts
const DEFAULT_ALLOWED_REDIRECT_ORIGINS = ['https://claude.ai', 'https://app.claude.ai'];
```

Configurable vía env `OAUTH_ALLOWED_REDIRECT_ORIGINS` para añadir tenants enterprise de Anthropic si fuera necesario.

## Scopes

| Scope          | Descripción                                                                        |
| -------------- | ---------------------------------------------------------------------------------- |
| `holded:read`  | Lectura de facturas, contactos, productos, proyectos, CRM, contabilidad, tesorería |
| `holded:write` | Crear borradores de factura con `approveDoc=false` forzado por servidor            |

**Default scope:** `holded:read holded:write` (lo que el consent screen pide al usuario)

## PKCE

- `code_challenge_method`: **S256 mandatorio** — `plain` se rechaza con `invalid_request`
- `code_challenge`: 43-128 chars base64url
- `code_verifier`: 43-128 chars unreserved chars

## TTLs

- `OAUTH_AUTH_CODE_TTL_SECONDS`: 600 (10 min)
- `OAUTH_TOKEN_TTL_SECONDS`: 3600 (1h) — access token corto para Claude porque Claude refresca proactivamente
- `OAUTH_REFRESH_TOKEN_TTL_SECONDS`: 2592000 (30 días)

## Flujo del usuario

```
Claude Desktop / Claude.ai
     │
     │ 1. GET /.well-known/oauth-authorization-server
     ▼
Authorization Server descubre endpoints
     │
     │ 2. POST /oauth/register (Dynamic Client Registration)
     ▼
Anthropic recibe client_id + client_secret
     │
     │ 3. Redirige usuario a:
     │    /oauth/authorize?client_id=...&redirect_uri=claude.ai/...
     │                    &code_challenge=...&scope=holded:read+holded:write
     ▼
Consent screen (HTML server-rendered, responsive):
  - "Conecta Holded con Claude"
  - Input email
  - Input API key de Holded
  - Lista de 6 permisos en lenguaje humano
  - Checkboxes T&C + Privacy aceptados
  - Botón "Conectar"
     │
     │ 4. POST a /oauth/authorize con form
     │    → llama F1 helper en apps/app que crea User/Tenant/Connection
     │    → mintea authorization_code (TTL 10min, single-use)
     ▼
Redirect a claude.ai/...?code=...&state=...
     │
     │ 5. Claude hace POST /oauth/token con:
     │      grant_type=authorization_code
     │      code, code_verifier, client_id, client_secret
     ▼
Token endpoint verifica PKCE + mintea access_token (1h) + refresh_token (30d)
     │
     │ 6. Claude llama POST /mcp con Bearer <access_token>
     ▼
MCP server resuelve userId → tenantId → connection → Holded API key
y ejecuta el tool con la API key del usuario
```

## Seguridad

- ✅ HTTPS obligatorio en todos los endpoints
- ✅ PKCE S256 obligatorio
- ✅ State parameter validado contra CSRF
- ✅ Authorization codes single-use (consumidos en token exchange)
- ✅ Refresh token rotation en cada uso
- ✅ Rate limiting (`apiRateLimit` desde express-rate-limit)
- ✅ Bearer token validation en `requireAuth` middleware
- ✅ Origin header validation en CORS
- ✅ Errores 500 devuelven `Internal server error. Reference: <uuid>` (no leak de stack traces)
- ✅ Holded API keys cifradas at rest (AES-256-GCM) y nunca expuestas al cliente OAuth
