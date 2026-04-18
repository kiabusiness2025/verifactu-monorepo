# Holded Connection Architecture

## Visión general

El conector ChatGPT ↔ Holded permite a ChatGPT acceder a los datos de Holded de un tenant autorizado a través del protocolo MCP (Model Context Protocol) sobre JSON-RPC HTTP, autenticado con OAuth 2.0 + PKCE.

```
ChatGPT
  │
  │  MCP JSON-RPC + Bearer token
  ▼
holded.verifactu.business/api/mcp/holded   ← canonical MCP URL
  │  (proxy transparente)
  ▼
app.verifactu.business/api/mcp/holded      ← runtime MCP real
  │  (resuelve conexión Holded del tenant)
  ▼
api.holded.com                              ← API Holded
```

---

## Por qué dos dominios

| Dominio                     | Rol                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `holded.verifactu.business` | Dominio público del producto Holded Connector. URL visible para el usuario y para ChatGPT. Sirve el MCP y actúa como OAuth server (proxiando a app). |
| `app.verifactu.business`    | Backend central del monorepo. Contiene el runtime MCP real, el OAuth server completo (authorize, token, DCR, userinfo), y la BD.                     |

ChatGPT exige que **todos** los endpoints OAuth estén en el mismo dominio que el servidor MCP. Como el MCP está en holded domain, holded también expone `/oauth/register`, `/oauth/token`, `/oauth/authorize` y los `.well-known/*` — todos como proxy o redirect a app.

---

## Mapa de endpoints holded domain

### OAuth Discovery (servidos directamente)

| URL                                                    | RFC       | Descripción                                 |
| ------------------------------------------------------ | --------- | ------------------------------------------- |
| `/.well-known/oauth-authorization-server`              | RFC 8414  | AS metadata. `issuer` = holded domain.      |
| `/.well-known/oauth-protected-resource/api/mcp/holded` | RFC 9728  | Resource metadata. Apunta al issuer holded. |
| `/.well-known/openid-configuration`                    | OIDC Core | OIDC discovery. `issuer` = holded domain.   |
| `/.well-known/openai-apps-challenge`                   | OpenAI    | Verificación de dominio OpenAI Apps.        |

### OAuth Endpoints (proxies a app domain)

| URL holded         | Destino                                  | Tipo         |
| ------------------ | ---------------------------------------- | ------------ |
| `/oauth/authorize` | `app.verifactu.business/oauth/authorize` | 302 redirect |
| `/oauth/token`     | `app.verifactu.business/oauth/token`     | Proxy HTTP   |
| `/oauth/register`  | `app.verifactu.business/oauth/register`  | Proxy HTTP   |

### MCP

| URL               | Tipo                     |
| ----------------- | ------------------------ |
| `/api/mcp/holded` | Proxy transparente a app |

### OAuth Endpoints (solo en app domain — NO proxiados)

| URL app            | Descripción                                        |
| ------------------ | -------------------------------------------------- |
| `/oauth/userinfo`  | Claims OIDC del usuario autenticado                |
| `/oauth/authorize` | Flujo completo de autorización + onboarding Holded |
| `/oauth/token`     | Emisión de access tokens (HMAC firmados)           |
| `/oauth/register`  | DCR — RFC 7591. Devuelve `client_id` determinista. |

---

## Flujo completo de creación de conector en ChatGPT

```
1. Usuario introduce: https://holded.verifactu.business/api/mcp/holded

2. ChatGPT descubre OAuth (dos caminos paralelos):
   a. GET /.well-known/oauth-authorization-server         → issuer=holded, registration_endpoint=holded/oauth/register
   b. GET /.well-known/oauth-protected-resource/api/mcp/holded → authorization_servers=[holded]
   (ambos deben apuntar al MISMO issuer — inconsistencia → 400 Bad Request)

3. ChatGPT valida OIDC:
   GET /.well-known/openid-configuration                 → issuer=holded, scopes=[openid,email,profile,...]

4. ChatGPT registra cliente (DCR automático — RFC 7591):
   POST /oauth/register → proxy → app /oauth/register
   ← 201 Created + { client_id, redirect_uris, scope, ... }
   (RFC 7591 exige HTTP 201, no 200 — ChatGPT interpreta 200 como "no soporta DCR")

5. ── O BIEN ── Registro manual (fallback):
   El usuario obtiene el client_id llamando al DCR con su redirect_uri:
   POST /oauth/register con redirect_uris=["https://chatgpt.com/connector/oauth/XXXX"]
   El client_id devuelto es determinista (SHA-256 de redirect_uris) → siempre el mismo.

6. Usuario autoriza:
   ChatGPT → redirect → holded/oauth/authorize → 302 → app/oauth/authorize
   Usuario completa onboarding Holded en app domain
   app → redirect back → chatgpt.com/...?code=XXX

7. Intercambio de token:
   ChatGPT → POST holded/oauth/token → proxy → app/oauth/token
   ← { access_token, token_type: "Bearer", ... }

8. Llamadas MCP:
   ChatGPT → POST holded/api/mcp/holded (Authorization: Bearer TOKEN)
   → proxy → app/api/mcp/holded
   → app valida token (HMAC), resuelve API key Holded del tenant, llama api.holded.com
```

