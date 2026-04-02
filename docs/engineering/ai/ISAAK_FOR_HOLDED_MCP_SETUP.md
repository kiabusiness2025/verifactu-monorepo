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
- Catálogo actual:
  - facturas legacy: `holded_list_invoices`, `holded_get_invoice`, `holded_create_invoice_draft`
  - documentos: listar, obtener, crear, actualizar, eliminar
  - contactos: listar, obtener, crear, actualizar, eliminar
  - tesorería: listar, obtener, crear, actualizar
  - cuentas de gasto: listar, obtener, crear, actualizar, eliminar
  - series de numeración: listar, crear, actualizar, eliminar
  - productos: listar, obtener, crear, actualizar, eliminar
  - canales de venta: listar, obtener, crear, actualizar, eliminar
  - almacenes: listar, obtener, crear, actualizar, eliminar
  - pagos: listar, obtener, crear, actualizar, eliminar
  - impuestos: listar
  - métodos de pago: listar
  - grupos de contacto: listar, obtener, crear, actualizar, eliminar
  - remesas: listar, obtener
  - servicios: listar, obtener, crear, actualizar, eliminar
  - apoyo operativo: cuentas contables, bookings CRM, proyectos y tareas

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
- Protected resource metadata del recurso MCP: `apps/app/app/.well-known/oauth-protected-resource/api/mcp/holded/route.ts`

## Flujo completo

1. El usuario conecta Holded desde Verifactu en `Integraciones`.
2. La API key de Holded se cifra y se guarda en `tenant_integrations`.
3. ChatGPT inicia OAuth contra Verifactu.
4. Verifactu usa la sesion del usuario, resuelve su tenant activo y emite `authorization_code`.
5. ChatGPT intercambia el code por un `access_token`.
6. ChatGPT llama al MCP con Bearer token.
7. El MCP resuelve el tenant desde el token OAuth y usa la API key cifrada del tenant para hablar con Holded.

## Flujo holded-first para ChatGPT

Cuando `oauth/authorize` entra con `channel=chatgpt` y el tenant todavia no tiene una conexion compartida valida para ese canal, Verifactu redirige a:

```text
https://app.verifactu.business/onboarding/holded?...&channel=chatgpt
```

Reglas operativas de este flujo:

- ChatGPT no se desbloquea con una integracion generica del tenant. La fuente de verdad es `external_connections` con `provider='holded'` y `channel_key='chatgpt'`.
- `POST /api/integrations/accounting/connect` debe persistir la conexion con `channel_key` y hacer `upsert` por `(tenant_id, provider, channel_key)`.
- `GET /api/integrations/accounting/status?channel=chatgpt` debe resolver el estado real de ese canal para evitar falsos `connected`.
- La pantalla de `channel=chatgpt` usa copy neutro y no presenta Isaak como marca principal mientras el usuario solo esta terminando la conexion para ChatGPT.
- La animacion de espera no bloquea el flujo: el usuario puede pegar la API key en cuanto la tenga, aunque la comprobacion inicial siga en progreso.

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
- Registration URL si la pantalla la soporta: `https://app.verifactu.business/oauth/register`

### Valores

- URL MCP: `https://app.verifactu.business/api/mcp/holded`
- URL de autenticacion: `https://app.verifactu.business/oauth/authorize`
- Token URL: `https://app.verifactu.business/oauth/token`
- Base del servidor de autorizacion: `https://app.verifactu.business`
- Recurso: `https://app.verifactu.business/api/mcp/holded`
- OAuth Client ID: no hay uno fijo global. Si ChatGPT usa `https://app.verifactu.business/oauth/register`, lo obtiene solo. Si una pantalla te obliga a rellenarlo manualmente, primero hay que registrar el cliente con la `redirect_uri` real de OpenAI y usar el `client_id` devuelto.
- OAuth Client Secret: dejar vacio

### Obtener el OAuth Client ID exacto

