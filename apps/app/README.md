# verifactu.business core (`apps/app`)

`apps/app` es el core canonico de negocio del monorepo y, ademas, el runtime real del conector remoto Holded/MCP.

No es la landing de captacion Holded ni la experiencia principal de chat de Isaak, pero si es la capa que publica el servidor MCP, el OAuth y buena parte de las integraciones compartidas.

## Que resuelve este proyecto

`apps/app` tiene dos responsabilidades principales:

1. Core canonico compartido para tenancy, datos, configuracion y operaciones complejas.
2. Runtime del conector remoto que OpenAI y otros clientes OAuth consumen para acceder a Holded.

## Ownership

Este proyecto es la fuente de verdad para:

- tenants
- users
- memberships
- subscriptions
- billing y acceso a plan
- configuracion fiscal y contable compleja
- VeriFactu
- ajustes avanzados de empresa
- APIs internas canonicas
- runtime MCP remoto de Holded
- endpoints OAuth y metadata `/.well-known/*`
- resolucion de conexiones Holded compartidas entre dashboard, Isaak y ChatGPT

## Rutas clave del conector MCP

Si trabajas en el conector, las rutas mas importantes viven aqui:

- `/api/mcp/holded` -> endpoint JSON-RPC MCP
- `/.well-known/oauth-authorization-server` -> metadata OAuth publica
- `/.well-known/oauth-protected-resource` -> metadata protegida base
- `/.well-known/oauth-protected-resource/api/mcp/holded` -> metadata del recurso MCP Holded
- `/oauth/authorize` -> autorizacion OAuth
- `/oauth/token` -> intercambio de tokens
- `/oauth/register` -> registro dinamico de cliente
- `/oauth/userinfo` -> informacion basica del usuario autorizado

## Donde se define el contrato visible del conector

La visibilidad real del conector no sale de un unico archivo. Se reparte asi:

- [app/api/mcp/holded/route.ts](./app/api/mcp/holded/route.ts) -> auth, descubrimiento MCP y visibilidad final de tools
- [lib/integrations/holdedMcpTools.ts](./lib/integrations/holdedMcpTools.ts) -> catalogo y schemas de tools
- [lib/integrations/holdedMcpScopes.ts](./lib/integrations/holdedMcpScopes.ts) -> scopes, presets y mapeo tool -> scope
- [lib/oauth/mcp.ts](./lib/oauth/mcp.ts) -> scopes anunciados, defaults y validacion OAuth

Matiz importante desde abril 2026:

- `scopes_supported` anuncia el catalogo completo de scopes Holded soportados por el runtime
- `default_scopes` puede seguir usando un preset mas estrecho, por ejemplo `openai_review_v2`
- si una app interna necesita mas tools, el cambio no va en `HOLDED_MCP_TOOL_SCOPES`, sino en que el cliente OAuth solicite scopes adicionales y en que `lib/oauth/mcp.ts` los admita

## Preset publico actual del conector Holded Beta

Distinguir siempre entre tres niveles:

- `scopes_supported` -> catalogo completo de scopes y familias que el runtime sabe manejar
- `default_scopes` -> preset publico que se expone por defecto al conector en revision
- datos del tenant -> que una tool exista no implica que haya datos utiles en la cuenta conectada

En abril de 2026, el preset publico `openai_review_v2` expone 11 tools y esa es la superficie real que hoy puede validar ChatGPT/OpenAI sin scopes adicionales:

- `holded_list_invoices`
- `holded_get_invoice`
- `holded_create_invoice_draft`
- `holded_list_contacts`
- `holded_get_contact`
- `holded_list_accounts`
- `holded_list_daily_ledger`
- `holded_list_bookings`
- `holded_list_projects`
- `holded_get_project`
- `holded_list_project_tasks`

## Matriz de capacidades del preset publico `openai_review_v2`

La tabla siguiente describe el beta publico actual. No describe por si sola todo el catalogo interno soportado por el runtime.

| Area                        | Lectura directa   | Lectura indirecta | Escritura                  | Estado de prueba       | Observacion                                                                                                                           |
| --------------------------- | ----------------- | ----------------- | -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Facturas                    | Si                | Si                | Si                         | Probado                | `holded_list_invoices`, `holded_get_invoice`, `holded_create_invoice_draft`                                                           |
| Contactos                   | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_contacts`, `holded_get_contact`                                                                                          |
| Cuentas contables           | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_accounts`                                                                                                                |
| Asientos contables / diario | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_daily_ledger`                                                                                                            |
| Gastos / purchase docs      | No                | Si                | No expuesto en este preset | Probado indirectamente | Aparecen en el diario como `purchase`, con referencias tipo `R0001`, `R0002` y cuentas de gasto                                       |
| Impuestos                   | No                | Si                | No expuesto en este preset | Probado indirectamente | Se ven por lineas de IVA y por cuentas fiscales como `472` y `477`                                                                    |
| Bancos / treasury           | No                | Si                | No expuesto en este preset | Probado indirectamente | Se ven por cuentas bancarias y movimientos reflejados en el diario                                                                    |
| Proyectos                   | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_projects`, `holded_get_project`, `holded_list_project_tasks`; puede devolver lista vacia si el tenant no tiene proyectos |
| Tareas de proyecto          | Si                | -                 | No expuesto en este preset | No probado utilmente   | Depende de contar con un `projectId` visible                                                                                          |
| Bookings / agenda CRM       | Si                | -                 | No expuesto en este preset | No probado             | `holded_list_bookings` existe en el preset publico                                                                                    |
| Productos / items           | No en este preset | No claro          | No expuesto en este preset | No expuesto            | No forma parte del beta publico actual                                                                                                |
| Usuarios                    | No                | No                | No expuesto                | No expuesto            | No existe familia MCP publica para usuarios                                                                                           |
| Documentos adjuntos         | No en este preset | No                | No expuesto en este preset | No expuesto            | No forma parte del beta publico actual                                                                                                |
| Conciliacion bancaria       | No                | No claro          | No expuesto                | No expuesto            | No hay herramienta especifica en el beta publico actual                                                                               |
| Presupuestos                | No                | No claro          | No expuesto                | No expuesto            | No hay herramienta especifica en el beta publico actual                                                                               |
| Pedidos                     | No                | No claro          | No expuesto                | No expuesto            | No hay herramienta especifica en el beta publico actual                                                                               |
| Albaranes                   | No                | No claro          | No expuesto                | No expuesto            | No hay herramienta especifica en el beta publico actual                                                                               |

Conclusion operativa para este preset:

- capacidad fuerte actual -> facturacion, contactos, cuentas contables, diario, contexto CRM y proyectos
- capacidad indirecta pero util -> gastos, IVA y parte de tesoreria via diario y cuentas
- fuera del beta publico actual -> inventario, usuarios, adjuntos, conciliacion y otros documentos comerciales fuera del flujo de factura

Regla practica:

- si cambias una tool, casi seguro tocas `holdedMcpTools.ts`
- si cambias acceso o visibilidad, casi seguro tocas `holdedMcpScopes.ts` o `lib/oauth/mcp.ts`
- si cambias descubrimiento, auth o respuesta MCP, tocas `app/api/mcp/holded/route.ts`

## Regla principal de modelo de datos

Cuando exista duda sobre el modelo compartido, empieza por:

- [prisma/schema.prisma](./prisma/schema.prisma)

Ese schema define la referencia operativa que consumen `apps/isaak`, `apps/holded`, `apps/admin` y las capas compartidas del monorepo.

## Invariantes operativas recientes

- `session.uid` representa el `authSubject` o Firebase UID, no el `User.id` SQL interno.
- Cualquier acceso a `memberships`, `user_preferences` o `tenant-switch` debe resolver antes el id interno del usuario via `authSubject`.
- Holded ya resuelve conexiones por `external_connections` y `channel_key`; ni `dashboard` ni `chatgpt` hacen fallback a `tenant_integrations`.
- El logout real de `apps/app` no termina en Firebase `signOut()`; tambien debe limpiar la cookie `__session` en el mismo origen via `/api/auth/logout`.
- El integrador MCP de Holded es `closed-world`: solo ejecuta las tools catalogadas contra la cuenta Holded conectada del tenant.
- Esa restriccion aplica solo al conector MCP de Holded; no describe por si sola todo el runtime de Isaak.
- El chat principal de `apps/app` debe reservar la web abierta para fuentes oficiales relevantes del producto: Holded Academy y paginas oficiales de AEAT, SEPE, Seguridad Social y otros organismos publicos espanoles.
- En el runtime auditado no existe todavia una tool de navegador o busqueda web generica para ese acceso oficial.
- En el preset publico `openai_review_v2`, `holded_list_daily_ledger` sigue expuesta bajo `holded.accounts.read`, pero ahora exige `startTimestamp` y `endTimestamp` porque el endpoint productivo rechaza consultas sin rango.
- Hasta que OpenAI apruebe la version limitada del conector directo `Holded Connector for ChatGPT`, la surface publica debe mantenerse estrecha: no ampliar scopes, no mezclar acceso web abierto y no convertir este conector en asesor universal salvo fixes criticos.
- Desde abril de 2026, el flujo publico `channel=chatgpt` usa una `connector onboarding session` propia. La base ya entregada elimina el login clasico visible; la nueva ola de Fase 1 anade estado de identidad verificada para soportar Google opcional o correo verificado antes del onboarding por pasos.
- El troubleshooting del conector debe apoyarse en `x-verifactu-request-id` y en los logs de `authorize`, `status`, `validate` y `connect`.
- Tras la aprobacion de OpenAI, el conector Holded puede abrir una Fase 2 de escritura estructurada dentro del propio dominio Holded, empezando por cuentas contables, asientos y otras acciones mutativas por familias.
- Si se lanza un asesor universal con acceso web oficial y modelo de pago, debe salir como una app/conector separado con su propio contrato de producto, OAuth, pricing y superficie de tools.

## Que no debe vivir aqui

- landing especifica de Holded
- onboarding ligero de captacion
- experiencia principal de chat de Isaak
- branding publico especifico de un canal
- copy comercial especifico de `holded.verifactu.business`

## Rol dentro del mapa de producto

- `apps/isaak`: producto principal visible y conversacional
- `apps/holded`: captacion, login, conexion Holded y handoff
- `apps/app`: core compartido, panel avanzado y conector MCP/OAuth
- `apps/admin`: backoffice y operaciones

## Cuando debes tocar `apps/app`

Nuevos modulos compartidos deben nacer aqui o en `packages/*` cuando:

- afecten al modelo canonico
- expongan APIs internas reutilizables
- definan settings complejos
- soporten billing, tenancy o fiscalidad
- amplien el conector Holded/MCP
- resuelvan OAuth, sesiones compartidas o conexiones externas

## Variables de entorno clave

Para el core general y el conector, las variables mas importantes son:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `SESSION_SECRET`
- `MCP_OAUTH_SECRET` opcional, si no se reutiliza `SESSION_SECRET`
- `MCP_SHARED_SECRET` para accesos internos o compartidos sin OAuth
- `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS`
- `MCP_PUBLIC_SCOPE_PRESET` para controlar los `default_scopes` del flujo publico sin recortar `scopes_supported`
- `INTEGRATIONS_SECRET_KEY` o `INTEGRATION_SECRET_KEY`
- `HOLDED_API_BASE_URL`
- `HOLDED_TIMEOUT_MS`
- `HOLDED_TEST_API_KEY` solo para local o smoke controlado
- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `HOLDED_CONNECTION_LEGAL_VERSION` opcional para versionar la aceptacion legal del onboarding de Holded
- `SUPPORT_NOTIFICATION_EMAIL` opcional para duplicar avisos de onboarding y lifecycle de Holded al equipo interno

Para un bloque mas amplio, revisa:

- [apps/app/.env.example](./.env.example)
- [apps/app/.env.local.example](./.env.local.example)

## Desarrollo local

Desde la raiz del monorepo:

```bash
pnpm install
pnpm --filter verifactu-app dev
```

Build:

```bash
pnpm --filter verifactu-app build
```

Reglas de despliegue en Vercel para este proyecto:

- el proyecto enlazado correcto es `verifactu-monorepo-app`
- desplegar siempre desde un commit limpio ya empujado o desde un snapshot equivalente
- no lanzar deploys desde workspaces sucios ni desde carpetas temporales enlazadas como proyecto nuevo
- en Windows, no usar `vercel --prebuilt` como camino principal para `apps/app`; preferir build remoto normal o redeploy desde dashboard
- cualquier cambio en `apps/app/vercel.json` debe validarse junto al script de install real para no volver a romper la resolucion del root del monorepo
- mantener tambien `scripts/vercel-install.mjs` en la raiz del repo: Vercel puede evaluar el `installCommand` desde el root o desde `apps/app` segun el contexto del proyecto

Tests utiles cuando tocas el conector:

```bash
pnpm --filter verifactu-app test -- --runInBand lib/oauth/mcp.test.ts
pnpm --filter verifactu-app test -- --runInBand lib/integrations/holdedMcpTools.test.ts
pnpm --filter verifactu-app test -- --runInBand app/api/mcp/holded/route.test.ts
```

## Documentos que debes leer primero

- [../../docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md](../../docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md) -> contrato publico canonico del conector directo en Fase 1, actualizado con identidad ligera y onboarding por pasos
- [../../docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_IMPLEMENTATION_PLAN_2026.md](../../docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_IMPLEMENTATION_PLAN_2026.md) -> backlog tecnico vivo de la nueva ola de Fase 1
- [../holded/README.md](../holded/README.md) -> ownership de la app publica Holded-first
- [../holded/HOLDED_CONNECTION_ARCHITECTURE.md](../holded/HOLDED_CONNECTION_ARCHITECTURE.md) -> como se comparte la conexion Holded
- [../holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md](../holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md) -> setup operativo del conector directo en OpenAI
- [../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md](../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md) -> alcance funcional objetivo
- [../../docs/engineering/ai/HOLDED_DEMO_REGRESSION.md](../../docs/engineering/ai/HOLDED_DEMO_REGRESSION.md) -> smoke, huecos y semantica viva de Holded
- [../../docs/engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md](../../docs/engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md) -> arquitectura tecnica viva del runtime MCP/OAuth y del onboarding directo

## Resumen corto para el equipo

- `apps/app` publica el conector real
- `apps/holded` capta y conecta al usuario
- `apps/isaak` consume esa conexion para la experiencia principal
- si ChatGPT no ve una tool o un scope, el problema casi nunca esta en `apps/holded`, sino en el contrato MCP/OAuth de `apps/app`