---

## Reglas críticas de implementación

### 1. Issuer debe coincidir con el dominio de discovery (RFC 8414 §3.2)

```
✗ MALO:  /.well-known/oauth-authorization-server en holded con issuer: app domain
✓ BUENO: /.well-known/oauth-authorization-server en holded con issuer: holded domain
```

ChatGPT valida esta regla estrictamente. Violación → "doesn't support RFC 7591 DCR" (error engañoso).

Los tokens se firman con HMAC (`SESSION_SECRET`) en app domain y **no** validan el issuer URL — cambiar el issuer a holded no rompe la validación de tokens.

### 2. Protected resource y AS metadata deben tener el mismo issuer

```
/.well-known/oauth-authorization-server         → issuer: holded
/.well-known/oauth-protected-resource/...       → authorization_servers: [holded]
```

Si no coinciden → ChatGPT descubre dos issuers distintos → 400 Bad Request al crear conector.

### 3. DCR debe responder 201 Created (RFC 7591 §3.2.1)

```
✗ MALO:  POST /oauth/register → 200 OK
✓ BUENO: POST /oauth/register → 201 Created
```

ChatGPT valida el status code. HTTP 200 → "doesn't support RFC 7591 DCR".

### 4. Proxies deben forzar Accept-Encoding: identity al upstream

```typescript
// En buildUpstreamHeaders() — apps/holded/app/lib/oauth-proxy.ts
headers.set('accept-encoding', 'identity');
```

**Por qué:** Node.js `fetch()` envía `Accept-Encoding: br` por defecto. Vercel en app domain
responde con brotli. El proxy reenvía los bytes brotli al cliente. Vercel en holded puede
re-comprimir → doble compresión o bytes corruptos → `brotli: decoder failed` en ChatGPT.

Además, strip `Content-Encoding` de las respuestas upstream (redundante pero seguro).

### 5. OIDC scopes deben estar en HOLDED_MCP_SUPPORTED_SCOPES

```typescript
// apps/app/lib/integrations/holdedMcpScopes.ts
export const HOLDED_MCP_SUPPORTED_SCOPES = [
  'openid', 'email', 'profile',  // ← obligatorio
  'mcp.read', ...
]
```

`ensureScopesAllowed()` rechaza scopes no listados. ChatGPT solicita `openid email profile`
automáticamente cuando OIDC está habilitado.

---

## Variables de entorno

### apps/holded

| Variable                      | Requerida          | Descripción                                        |
| ----------------------------- | ------------------ | -------------------------------------------------- |
| `NEXT_PUBLIC_HOLDED_SITE_URL` | Sí                 | URL pública de holded domain                       |
| `NEXT_PUBLIC_APP_SITE_URL`    | Sí                 | URL pública de app domain (para userinfo_endpoint) |
| `APP_MCP_INTERNAL_URL`        | Recomendada        | URL interna del MCP en app (evita salto internet)  |
| `APP_OAUTH_INTERNAL_URL`      | Recomendada        | URL base interna de OAuth en app                   |
| `OPENAI_APPS_CHALLENGE`       | Si usa OpenAI Apps | Token de verificación del dominio                  |
| `MCP_DEFAULT_SCOPES`          | Opcional           | Scopes por defecto en DCR (espacio-separados)      |

### apps/app

| Variable                             | Requerida          | Descripción                                                    |
| ------------------------------------ | ------------------ | -------------------------------------------------------------- |
| `MCP_RESOURCE_URL`                   | Sí                 | URL canónica del MCP resource (`holded domain/api/mcp/holded`) |
| `SESSION_SECRET`                     | Sí                 | Secreto HMAC para firmar tokens OAuth                          |
| `MCP_SHARED_SECRET`                  | Opcional           | Secreto para acceso directo sin OAuth (dev/testing)            |
| `OPENAI_APPS_CHALLENGE`              | Si usa OpenAI Apps | Token de verificación del dominio                              |
| `MCP_DEFAULT_SCOPES`                 | Opcional           | Override de scopes por defecto en DCR                          |
| `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS` | Opcional           | Orígenes adicionales para redirect_uri validation              |

---

## Client ID determinista

El DCR en app domain genera un `client_id` determinista:

