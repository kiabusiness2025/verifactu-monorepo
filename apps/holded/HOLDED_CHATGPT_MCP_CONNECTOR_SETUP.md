# Holded in ChatGPT: MCP Connector Setup

Guia operativa para registrar `Isaak for Holded` como conector MCP remoto en ChatGPT.

## OpenAI screen: exact values to paste

Use these exact values in the OpenAI connector registration screen.

### 1. Basic connector fields

- `App / Connector name`
  - `Isaak for Holded`
- `MCP Server`
  - `Remote MCP Server`
- `MCP Server URL`
  - `https://app.verifactu.business/api/mcp/holded`
- `Authentication`
  - `OAuth 2.0`

Important:

- do not set authentication to `NONE`
- this connector uses OAuth 2.0 with `authorization_code + PKCE`

### 2. OAuth fields

- `Authorization URL`
  - `https://app.verifactu.business/oauth/authorize`
- `Token URL`
  - `https://app.verifactu.business/oauth/token`
- `Registration URL`
  - `https://app.verifactu.business/oauth/register`
- `Authorization Server Base`
  - `https://app.verifactu.business/.well-known/oauth-authorization-server`
- `Resource`
  - `https://app.verifactu.business/api/mcp/holded`
- `Userinfo URL`
  - `https://app.verifactu.business/oauth/userinfo`
- `Protected Resource Metadata`
  - `https://app.verifactu.business/.well-known/oauth-protected-resource`

### 3. OAuth client fields

Preferred setup:

- let OpenAI use dynamic client registration against:
  - `https://app.verifactu.business/oauth/register`

If the OpenAI screen asks you to manually document the current values:

- `OAuth Client ID`
  - generated dynamically from the redirect URI
- `OAuth Client Secret`
  - leave blank
- `Token Endpoint Auth Method`
  - `none`
- `Grant Type`
  - `authorization_code`
- `Response Type`
  - `code`
- `PKCE`
  - `S256`

Example for the current redirect URI already used in your OpenAI setup:

- `Redirect URI`
  - `https://chatgpt.com/connector/oauth/Py3iPxF981UJ`
- `Derived Client ID`
  - `openai-chatgpt-dc3910724e2c913016182543`
- `Client Secret`
  - blank

### 4. Supported scopes

Use this exact value if the UI asks for `Supported scopes`:

`mcp.read holded.invoices.read holded.contacts.read holded.accounts.read holded.crm.read holded.projects.read holded.invoices.write`

### 5. Default scopes

Use this exact value if the UI asks for `Default scopes`:

`mcp.read holded.invoices.read holded.contacts.read holded.accounts.read holded.crm.read holded.projects.read holded.invoices.write`

### 6. OpenAI Apps challenge / domain verification

- `Challenge Base URL`
  - `https://app.verifactu.business`
- `Challenge Endpoint`
  - `https://app.verifactu.business/.well-known/openai-apps-challenge`

### 7. Tool annotations: exact English justification

These are the exact values and explanations to paste when OpenAI asks for tool annotation justification.

#### `holded_list_invoices`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool only lists invoices for the authenticated tenant's connected Holded account. It does not create, update, send, or delete invoices.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `This tool is restricted to the tenant-scoped Holded connection already authorized in Verifactu. It does not browse the web or access arbitrary third-party resources.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `This tool is a pure read operation and does not modify or remove data.`

#### `holded_get_invoice`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool retrieves one existing invoice by Holded invoice ID. It does not edit or change the invoice.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `It only reads data from the authenticated tenant's connected Holded account.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It does not alter, overwrite, or delete any data.`

#### `holded_list_contacts`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool lists existing contacts or customers in Holded. It does not create or update contacts.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `It only accesses the tenant's connected Holded account and does not reach external open resources.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It is read-only and has no side effects.`

#### `holded_list_accounts`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool lists accounting accounts available in Holded. It does not modify the chart of accounts.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `It is limited to the tenant's authorized Holded integration.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It performs no write or delete action.`

#### `holded_list_bookings`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool lists CRM bookings or agenda items already stored in Holded. It does not create or edit bookings.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `It only reads data from the authenticated tenant's connected Holded environment.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It has no destructive or mutating effect.`

#### `holded_list_projects`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool lists existing projects for the tenant. It does not create or modify projects.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `It is scoped to the connected Holded account for the authorized tenant only.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It does not change any project data.`

#### `holded_get_project`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool retrieves one existing project by ID. It does not update project fields or status.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `It only accesses the tenant's connected Holded account and does not access arbitrary external sources.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It is a read-only lookup with no side effects.`

#### `holded_list_project_tasks`

- `Read Only`
  - `Yes`
- `Why Read Only is true`
  - `This tool lists tasks for an existing project. It does not create, reassign, complete, or delete tasks.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `It is limited to project and task data within the authenticated tenant's Holded connection.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It only reads existing task data.`

