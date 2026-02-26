# Isaak Unified Experience (2026)

Documento de referencia para el comportamiento de Isaak en landing, panel cliente y panel admin.

## Objetivo

- Ofrecer ayuda proactiva y accionable en todas las secciones.
- Evitar mensajes genéricos sin contexto.
- Permitir elegir personalidad desde el primer contacto.

## Personalidad

Perfiles disponibles:

- `friendly` (Amigable)
- `professional` (Profesional)
- `minimal` (Directo)

Persistencia actual:

- `apps/app`: backend (`/api/user/preferences`) + fallback local.
- `apps/admin`: backend (`/api/admin/preferences`) + fallback local.
- `apps/client`: backend (`/api/preferences`) con resolucion best-effort por tenant + fallback local.
- `apps/landing`: localStorage para visitante anonimo.

## Comportamiento proactivo por app

### Landing (`apps/landing`)

- Chat flotante con sugerencias por sección de navegación.
- Endpoint de chat: `POST /api/vertex-chat`.
- Prompts recomendados visibles antes de escribir.

### App principal (`apps/app`)

- Isaak contextual por módulo (`dashboard`, `invoices`, `clients`, `banks`, `calendar`, `settings`, `isaak`).
- Prefill de preguntas desde tour y ayudas demo.
- Selector de tono en el panel de preferencias.

### Panel cliente (`apps/client`)

- Uso de `AppShell` + `IsaakDock` compartido (`packages/ui`).
- Contexto de tenant y demo mode enviado al dock.
- Endpoint de preferencias: `GET/PATCH /api/preferences`.
- Mientras no exista auth completa en client, la persistencia usa resolucion de usuario por tenant (OWNER activo) como fallback operativo.

### Panel admin (`apps/admin`)

- Isaak activado en `AppShell` admin.
- Proactividad por rutas de admin (`tenants`, `users`, `support`, `operations`, `integrations`).
- Persistencia de tono por admin autenticado en `user_preferences.isaak_tone`.

## Componentes y rutas clave

- Shared dock/context:
  - `packages/ui/src/isaak/IsaakDock.tsx`
  - `packages/ui/src/isaak/useIsaakContext.tsx`
- App principal:
  - `apps/app/components/isaak/IsaakSmartFloating.tsx`
- Landing:
  - `apps/landing/app/components/IsaakChat.tsx`
  - `apps/landing/app/api/vertex-chat/route.ts`
- Admin:
  - `apps/admin/app/(admin)/layout.tsx`
  - `apps/admin/app/api/admin/preferences/route.ts`
- Client:
  - `apps/client/app/t/[tenantSlug]/AppShellLayout.tsx`
  - `apps/client/app/api/preferences/route.ts`

## Notas de implementación

- Si falla persistencia backend, Isaak conserva experiencia funcional con fallback local.
- La proactividad debe mantener foco en tareas concretas del módulo actual.
- El selector de personalidad debe permanecer accesible para cambios posteriores.