```typescript
const digest = createHash('sha256')
  .update(redirectUris.sort().join('|'))
  .digest('hex')
  .slice(0, 24);
return `openai-chatgpt-${digest}`;
```

Para obtener el `client_id` de una redirect URI específica:

```bash
curl -s -X POST https://holded.verifactu.business/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris":["https://chatgpt.com/connector/oauth/TU_ID"]}'
# Devuelve: { "client_id": "openai-chatgpt-XXXXXXXXXXXXXXXXXXXXXXXX", ... }
```

Esto permite registro manual en ChatGPT cuando DCR automático falla.

---

## Registro manual de cliente en ChatGPT (fallback)

Si el DCR automático falla (raro), ChatGPT permite registro manual:

1. En "Registro de cliente" → seleccionar **"Cliente OAuth definido por el usuario"**
2. Copiar la **URL de retorno** que muestra ChatGPT (`https://chatgpt.com/connector/oauth/XXX`)
3. Ejecutar el curl anterior con esa URL → obtener `client_id`
4. Pegar el `client_id` en el campo **"ID de cliente de OAuth"**
5. Dejar secreto en blanco (método auth: `none`)
6. Seleccionar los scopes necesarios

---

## Cómo replicar este conector para otro producto (ej. Isaak)

1. **Crear los endpoints en el dominio del producto** (`isaak.verifactu.business`):
   - `app/api/mcp/isaak/route.ts` — proxy a `app.verifactu.business/api/mcp/isaak`
   - `app/oauth/register/route.ts` — proxy usando `oauth-proxy.ts`
   - `app/oauth/token/route.ts` — proxy usando `oauth-proxy.ts`
   - `app/oauth/authorize/route.ts` — 302 redirect a app domain
   - `app/.well-known/oauth-authorization-server/route.ts` — issuer = isaak domain
   - `app/.well-known/oauth-protected-resource/api/mcp/isaak/route.ts` — authorization_servers = [isaak domain]
   - `app/.well-known/openid-configuration/route.ts` — issuer = isaak domain
   - `app/.well-known/openai-apps-challenge/route.ts` — leer env var

2. **En apps/app**:
   - Crear `app/api/mcp/isaak/route.ts` con el runtime MCP específico de Isaak
   - Crear `app/.well-known/oauth-protected-resource/api/mcp/isaak/route.ts`
   - Definir `ISAAK_MCP_TOOL_SCOPES` y `ISAAK_MCP_SUPPORTED_SCOPES`
   - Añadir `MCP_RESOURCE_URL_ISAAK` o adaptar `getMcpResourceUrl()`

3. **Variables de entorno**:
   - `NEXT_PUBLIC_APP_SITE_URL` en isaak domain
   - `APP_MCP_INTERNAL_URL` → app MCP URL para Isaak
   - `APP_OAUTH_INTERNAL_URL` → app base URL
   - `MCP_RESOURCE_URL` en apps/app → isaak domain MCP URL

4. **Verificar reglas críticas**: issuer match, protected resource consistency, 201 on DCR.

---

## Archivos clave del conector

```
apps/holded/
  app/
    .well-known/
      oauth-authorization-server/route.ts        ← AS metadata (issuer=holded)
      oauth-protected-resource/api/mcp/holded/   ← RFC 9728 (authorization_servers=[holded])
      openid-configuration/route.ts              ← OIDC discovery (issuer=holded)
      openai-apps-challenge/route.ts             ← OpenAI domain verification
    api/mcp/holded/route.ts                      ← MCP proxy
    oauth/
      authorize/route.ts                         ← 302 → app
      token/route.ts                             ← proxy → app
      register/route.ts                          ← proxy → app (DCR)
    lib/
      oauth-proxy.ts                             ← Utilidad compartida proxy
      holded-navigation.ts                       ← HOLDED_APP_URL, APP_PUBLIC_URL

apps/app/
  app/
    .well-known/
      oauth-authorization-server/route.ts        ← AS metadata canónico (issuer=app)
      oauth-protected-resource/api/mcp/holded/   ← RFC 9728 (para acceso directo por app domain)
      openid-configuration/route.ts              ← OIDC discovery app domain
      openai-apps-challenge/route.ts             ← OpenAI domain verification
    api/mcp/holded/route.ts                      ← Runtime MCP real
    oauth/
      authorize/route.ts                         ← OAuth + onboarding Holded
      token/route.ts                             ← Emisión de tokens
      register/route.ts                          ← DCR (RFC 7591) — devuelve 201
      userinfo/route.ts                          ← OIDC userinfo claims
  lib/
    oauth/mcp.ts                                 ← getMcpResourceUrl, verifyAccessToken, etc.
    integrations/holdedMcpScopes.ts              ← Scopes y tools Holded
    integrations/holdedMcpTools.ts               ← Implementación de tools MCP
```
