# Isaak for Holded - Deploy and QA Checklist

## Objetivo

Checklist operativa para desplegar y validar la experiencia publica `holded-first` de `Isaak for Holded`.

Esta guia cubre:

- despliegue de `apps/app`
- validacion de OAuth + MCP
- onboarding `holded-first` por API key
- pruebas manuales minimas antes de seguir hacia review publica

## Alcance actual

Incluido en esta validacion:

- MCP remoto `Isaak for Holded`
- OAuth propio de Verifactu
- onboarding `holded-first`
- conexion Holded por API key server-side
- lectura y escritura controlada de:
  - Invoice
  - Accounting
  - CRM
  - Projects

Fuera de esta validacion:

- Team API
- Apps SDK final de publicacion
- sync bidireccional avanzada

## Variables y secretos a confirmar en produccion

En `apps/app`:

- `SESSION_SECRET`
- `MCP_OAUTH_SECRET`
- `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS`
- `INTEGRATIONS_SECRET_KEY`
- `HOLDED_TEST_API_KEY`
  - solo para test interno y nunca como fallback en produccion real
- `MCP_DEFAULT_TENANT_NAME`
- `MCP_DEFAULT_TENANT_NIF`

Recomendacion:

- mantener `HOLDED_TEST_API_KEY` solo en entornos internos
- no depender de ella en el flujo publico

## Antes del deploy

1. Confirmar que `main` incluye:
   - onboarding en `/onboarding/holded`
   - redirect desde `/oauth/authorize`
   - resolver compartido de conexiones Holded
   - `external_connections` y `channel_identities`
2. Confirmar que la migracion de Prisma de conexiones compartidas esta aplicada o planificada.
3. Confirmar que `app.verifactu.business` apunta al proyecto correcto de `apps/app`.
4. Confirmar que la app interna actual de ChatGPT sigue tratandose como entorno de validacion, no como app publica final.

## Deploy recomendado

1. Desplegar `apps/app`.
2. Verificar en logs de build que compila el proyecto correcto.
3. Si la migracion aun no esta aplicada en la base de datos de produccion:
   - aplicarla antes de validar el flujo completo
   - comprobar que el fallback a `tenant_integrations` no es la unica ruta usada

## Smoke test tecnico tras deploy

Abrir en navegador:

- `https://app.verifactu.business/.well-known/oauth-authorization-server`
- `https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded`
- `https://app.verifactu.business/api/mcp/holded`

Resultado esperado:

- ambos `.well-known` responden `200` con JSON valido
- `GET /api/mcp/holded` responde `401` con `WWW-Authenticate`

## Flujo E2E principal: usuario nuevo en ChatGPT

Caso objetivo:

- usuario llega desde ChatGPT
- no tiene todavia conexion Holded creada
- completa onboarding `holded-first`
- vuelve al flujo OAuth
- ChatGPT queda conectado

Pasos:

1. Abrir la app `Isaak for Holded` en ChatGPT.
2. Pulsar `Conectar con cuenta`.
3. Completar login de Verifactu.
4. Verificar redireccion a `/onboarding/holded`.
5. Confirmar que la pantalla muestra:
   - empresa o tenant resuelto
   - explicacion clara del siguiente paso
   - formulario para pegar API key
6. Pegar una API key valida de Holded.
7. Confirmar que:
   - la API key se valida
   - se guarda server-side
   - el navegador vuelve automaticamente al flujo original
8. Confirmar que ChatGPT termina la conexion sin error.

Resultado esperado:

- no aparece `no_tenant_selected`
- no aparece `invalid_request`
- no vuelve al dashboard salvo que falte configuracion adicional

## Flujo E2E secundario: usuario con conexion ya creada

Pasos:

1. Repetir `Conectar con cuenta` desde ChatGPT con un usuario que ya tiene Holded conectada.
2. Confirmar que no pasa por `/onboarding/holded`.
3. Confirmar que va directo a la autorizacion final.

Resultado esperado:

- reutiliza la conexion compartida existente
- no pide otra vez la API key

## Validacion funcional minima de tools

Desde ChatGPT o desde la app interna de validacion:

1. `holded_list_invoices`
2. `holded_get_invoice`
3. `holded_list_contacts`
4. `holded_list_accounts`
5. `holded_list_bookings`
6. `holded_list_projects`
7. `holded_get_project`
8. `holded_list_project_tasks`
9. `holded_create_invoice_draft`

Resultado esperado:

- lectura responde con datos del tenant correcto
- escritura exige confirmacion
- no devuelve secretos ni ids internos innecesarios

## Validacion de seguridad

1. Confirmar que la API key de Holded no se devuelve al cliente.
2. Confirmar que el tenant usado en ChatGPT coincide con el tenant resuelto en backend.
3. Confirmar que `channel_identities` registra `chatgpt` y `dashboard` de forma idempotente.
4. Confirmar que `external_connections` refleja la conexion compartida cuando la tabla esta desplegada.
5. Confirmar que los logs MCP no exponen payloads sensibles innecesarios.

## Validacion de producto

1. El copy visible debe hablar de `Isaak`, no de un backend tecnico.
2. El onboarding debe sentirse:
   - corto
   - claro
   - seguro
3. El usuario debe entender que:
   - conecta Holded una sola vez
   - despues puede usar ChatGPT y dashboard sobre la misma conexion

## Incidencias tipicas a revisar

- `Route not found`
- `Unauthorized MCP access`
- `invalid_request`
- `no_tenant_selected`
- usuario redirigido al dashboard en vez de al onboarding Holded
- tenant resuelto incorrectamente
- API key valida pero no persistida

## Criterio de salida para seguir hacia review publica

Podemos pasar al siguiente bloque si:

1. El flujo `holded-first` funciona de extremo a extremo.
2. La conexion compartida se reutiliza correctamente desde ChatGPT.
3. El onboarding no depende de pasos manuales fuera del flujo previsto.
4. Las tools publicas iniciales responden con datos reales.
5. No hay errores recurrentes de tenant, auth o redireccion.