Si ChatGPT o OpenAI no hace registro dinamico y te pide un `OAuth Client ID` manual, calcula el valor real con la `redirect_uri` que te muestre esa pantalla.

Ejemplo en PowerShell:

```powershell
$body = @{
  client_name = 'OpenAI ChatGPT'
  redirect_uris = @('<REDIRECT_URI_REAL_DE_OPENAI>')
  grant_types = @('authorization_code')
  response_types = @('code')
  token_endpoint_auth_method = 'none'
} | ConvertTo-Json -Depth 5

Invoke-RestMethod \
  -Method Post \
  -Uri 'https://app.verifactu.business/oauth/register' \
  -ContentType 'application/json' \
  -Body $body
```

La respuesta devuelve un `client_id` determinista con formato `openai-chatgpt-<hash>` para esa `redirect_uri`.

### Si OpenAI muestra `This MCP server doesn't support dynamic client registration`

Ese mensaje puede aparecer aunque el servidor si soporte registro dinamico. Si ocurre, continua con alta manual y usa estos criterios:

- `OAuth Client ID`: el `client_id` calculado para la `redirect_uri` exacta de OpenAI
- `OAuth Client Secret`: vacio
- `Token endpoint auth method`: `none`
- `Grant type`: `authorization_code`
- `Response type`: `code`

Para la redirect URI `https://chatgpt.com/connector/oauth/Py3iPxF981UJ`, el valor manual correcto es:

```text
openai-chatgpt-dc3910724e2c913016182543
```

Nota operativa:

- El servidor si soporta DCR mediante `https://app.verifactu.business/oauth/register`.
- Si la UI de OpenAI insiste en alta manual, no es prueba de que DCR falle; normalmente significa que esa pantalla ha decidido no usarlo.

### Si OpenAI devuelve `invalid_scope`

En OpenAI Platform, el campo `Default scopes` no puede contener permisos que no aparezcan en `Supported scopes` para el despliegue que estas apuntando.

Regla operativa:

- `Supported scopes`: es la fuente de verdad
- `Default scopes`: debe ser subconjunto exacto de `Supported scopes`
- `Base scopes`: usa solo `mcp.read`

Si hoy OpenAI te muestra un `Supported scopes` reducido respecto al repo, no pegues el bloque largo documentado arriba. Eso significa que la instancia desplegada todavia no anuncia el catálogo completo.

Para desbloquear la autorizacion en ese caso:

- `Base scopes`: `mcp.read`
- `Default scopes`: pega exactamente los scopes soportados por OpenAI para ese despliegue, excluyendo `mcp.read` si ya lo has puesto en `Base scopes`

Ejemplo seguro con el metadata actualmente visible en produccion:

```text
holded.invoices.read holded.contacts.read holded.accounts.read holded.crm.read holded.projects.read holded.invoices.write
```

Si tu pantalla de OpenAI muestra una lista mas corta en `Supported scopes`, usa esa lista exacta y nada mas.

### Presets disponibles

Preset de review publica (`openai_review_v2`):

```text
mcp.read holded.invoices.read holded.contacts.read holded.accounts.read holded.crm.read holded.projects.read holded.invoices.write
```

Preset operativo por defecto del servidor (`invoicing_accounting`):

```text
mcp.read holded.invoices.read holded.invoices.write holded.documents.read holded.documents.write holded.contacts.read holded.contacts.attachments.read holded.contacts.write holded.accounts.read holded.accounts.write holded.treasury.read holded.treasury.write holded.expenses.read holded.expenses.write holded.numbering.read holded.numbering.write holded.products.read holded.products.media.read holded.products.write holded.payments.read holded.payments.write holded.taxes.read holded.paymentmethods.read holded.remittances.read holded.services.read holded.services.write
```

Catalogo MCP completo (`full`):