#### `holded_create_invoice_draft`

- `Read Only`
  - `No`
- `Why Read Only is false`
  - `This tool creates a new invoice draft in Holded, so it is a real write operation.`
- `Open World`
  - `No`
- `Why Open World is false`
  - `Even though it writes data, it is still scoped to the authenticated tenant's connected Holded account and does not operate on arbitrary open-world resources.`
- `Destructive`
  - `No`
- `Why Destructive is false`
  - `It creates a draft and does not delete or irreversibly destroy existing data. It also requires explicit confirmation via confirm = true.`

## Ready-to-paste English block for OpenAI

Use this section as a direct copy/paste block when completing the OpenAI connector registration form.

```text
MCP Server
Remote MCP Server

MCP Server URL
https://app.verifactu.business/api/mcp/holded

Authentication
OAuth 2.0

Authorization URL
https://app.verifactu.business/oauth/authorize

Token URL
https://app.verifactu.business/oauth/token

Registration URL
https://app.verifactu.business/oauth/register

Authorization Server Base
https://app.verifactu.business/.well-known/oauth-authorization-server

Resource
https://app.verifactu.business/api/mcp/holded

Userinfo URL
https://app.verifactu.business/oauth/userinfo

Protected Resource Metadata
https://app.verifactu.business/.well-known/oauth-protected-resource

OAuth Client ID
Use dynamic client registration. For the current ChatGPT redirect URI https://chatgpt.com/connector/oauth/Py3iPxF981UJ, the derived client_id is:
openai-chatgpt-dc3910724e2c913016182543

OAuth Client Secret
Leave blank. This connector uses a public OAuth client with PKCE and token_endpoint_auth_method = none.

Supported Scopes
mcp.read holded.invoices.read holded.contacts.read holded.accounts.read holded.crm.read holded.projects.read holded.invoices.write

Default Scopes
mcp.read holded.invoices.read holded.contacts.read holded.accounts.read holded.crm.read holded.projects.read holded.invoices.write

Grant Type
authorization_code

Response Type
code

PKCE
S256

Token Endpoint Auth Method
none

Challenge Base URL
https://app.verifactu.business

Challenge Endpoint
https://app.verifactu.business/.well-known/openai-apps-challenge

Tool Justification

holded_list_invoices
Read Only: Yes
Why Read Only is True: This tool only lists invoices for the authenticated tenant's connected Holded account. It does not create, update, send, or delete invoices.
Open World: No
Why Open World is False: This tool is restricted to the tenant-scoped Holded connection already authorized in Verifactu. It does not browse the web or access arbitrary third-party resources.
Destructive: No
Why Destructive is False: This tool is a pure read operation and does not modify or remove data.

holded_get_invoice
Read Only: Yes
Why Read Only is True: This tool retrieves one existing invoice by Holded invoice ID. It does not edit or change the invoice.
Open World: No
Why Open World is False: It only reads data from the authenticated tenant's connected Holded account.
Destructive: No
Why Destructive is False: It does not alter, overwrite, or delete any data.

holded_list_contacts
Read Only: Yes
Why Read Only is True: This tool lists existing contacts or customers in Holded. It does not create or update contacts.
Open World: No
Why Open World is False: It only accesses the tenant's connected Holded account and does not reach external open resources.
Destructive: No
Why Destructive is False: It is read-only and has no side effects.

holded_list_accounts
Read Only: Yes
Why Read Only is True: This tool lists accounting accounts available in Holded. It does not modify the chart of accounts.
Open World: No
Why Open World is False: It is limited to the tenant's authorized Holded integration.
Destructive: No
Why Destructive is False: It performs no write or delete action.

holded_list_bookings
Read Only: Yes
Why Read Only is True: This tool lists CRM bookings or agenda items already stored in Holded. It does not create or edit bookings.
Open World: No
Why Open World is False: It only reads data from the authenticated tenant's connected Holded environment.
Destructive: No
Why Destructive is False: It has no destructive or mutating effect.

holded_list_projects
Read Only: Yes
Why Read Only is True: This tool lists existing projects for the tenant. It does not create or modify projects.
Open World: No
Why Open World is False: It is scoped to the connected Holded account for the authorized tenant only.
Destructive: No
Why Destructive is False: It does not change any project data.

holded_get_project
Read Only: Yes
Why Read Only is True: This tool retrieves one existing project by ID. It does not update project fields or status.
Open World: No
Why Open World is False: It only accesses the tenant's connected Holded account and does not access arbitrary external sources.
Destructive: No
Why Destructive is False: It is a read-only lookup with no side effects.

holded_list_project_tasks
Read Only: Yes
Why Read Only is True: This tool lists tasks for an existing project. It does not create, reassign, complete, or delete tasks.
Open World: No
Why Open World is False: It is limited to project and task data within the authenticated tenant's Holded connection.
Destructive: No
Why Destructive is False: It only reads existing task data.

holded_create_invoice_draft
Read Only: No
Why Read Only is False: This tool creates a new invoice draft in Holded, so it is a real write operation.
Open World: No
Why Open World is False: Even though it writes data, it is still scoped to the authenticated tenant's connected Holded account and does not operate on arbitrary open-world resources.
Destructive: No
Why Destructive is False: It creates a draft and does not delete or irreversibly destroy existing data. It also requires explicit confirmation via confirm = true.
```

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

## Anotaciones MCP y justificacion

Importante para OpenAI:

- si una herramienta no declara correctamente sus anotaciones MCP, el sistema puede asumir por defecto:
  - `readOnlyHint = false`
  - `openWorldHint = true`
  - `destructiveHint = true`
- en este conector eso seria incorrecto para casi todas las tools
- por eso el servidor MCP ya las expone explicitamente en [route.ts](c:\dev\verifactu-monorepo\apps\app\app\api\mcp\holded\route.ts)

### `holded_list_invoices`

- `readOnlyHint = true`
  - solo lista facturas del tenant ya autorizado
  - no crea, edita ni borra datos en Holded
- `openWorldHint = false`
  - solo accede a la cuenta Holded conectada del tenant autenticado en Verifactu
  - no navega internet ni usa fuentes externas abiertas
- `destructiveHint = false`
  - no altera ni elimina informacion

### `holded_get_invoice`

- `readOnlyHint = true`
  - recupera una factura concreta por id
  - no modifica el documento
- `openWorldHint = false`
  - solo consulta la factura dentro de la cuenta Holded conectada del tenant
- `destructiveHint = false`
  - la operacion es de consulta, no de escritura

### `holded_list_contacts`

- `readOnlyHint = true`
  - lista contactos existentes para el tenant autorizado
  - no crea ni modifica contactos
- `openWorldHint = false`
  - se limita a la conexion Holded ya autorizada
- `destructiveHint = false`
  - no cambia datos ni ejecuta acciones irreversibles

### `holded_list_accounts`

- `readOnlyHint = true`
  - lista cuentas contables disponibles en Holded
  - no actualiza el plan contable
- `openWorldHint = false`
  - solo lee datos internos de la cuenta Holded conectada
- `destructiveHint = false`
  - no hay ninguna mutacion

### `holded_list_bookings`

- `readOnlyHint = true`
  - lista reservas o elementos CRM/agendas disponibles
  - no crea ni cambia bookings
- `openWorldHint = false`
  - no consume datos abiertos; trabaja sobre la cuenta Holded autorizada
- `destructiveHint = false`
  - no altera registros

### `holded_list_projects`

- `readOnlyHint = true`
  - lista proyectos existentes para dar contexto operativo
  - no modifica proyectos
- `openWorldHint = false`
  - solo accede a proyectos del tenant conectado
- `destructiveHint = false`
  - no hay impacto de escritura

### `holded_get_project`

- `readOnlyHint = true`
  - obtiene un proyecto concreto por id
  - no cambia su estado ni sus datos
- `openWorldHint = false`
  - la lectura queda acotada al tenant autenticado y a su integracion Holded
- `destructiveHint = false`
  - no produce cambios persistentes

### `holded_list_project_tasks`

- `readOnlyHint = true`
  - lista tareas de un proyecto existente
  - no crea ni cierra tareas
- `openWorldHint = false`
  - opera solo dentro del proyecto y tenant autorizados
- `destructiveHint = false`
  - es una consulta pura

### `holded_create_invoice_draft`

- `readOnlyHint = false`
  - crea un borrador de factura en Holded
  - es una accion de escritura real
- `openWorldHint = false`
  - sigue acotada a la cuenta Holded conectada del tenant autenticado
  - no accede a recursos abiertos de terceros
- `destructiveHint = false`
  - crea un borrador, no elimina ni sobrescribe informacion existente por defecto
  - ademas requiere `confirm = true` para ejecutar la accion

## Mapeo de nombres para el formulario de OpenAI

Si el formulario de OpenAI muestra nombres traducidos automaticamente, este es el mapeo correcto:

- `facturas_lista_retenidas` -> `holded_list_invoices`
- `retenido_obtener_factura` -> `holded_get_invoice`
- `lista_de_contactos_retenida` -> `holded_list_contacts`
- `cuentas_de_lista_mantenidas` -> `holded_list_accounts`
- `reservas_lista_retenidas` -> `holded_list_bookings`
- `proyectos_lista_sostenidos` -> `holded_list_projects`
- `holded_get_project` -> `holded_get_project`
- `tareas_del_proyecto_de_lista_retenida` -> `holded_list_project_tasks`
- `retenido_crear_borrador_de_factura` -> `holded_create_invoice_draft`

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
- `GET /api/mcp/holded` responde `200` con el descriptor MCP base
- `tools/call` sin token responde `401` con cabecera `WWW-Authenticate`

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
