# @verifactu/integrations

Paquete compartido para integraciones externas y piezas reutilizables de conexion entre productos del monorepo.

No publica rutas HTTP ni es el runtime del conector MCP. Su trabajo es concentrar logica compartida para que `apps/app`, `apps/holded`, `apps/isaak` y otras capas no dupliquen criptografia, persistencia, snapshots, diagnosticos o continuidad conversacional.

## Que problema resuelve

Este paquete evita que cada app implemente su propia version de:

- conexion y cifrado de credenciales externas
- lectura de estado de una integracion
- snapshots o probes compartidos
- helpers de onboarding de Isaak
- historial y memoria conversacional reutilizable
- clientes ligeros para proveedores externos

## Que si vive aqui

- logica compartida de Holded
- logica compartida de onboarding y chat de Isaak
- clientes auxiliares de Stripe, Resend, Vercel, GitHub y eInforma
- helpers reutilizables de uso transversal entre apps

## Que no debe vivir aqui

- rutas Next.js
- middleware HTTP especifico de una app
- metadata OAuth o `/.well-known/*`
- catalogo MCP visible a OpenAI
- copy publico de producto o de onboarding
- UI especifica de `apps/holded`, `apps/isaak` o `apps/app`

## Mapa rapido del paquete

- `index.ts` -> exports publicos del paquete
- `holded/connection.ts` -> cifrado, guardado, probe y snapshot de la conexion Holded
- `holded/diagnostics.ts` -> resumenes y diagnosticos legibles de modulos soportados
- `isaak/onboarding.ts` -> estado y guardado de onboarding compartido de Isaak
- `isaak/chat.ts` -> conversaciones, memoria y continuidad conversacional
- `stripe.ts`, `resend.ts`, `vercel.ts`, `github.ts`, `einforma.ts` -> clientes auxiliares externos
- `usage-events.ts` -> eventos de uso canonicos

## Capa compartida de Holded

La parte de Holded de este paquete es la base comun que reutilizan distintas superficies:

- `apps/holded` para validar y guardar la API key
- `apps/isaak` para leer el estado de conexion y reutilizar contexto
- `apps/app` para resolver conexiones compartidas y exponer el conector MCP

Responsabilidades principales:

- cifrar y descifrar la API key
- normalizar canal de conexion (`dashboard`, `chatgpt`)
- guardar y desconectar conexiones
- hacer probes de acceso a modulos de Holded
- construir snapshots ligeros de documentos, contactos y cuentas
- devolver diagnosticos legibles para producto y soporte

Archivos clave:

- [holded/connection.ts](./holded/connection.ts)
- [holded/diagnostics.ts](./holded/diagnostics.ts)

## Capa compartida de Isaak

La parte de Isaak de este paquete encapsula la continuidad entre sesiones, onboarding y memoria, para que la app principal no cargue toda esa logica en componentes o routes.

Responsabilidades principales:

- crear o recuperar conversaciones del tenant
- anadir mensajes al historial
- guardar facts de memoria privada
- construir prompts sugeridos de onboarding
- completar o guardar borradores de onboarding

Archivos clave:

- [isaak/chat.ts](./isaak/chat.ts)
- [isaak/onboarding.ts](./isaak/onboarding.ts)

## Como se consume desde otras apps

La via correcta es importar desde el barrel publico:

- [index.ts](./index.ts)

Ejemplos de familias exportadas:

- Holded: `probeHoldedConnection`, `saveHoldedConnection`, `fetchHoldedSnapshot`
- Diagnosticos: `buildHoldedProbeSummary`, `buildStoredHoldedConnectionSummary`
- Isaak onboarding: `getIsaakOnboardingState`, `saveIsaakOnboardingDraft`, `completeIsaakOnboarding`
- Isaak chat: `ensureTenantConversation`, `appendTenantConversationMessage`, `storeTenantMemoryFact`

Regla practica:

- si una app necesita una capacidad comun y ya existe aqui, debe reutilizarla
- si una app necesita una variacion nueva que servira a mas de una superficie, debe nacer aqui o extraerse aqui

## Variables de entorno relevantes

Este paquete depende sobre todo de variables resueltas por la app que lo consume. Las mas sensibles para Holded son:

- `INTEGRATIONS_SECRET_KEY`
- `INTEGRATION_SECRET_KEY`
- `SESSION_SECRET`
- `HOLDED_API_BASE_URL`
- `HOLDED_TIMEOUT_MS`
- `HOLDED_HISTORY_SCAN_PAGES`
- `HOLDED_HISTORY_FETCH_LIMIT`

Segun la integracion concreta, tambien pueden intervenir:

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`

## Desarrollo local

Desde la raiz del monorepo:

```bash
pnpm install
pnpm --filter @verifactu/integrations lint
pnpm --filter @verifactu/integrations type-check
```

## Cuando debes tocar este paquete

Tocalo cuando cambias una integracion compartida que deba ser consistente entre apps.

Ejemplos claros:

- cambiar como se cifra o persiste una conexion Holded
- ampliar el snapshot o el probe compartido de Holded
- mejorar la continuidad de conversaciones o memoria de Isaak
- centralizar una integracion externa usada por varias apps

No lo toques si el cambio es solo:

- un endpoint MCP visible a OpenAI
- una route concreta de Next.js
- una pantalla de onboarding o settings
- un ajuste de UI o branding

## Lectura recomendada para el mapa completo

- [../../apps/app/README.md](../../apps/app/README.md) -> core compartido y runtime MCP/OAuth
- [../../apps/holded/README.md](../../apps/holded/README.md) -> app publica Holded-first
- [../../apps/isaak/README.md](../../apps/isaak/README.md) -> producto principal Isaak
- [../../docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md](../../docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md) -> arquitectura de conexion compartida
- [../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md](../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md) -> alcance funcional objetivo de Holded
- [../../docs/engineering/ai/HOLDED_DEMO_REGRESSION.md](../../docs/engineering/ai/HOLDED_DEMO_REGRESSION.md) -> smoke, semantica real y huecos tecnicos

## Resumen corto para el equipo

- `packages/integrations` no expone el conector MCP; lo alimenta
- `apps/app` publica el contrato visible
- `apps/holded` conecta al usuario
- `apps/isaak` reutiliza conexion y continuidad
- si una logica de integracion sirve a varias apps, probablemente debe vivir aqui