```text
mcp.read holded.invoices.read holded.invoices.write holded.documents.read holded.documents.write holded.contacts.read holded.contacts.attachments.read holded.contacts.write holded.accounts.read holded.accounts.write holded.crm.read holded.projects.read holded.treasury.read holded.treasury.write holded.expenses.read holded.expenses.write holded.numbering.read holded.numbering.write holded.products.read holded.products.media.read holded.products.write holded.saleschannels.read holded.saleschannels.write holded.warehouses.read holded.warehouses.write holded.payments.read holded.payments.write holded.taxes.read holded.paymentmethods.read holded.contactgroups.read holded.contactgroups.write holded.remittances.read holded.services.read holded.services.write
```

Solo lectura de todo el catalogo actual (`readonly`):

```text
mcp.read holded.invoices.read holded.documents.read holded.contacts.read holded.contacts.attachments.read holded.accounts.read holded.crm.read holded.projects.read holded.treasury.read holded.expenses.read holded.numbering.read holded.products.read holded.products.media.read holded.saleschannels.read holded.warehouses.read holded.payments.read holded.taxes.read holded.paymentmethods.read holded.contactgroups.read holded.remittances.read holded.services.read
```

### Catalogo completo de scopes soportados

- base: `mcp.read`
- facturas: `holded.invoices.read`, `holded.invoices.write`
- documentos: `holded.documents.read`, `holded.documents.write`
- contactos: `holded.contacts.read`, `holded.contacts.attachments.read`, `holded.contacts.write`
- contabilidad: `holded.accounts.read`, `holded.accounts.write`
- crm y proyectos: `holded.crm.read`, `holded.projects.read`
- tesoreria: `holded.treasury.read`, `holded.treasury.write`
- gastos: `holded.expenses.read`, `holded.expenses.write`
- numeracion: `holded.numbering.read`, `holded.numbering.write`
- productos: `holded.products.read`, `holded.products.media.read`, `holded.products.write`
- canales de venta: `holded.saleschannels.read`, `holded.saleschannels.write`
- almacenes: `holded.warehouses.read`, `holded.warehouses.write`
- pagos: `holded.payments.read`, `holded.payments.write`
- fiscalidad: `holded.taxes.read`, `holded.paymentmethods.read`
- grupos de contacto: `holded.contactgroups.read`, `holded.contactgroups.write`
- remesas: `holded.remittances.read`
- servicios: `holded.services.read`, `holded.services.write`

Si un cliente OAuth no envia `scope`, Verifactu concede por defecto el preset operativo `invoicing_accounting`. Ese bloque da acceso operativo a invoices, documents, contacts, treasury, expense accounts, numbering series, products, payments, taxes, payment methods, remittances, services y cuentas contables, incluyendo ahora adjuntos de contacto, media de producto y escritura contable.

El descriptor MCP publico sigue anunciando el catalogo completo en `scopes_supported`, mientras `default_scopes` depende de `MCP_PUBLIC_SCOPE_PRESET`. Si el cliente obtiene mas scopes explicitos, el catalogo visible se amplia a las tools permitidas por ese token.

Si quieres que ChatGPT siga en review publica, usa `openai_review_v2`. Si quieres que pueda usar todas las tools que hoy anuncia el descriptor MCP, usa `full`. Si pegas menos scopes, las tools fuera de ese permiso dejaran de anunciarse en `tools/list` para ese token y `tools/call` seguira rechazandolas si se invocan sin permiso.

### Valores listos para copiar en ChatGPT

- URL MCP: `https://app.verifactu.business/api/mcp/holded`
- Authorization URL: `https://app.verifactu.business/oauth/authorize`
- Token URL: `https://app.verifactu.business/oauth/token`
- Authorization server base URL: `https://app.verifactu.business`
- Resource: `https://app.verifactu.business/api/mcp/holded`
- Client registration: `Cliente OAuth definido por el usuario`
- Token endpoint auth method: `none`
- Client secret: dejar vacío
- Scopes recomendados para review publica: pegar el bloque `openai_review_v2`
- Scopes recomendados para catalogo completo: pegar el bloque `full`

