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

Regla practica:

- si cambias una tool, casi seguro tocas `holdedMcpTools.ts`
- si cambias acceso o visibilidad, casi seguro tocas `holdedMcpScopes.ts` o `lib/oauth/mcp.ts`
- si cambias descubrimiento, auth o respuesta MCP, tocas `app/api/mcp/holded/route.ts`

## Regla principal de modelo de datos

Cuando exista duda sobre el modelo compartido, empieza por:

- [prisma/schema.prisma](./prisma/schema.prisma)

Ese schema define la referencia operativa que consumen `apps/isaak`, `apps/holded`, `apps/admin` y las capas compartidas del monorepo.

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

Tests utiles cuando tocas el conector:

```bash
pnpm --filter verifactu-app test -- --runInBand lib/oauth/mcp.test.ts
pnpm --filter verifactu-app test -- --runInBand lib/integrations/holdedMcpTools.test.ts
pnpm --filter verifactu-app test -- --runInBand app/api/mcp/holded/route.test.ts
```

## Documentos que debes leer primero

- [../holded/README.md](../holded/README.md) -> ownership de la app publica Holded-first
- [../holded/HOLDED_CONNECTION_ARCHITECTURE.md](../holded/HOLDED_CONNECTION_ARCHITECTURE.md) -> como se comparte la conexion Holded
- [../holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md](../holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md) -> setup operativo del conector en OpenAI
- [../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md](../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md) -> alcance funcional objetivo
- [../../docs/engineering/ai/HOLDED_DEMO_REGRESSION.md](../../docs/engineering/ai/HOLDED_DEMO_REGRESSION.md) -> smoke, huecos y semantica viva de Holded
- [../../docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md](../../docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md) -> contrato publico y review

## Resumen corto para el equipo

- `apps/app` publica el conector real
- `apps/holded` capta y conecta al usuario
- `apps/isaak` consume esa conexion para la experiencia principal
- si ChatGPT no ve una tool o un scope, el problema casi nunca esta en `apps/holded`, sino en el contrato MCP/OAuth de `apps/app`
