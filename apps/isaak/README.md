# isaak.verifactu.business

Producto principal visible de la plataforma.

Isaak es la experiencia conversacional que debe convertir datos, documentos y contexto operativo en claridad para el usuario. Holded puede ser una puerta de entrada, pero Isaak no es una subpantalla de Holded: es el producto principal.

## Rol dentro del monorepo

- `apps/isaak`: producto principal conversacional
- `apps/holded`: captacion, login, conexion Holded y handoff
- `apps/app`: core compartido, panel avanzado y runtime MCP/OAuth
- `apps/admin`: backoffice

## Que debe conseguir Isaak

La promesa de esta app es sencilla:

- explicar con claridad lo que importa de ventas, gastos, cobros y riesgo
- dar continuidad entre conversaciones, contexto y decisiones
- reducir friccion frente a dashboards y menus dispersos
- usar contexto real del negocio sin obligar al usuario a traducirlo todo solo
- servir como cara principal de producto aunque la entrada llegue por Holded u otros canales

## Que debe vivir aqui

- chat
- historial
- memoria
- onboarding conversacional ligero
- ajustes ligeros
- soporte guiado
- continuidad entre contexto, conversaciones y conexiones compartidas
- experiencia publica y de producto propia de Isaak

## Que no debe vivir aqui

- landing especifica Holded
- configuracion fiscal o contable compleja
- backoffice
- logica compartida importada desde `apps/holded`
- runtime MCP remoto para ChatGPT
- metadata OAuth `/.well-known/*`

## Estado del sprint actual

- `/chat` ya es el workspace principal de producto
- la sesion y la lectura de conexion Holded se resuelven sin importar codigo desde `apps/holded`
- el chat core ya se resuelve desde capa compartida en `packages/integrations`

## Mapa rapido de rutas

Rutas publicas y de producto mas importantes:

- `/` -> pagina principal de Isaak
- `/demo` -> demo publica
- `/chat` -> workspace principal
- `/settings` -> ajustes de perfil, empresa, conexiones e Isaak
- `/support` -> soporte
- `/onboarding/holded` -> continuidad cuando el usuario llega a Isaak y necesita conectar o revisar Holded

APIs principales dentro de esta app:

- `/api/chat` -> entrada principal de chat
- `/api/holded/chat` -> flujo conversacional apoyado en contexto Holded
- `/api/holded/conversations` -> historico y conversaciones
- `/api/settings/*` -> perfil, empresa, billing, conexiones y preferencias
- `/api/holded/status` y `/api/holded/connect` -> estado y continuidad de la integracion

## De que depende Isaak

`apps/isaak` no vive aislado. Su operacion depende de:

- sesion compartida y tenancy
- conexion Holded ya guardada server-side
- datos comunes del monorepo
- capa compartida en `packages/integrations`
- navegacion segura entre `holded.verifactu.business`, `isaak.verifactu.business` y `app.verifactu.business`

## Variables de entorno clave

Las variables que mas condicionan esta app son:

- `DATABASE_URL`
- `SESSION_SECRET`
- `SESSION_COOKIE_DOMAIN`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAMESITE`
- `NEXT_PUBLIC_ISAAK_SITE_URL`
- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `ISAAK_OPENAI_MODEL`
- `GOOGLE_AI_API_KEY`, `GOOGLEAI_API_KEY` o `GEMINI_API_KEY` segun el flujo IA activo
- `STRIPE_SECRET_KEY` y precios Stripe si se habilitan billing y portal
- `RESEND_API_KEY` y `RESEND_FROM` para correos operativos

Si partes de un entorno real del proyecto, revisa tambien:

- [isaak-vercel-import.env](./isaak-vercel-import.env)

## Cuando debes tocar `apps/isaak`

Este proyecto es el lugar correcto cuando cambias:

- experiencia principal de chat
- historial y continuidad conversacional
- memoria y ajustes del usuario
- settings, soporte y facturacion del producto Isaak
- copy y propuesta de valor de Isaak como producto propio

No es el lugar correcto cuando cambias:

- landing Holded-first
- setup del conector MCP en OpenAI
- metadata OAuth o scopes del conector
- backoffice admin

## Documentos recomendados

- [../../docs/engineering/ai/ISAAK_INSTRUCCIONES_OPERATIVAS_2026.md](../../docs/engineering/ai/ISAAK_INSTRUCCIONES_OPERATIVAS_2026.md)
- [../../docs/engineering/ai/ISAAK_MEMORY_ARCHITECTURE_2026.md](../../docs/engineering/ai/ISAAK_MEMORY_ARCHITECTURE_2026.md)
- [../../docs/engineering/ai/ISAAK_PERSONA_PLAYBOOK_2026.md](../../docs/engineering/ai/ISAAK_PERSONA_PLAYBOOK_2026.md)
- [../../docs/isaak/ISAAK_SUPPORT_SYSTEM.md](../../docs/isaak/ISAAK_SUPPORT_SYSTEM.md)
- [../../docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md](../../docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md)
- [../holded/README.md](../holded/README.md)
- [../app/README.md](../app/README.md)

## Desarrollo local

```bash
pnpm install
pnpm --filter verifactu-isaak dev
```

## Build

```bash
pnpm --filter verifactu-isaak build
```

## Resumen corto para el equipo

- `apps/isaak` es la cara principal del producto
- aqui viven chat, historial, memoria y ajustes de producto
- Holded puede aportar contexto, pero no define toda la identidad de Isaak
- si el cambio afecta a scopes/tools/OAuth del conector, el ownership suele estar en `apps/app`