### OIDC

No esta habilitado todavia. No rellenar configuracion OIDC en esta fase.

## Troubleshooting del onboarding ChatGPT

### Sintoma: bucle en `Preparando tu entorno de conexion`

Si el usuario vuelve una y otra vez a `/onboarding/holded` o la pantalla se queda en espera, comprobar en este orden:

1. `GET /api/integrations/accounting/status?channel=chatgpt` devuelve `connected: true` tras guardar la API key.
2. Existe una fila en `external_connections` para el tenant con `provider='holded'` y `channel_key='chatgpt'`.
3. El despliegue activo de `apps/app` ya contiene el cambio que hace el status channel-aware.
4. `oauth/authorize` para `channel=chatgpt` deja de redirigir a `/onboarding/holded` en cuanto existe esa fila.

Interpretacion:

- Si `tenant_integrations` sale conectado pero ChatGPT sigue en bucle, el problema suele ser una conexion legacy o de `dashboard`, no una conexion real de `chatgpt`.
- Si el status API responde `disconnected` tras guardar la clave, revisar persistencia de `channel_key` antes de mirar OAuth.
- Si el usuario ve una pantalla lenta pero puede pegar la clave y completar la conexion, el problema es de UX o despliegue, no de credenciales.

## Validaciones previas al alta en ChatGPT

Comprobar en navegador:

```text
https://app.verifactu.business/.well-known/oauth-authorization-server
https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded
https://app.verifactu.business/api/mcp/holded
```

Resultados esperados:

- Los dos `.well-known` responden JSON 200.
- `authorization_servers` anuncia el issuer base `https://app.verifactu.business`, no la URL del metadata.
- `GET /api/mcp/holded` responde `200` con el descriptor MCP y el catalogo base de tools.
- `tools/call` sin token responde `401` con `WWW-Authenticate` y `resource_metadata` apuntando a `/.well-known/oauth-protected-resource/api/mcp/holded`.
- El endpoint MCP con token valido amplia el catalogo visible segun scopes y permite ejecutar tools.

## Validacion operativa recomendada

Desde la raiz del monorepo:

```bash
pnpm holded:ci:contract
pnpm holded:demo:validate
```

Uso recomendado:

- `pnpm holded:ci:contract`: gate rapido de PR para tools MCP, scopes y guards.
- `pnpm holded:demo:validate`: seed + smoke real contra el tenant demo antes de despliegues que toquen Holded, ChatGPT u onboarding.

Documentacion extendida:

- `docs/engineering/ai/HOLDED_DEMO_REGRESSION.md`

## Checklist end-to-end

### 1. Tenant

- Existe tenant de pruebas.
- El usuario tiene sesion valida en Verifactu.
- El tenant activo es el correcto.

### 2. Holded

- La API key funciona.
- `POST /api/integrations/accounting/connect` devuelve `ok: true`.
- `GET /api/integrations/accounting/status` devuelve `connected` para dashboard.
- `GET /api/integrations/accounting/status?channel=chatgpt` devuelve `connected` para el flujo ChatGPT.

### 3. OAuth

- ChatGPT redirige a `oauth/authorize`.
- Si no hay sesion, Verifactu redirige a login.
- Tras login, el usuario vuelve a `authorize`.
- `authorize` devuelve `code`.
- `token` devuelve `access_token`.

### 4. MCP

- `GET /api/mcp/holded` responde descriptor base sin token.
- `initialize` responde.
- `tools/list` lista tools Holded sin token y amplia el catalogo con OAuth.
- `tools/call` funciona con token OAuth.

### 5. Tools

