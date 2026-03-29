# Holded in ChatGPT: MCP Connector Setup

Guia operativa para registrar `Isaak for Holded` como conector MCP remoto en ChatGPT.

## Resumen ejecutivo

Punto critico:

- `apps/holded` no expone el servidor MCP
- el conector ChatGPT se conecta contra `app.verifactu.business`

Runtime real del conector:

- MCP server: [apps/app/app/api/mcp/holded/route.ts](c:\dev\verifactu-monorepo\apps\app\app\api\mcp\holded\route.ts)
- OAuth authorize: [apps/app/app/oauth/authorize/route.ts](c:\dev\verifactu-monorepo\apps\app\app\oauth\authorize\route.ts)
- OAuth token: [apps/app/app/oauth/token/route.ts](c:\dev\verifactu-monorepo\apps\app\app\oauth\token\route.ts)
- OAuth register: [apps/app/app/oauth/register/route.ts](c:\dev\verifactu-monorepo\apps\app\app\oauth\register\route.ts)
- OAuth userinfo: [apps/app/app/oauth/userinfo/route.ts](c:\dev\verifactu-monorepo\apps\app\app\oauth\userinfo\route.ts)
- Metadata OAuth: [apps/app/app/.well-known/oauth-authorization-server/route.ts](c:\dev\verifactu-monorepo\apps\app\app.well-known\oauth-authorization-server\route.ts)
- Protected resource metadata: [apps/app/app/.well-known/oauth-protected-resource/route.ts](c:\dev\verifactu-monorepo\apps\app\app.well-known\oauth-protected-resource\route.ts)
- OpenAI apps challenge: [apps/app/app/.well-known/openai-apps-challenge/route.ts](c:\dev\verifactu-monorepo\apps\app\app.well-known\openai-apps-challenge\route.ts)

## Valores exactos para crear el conector

### 1. Servidor MCP

- Tipo: `Servidor MCP remoto`
- URL del servidor MCP: `https://app.verifactu.business/api/mcp/holded`

### 2. Autenticacion

- Tipo: `OAuth 2.0`
- Authorization endpoint: `https://app.verifactu.business/oauth/authorize`
- Token endpoint: `https://app.verifactu.business/oauth/token`
- Registration endpoint: `https://app.verifactu.business/oauth/register`
- Userinfo endpoint: `https://app.verifactu.business/oauth/userinfo`
- Metodo de autenticacion del token endpoint: `none`
- Client ID: se obtiene via registro dinamico en `POST /oauth/register`
- Client secret: vacio
- Grant type soportado: `authorization_code`
- Response type soportado: `code`
- PKCE: `S256`
- Refresh token: no implementado en esta fase

### 3. Metadata OAuth

- Authorization server metadata: `https://app.verifactu.business/.well-known/oauth-authorization-server`
- Protected resource metadata: `https://app.verifactu.business/.well-known/oauth-protected-resource`
- Recurso protegido: `https://app.verifactu.business/api/mcp/holded`

### 3.1 Registro dinamico de cliente

El servidor OAuth de Verifactu expone registro dinamico de cliente para OpenAI:

- `POST https://app.verifactu.business/oauth/register`

Comportamiento:

- cliente publico
- sin `client_secret`
- `token_endpoint_auth_method = none`
- `grant_types = [authorization_code]`
- `response_types = [code]`
- `redirect_uris` validadas contra origenes permitidos

### 4. URL base del desafio

Si la UI de ChatGPT pide la base del dominio para la verificacion o el challenge:

- URL base del desafio: `https://app.verifactu.business`

Endpoint real servido por el proyecto:

- `https://app.verifactu.business/.well-known/openai-apps-challenge`

Variable requerida en despliegue:

- `OPENAI_APPS_CHALLENGE` o `OPENAI_APPS_DOMAIN_CHALLENGE`

### 5. Redirect origins permitidos

El runtime permite por defecto:

- `https://chatgpt.com`
- `https://chat.openai.com`
- `https://platform.openai.com`

Y puede ampliarse via:

- `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS`

## Scopes soportados

Scopes expuestos por el runtime:

- `mcp.read`
- `holded.invoices.read`
- `holded.contacts.read`
- `holded.accounts.read`
- `holded.crm.read`
- `holded.projects.read`
- `holded.invoices.write`

Scopes por defecto:

- `mcp.read`
- `holded.invoices.read`
- `holded.contacts.read`
- `holded.accounts.read`
- `holded.crm.read`
- `holded.projects.read`
- `holded.invoices.write`

## Herramientas disponibles hoy

Tools MCP actuales:

- `holded_list_invoices`
- `holded_get_invoice`
- `holded_list_contacts`
- `holded_list_accounts`
- `holded_list_bookings`
- `holded_list_projects`
- `holded_get_project`
- `holded_list_project_tasks`
- `holded_create_invoice_draft`

## Checklist previo al alta en ChatGPT

### Infraestructura

1. `app.verifactu.business` desplegado y sano.
2. Variables configuradas en `apps/app`:
   - `MCP_OAUTH_SECRET` o `SESSION_SECRET`
   - `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS`
   - `OPENAI_APPS_CHALLENGE` o `OPENAI_APPS_DOMAIN_CHALLENGE`
3. Los endpoints responden:
   - `/.well-known/oauth-authorization-server`
   - `/.well-known/oauth-protected-resource`
   - `/.well-known/openai-apps-challenge`
   - `/oauth/register`
   - `/api/mcp/holded`

### Datos

1. El usuario existe en Verifactu.
2. El usuario tiene tenant activo.
3. El tenant tiene Holded conectado desde `holded.verifactu.business`.

### Seguridad

1. La API key de Holded nunca sale al cliente ChatGPT.
2. El MCP usa la conexion cifrada ya persistida.
3. `MCP_SHARED_SECRET` se considera solo compatibilidad temporal o smoke test.

## Flujo funcional real

1. El usuario se autentica y conecta Holded en `holded.verifactu.business`.
2. La API key se guarda cifrada por tenant.
3. ChatGPT inicia OAuth contra `app.verifactu.business`.
4. Verifactu resuelve usuario y tenant activos.
5. ChatGPT recibe `authorization_code`.
6. ChatGPT lo cambia por `access_token`.
7. ChatGPT llama al MCP con Bearer token.
8. El MCP usa la conexion Holded del tenant y ejecuta las tools.

## Validacion manual minima

Comprobar en navegador:

- `https://app.verifactu.business/.well-known/oauth-authorization-server`
- `https://app.verifactu.business/.well-known/oauth-protected-resource`
- `https://app.verifactu.business/.well-known/openai-apps-challenge`
- `https://app.verifactu.business/api/mcp/holded`

Esperado:

- los `.well-known` responden `200`
- el challenge responde texto plano si esta configurado
- el MCP sin token responde `401` con cabecera `WWW-Authenticate`

## Limitaciones actuales

- no hay refresh token
- no hay OIDC completo
- el token endpoint usa `none` como metodo de autenticacion del cliente
- el registro dinamico devuelve un cliente publico sin secreto
- el conector depende de que el usuario ya tenga Holded conectado en Verifactu

## Errores tipicos

### El conector no conecta

Revisar:

- `MCP_OAUTH_SECRET`
- `SESSION_SECRET`
- `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS`
- challenge configurado
- endpoints `.well-known` accesibles

### ChatGPT pide login pero luego falla el tenant

Revisar:

- sesion valida en Verifactu
- tenant activo resoluble
- Holded conectado para ese tenant

### El MCP responde pero no ve datos de Holded

Revisar:

- `ExternalConnection` del tenant
- estado de la conexion Holded
- API key valida y actualizada

## Fuentes

Fuentes oficiales OpenAI usadas para esta guia:

- Connectors in ChatGPT: https://help.openai.com/en/articles/11487775-connectors-in-chatgpt
- Developer mode and full MCP connectors in ChatGPT: https://help.openai.com/en/articles/12584461
- MCP overview: https://platform.openai.com/docs/mcp/overview
- Apps submission overview: https://help.openai.com/en/articles/20001040-submitting-apps-to-the-chatgpt-app-directory

Fuente oficial Holded usada para la parte de API key:

- https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded
