# Isaak for Holded MCP

## Objetivo

Exponer `Isaak for Holded` como servidor MCP remoto en:

```text
https://app.verifactu.business/api/mcp/holded
```

El objetivo es que ChatGPT consulte y accione datos de Holded a traves de Verifactu, sin exponer la API key de Holded al cliente final.

## Arquitectura

La autenticacion es mixta:

- ChatGPT -> Verifactu MCP: OAuth propio de Verifactu.
- Verifactu MCP -> Holded: API key de Holded guardada cifrada por tenant.
- Usuario final -> Verifactu: sesion normal de la plataforma.

Holded no se integra por OAuth en este flujo. La documentacion publica usada para esta integracion expone autenticacion por API key.

## Componentes implementados

### MCP

- Ruta MCP: `apps/app/app/api/mcp/holded/route.ts`
- Tools actuales:
  - `holded_list_invoices`
  - `holded_get_invoice`
  - `holded_list_contacts`
  - `holded_list_accounts`
  - `holded_create_invoice_draft`

### Adapter Holded

- Adapter: `apps/app/lib/integrations/accounting.ts`
- Capacidades:
  - probe de conectividad contra Invoice API y Accounting API
  - listado de facturas
  - lectura de factura
  - listado de contactos
  - listado de cuentas contables
  - creacion de documento/factura

### OAuth propio

- Helper OAuth: `apps/app/lib/oauth/mcp.ts`
- Authorization endpoint: `apps/app/app/oauth/authorize/route.ts`
- Token endpoint: `apps/app/app/oauth/token/route.ts`
- Userinfo endpoint: `apps/app/app/oauth/userinfo/route.ts`
- Metadata OAuth: `apps/app/app/.well-known/oauth-authorization-server/route.ts`
- Protected resource metadata: `apps/app/app/.well-known/oauth-protected-resource/route.ts`

## Flujo completo

1. El usuario conecta Holded desde Verifactu en `Integraciones`.
2. La API key de Holded se cifra y se guarda en `tenant_integrations`.
3. ChatGPT inicia OAuth contra Verifactu.
4. Verifactu usa la sesion del usuario, resuelve su tenant activo y emite `authorization_code`.
5. ChatGPT intercambia el code por un `access_token`.
6. ChatGPT llama al MCP con Bearer token.
7. El MCP resuelve el tenant desde el token OAuth y usa la API key cifrada del tenant para hablar con Holded.

## Variables de entorno

En `apps/app/.env.local` o entorno de despliegue:

```env
INTEGRATIONS_SECRET_KEY=...
HOLDED_API_BASE_URL=https://api.holded.com
HOLDED_TIMEOUT_MS=10000
HOLDED_TEST_API_KEY=...
MCP_SHARED_SECRET=...
MCP_OAUTH_SECRET=...
MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS=https://chatgpt.com,https://chat.openai.com
```

Notas:

- `INTEGRATIONS_SECRET_KEY` cifra credenciales persistidas por tenant.
- `HOLDED_TEST_API_KEY` es fallback de pruebas y no deberia usarse como solucion final.
- `MCP_SHARED_SECRET` solo se mantiene como compatibilidad temporal o smoke test.
- `MCP_OAUTH_SECRET` firma `authorization_code` y `access_token`.

## Configuracion de conector en ChatGPT

### Metodo recomendado

- Registro de cliente: `Cliente OAuth definido por el usuario`
- Metodo de autenticacion del token endpoint: `none`
- Secreto de cliente: vacio

### Valores

- URL MCP: `https://app.verifactu.business/api/mcp/holded`
- URL de autenticacion: `https://app.verifactu.business/oauth/authorize`
- Token URL: `https://app.verifactu.business/oauth/token`
- Base del servidor de autorizacion: `https://app.verifactu.business`
- Recurso: `https://app.verifactu.business/api/mcp/holded`

### Scopes por defecto

```text
mcp.read
holded.invoices.read
holded.contacts.read
holded.accounts.read
holded.invoices.write
```

### OIDC

No esta habilitado todavia. No rellenar configuracion OIDC en esta fase.

## Validaciones previas al alta en ChatGPT

Comprobar en navegador:

```text
https://app.verifactu.business/.well-known/oauth-authorization-server
https://app.verifactu.business/.well-known/oauth-protected-resource
https://app.verifactu.business/api/mcp/holded
```

Resultados esperados:

- Los dos `.well-known` responden JSON 200.
- El endpoint MCP sin token responde `401` con `WWW-Authenticate`.
- El endpoint MCP con token valido responde metadata del servidor.

## Checklist end-to-end

### 1. Tenant

- Existe tenant de pruebas.
- El usuario tiene sesion valida en Verifactu.
- El tenant activo es el correcto.

### 2. Holded

- La API key funciona.
- `POST /api/integrations/accounting/connect` devuelve `ok: true`.
- `GET /api/integrations/accounting/status` devuelve `connected`.

### 3. OAuth

- ChatGPT redirige a `oauth/authorize`.
- Si no hay sesion, Verifactu redirige a login.
- Tras login, el usuario vuelve a `authorize`.
- `authorize` devuelve `code`.
- `token` devuelve `access_token`.

### 4. MCP

- `initialize` responde.
- `tools/list` lista tools Holded.
- `tools/call` funciona con token OAuth.

### 5. Tools

- `holded_list_invoices`
- `holded_get_invoice`
- `holded_list_contacts`
- `holded_list_accounts`
- `holded_create_invoice_draft`

## Limitaciones actuales

- El transporte MCP sigue siendo un scaffold HTTP JSON-RPC basico.
- Si ChatGPT exige un modo remoto mas estricto, habra que adaptar el transporte a `streaming HTTP` o `SSE`.
- No hay DCR ni CIMD.
- No hay OIDC completo.
- El fallback `HOLDED_TEST_API_KEY` debe retirarse cuando el tenant ya use integracion persistida.

## Decision tecnica adoptada

No implementar OAuth contra Holded.

Motivos:

- Holded en este caso se autentica por API key.
- La capa segura y multi-tenant debe ser Verifactu.
- ChatGPT nunca debe recibir ni custodiar credenciales Holded.

## Siguiente iteracion recomendada

1. Eliminar fallback global `HOLDED_TEST_API_KEY` del MCP.
2. Forzar credencial Holded por tenant.
3. Adaptar el transporte MCP remoto segun validacion real de ChatGPT.
4. Añadir OIDC si hace falta para claims de email/dominio.
5. Añadir scopes mas finos por tool/accion.

## Referencias

- OpenAI Developer Mode
- OpenAI MCP
- Holded API key
- Holded Invoice API
- Holded Accounting API