- `holded_list_invoices`
- `holded_get_invoice`
- `holded_list_documents`
- `holded_get_document`
- `holded_create_document`
- `holded_update_document`
- `holded_delete_document`
- `holded_send_document`
- `holded_get_document_pdf`
- `holded_update_document_tracking`
- `holded_update_document_pipeline`
- `holded_ship_document_all_items`
- `holded_ship_document_by_lines`
- `holded_get_document_shipped_items`
- `holded_attach_document_file`
- `holded_pay_document`
- `holded_list_contacts`
- `holded_get_contact`
- `holded_list_contact_attachments`
- `holded_get_contact_attachment`
- `holded_create_contact`
- `holded_update_contact`
- `holded_delete_contact`
- `holded_list_treasury_accounts`
- `holded_get_treasury_account`
- `holded_create_treasury_account`
- `holded_update_treasury_account`
- `holded_list_expense_accounts`
- `holded_get_expense_account`
- `holded_create_expense_account`
- `holded_update_expense_account`
- `holded_delete_expense_account`
- `holded_list_numbering_series`
- `holded_create_numbering_series`
- `holded_update_numbering_series`
- `holded_delete_numbering_series`
- `holded_list_products`
- `holded_get_product`
- `holded_get_product_main_image`
- `holded_list_product_images`
- `holded_get_product_secondary_image`
- `holded_update_product_stock`
- `holded_create_product`
- `holded_update_product`
- `holded_delete_product`
- `holded_list_sales_channels`
- `holded_get_sales_channel`
- `holded_create_sales_channel`
- `holded_update_sales_channel`
- `holded_delete_sales_channel`
- `holded_list_warehouses`
- `holded_get_warehouse`
- `holded_create_warehouse`
- `holded_update_warehouse`
- `holded_delete_warehouse`
- `holded_list_payments`
- `holded_get_payment`
- `holded_create_payment`
- `holded_update_payment`
- `holded_delete_payment`
- `holded_list_taxes`
- `holded_list_payment_methods`
- `holded_list_contact_groups`
- `holded_get_contact_group`
- `holded_create_contact_group`
- `holded_update_contact_group`
- `holded_delete_contact_group`
- `holded_list_remittances`
- `holded_get_remittance`
- `holded_list_services`
- `holded_get_service`
- `holded_create_service`
- `holded_update_service`
- `holded_delete_service`
- `holded_list_accounts`
- `holded_list_daily_ledger`
- `holded_create_daily_ledger_entry`
- `holded_create_accounting_account`
- `holded_list_bookings`
- `holded_list_projects`
- `holded_get_project`
- `holded_list_project_tasks`
- `holded_create_invoice_draft`

## Limitaciones actuales

- El transporte MCP sigue siendo un scaffold HTTP JSON-RPC basico.
- Si ChatGPT exige un modo remoto mas estricto, habra que adaptar el transporte a `streaming HTTP` o `SSE`.
- Hay DCR por `oauth/register`, pero OpenAI puede seguir obligando a rellenar el cliente manualmente.
- No hay OIDC completo.
- El fallback `HOLDED_TEST_API_KEY` debe retirarse cuando el tenant ya use integracion persistida.

## Decision tecnica adoptada

No implementar OAuth contra Holded.

Motivos:

- Holded en este caso se autentica por API key.
- La capa segura y multi-tenant debe ser Verifactu.
- ChatGPT nunca debe recibir ni custodiar credenciales Holded.

## Siguiente iteracion recomendada

1. Mantener el smoke vivo para validación manual o job interno, no como CI general.
2. Mantener `holded:ci:contract` como gate rápido de PR para catálogo, scopes y guards.
3. Eliminar fallback global `HOLDED_TEST_API_KEY` del MCP cuando todo el flujo quede forzado por tenant.
4. Adaptar el transporte MCP remoto segun validacion real de ChatGPT.
5. Añadir OIDC si hace falta para claims de email o dominio.

## Referencias

- OpenAI Developer Mode
- OpenAI MCP
- Holded API key
- Holded Invoice API
- Holded Accounting API
