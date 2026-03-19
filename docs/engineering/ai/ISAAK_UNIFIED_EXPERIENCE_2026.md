# Isaak Unified Experience (2026)

**Última actualización:** Marzo 2026

Documento de referencia para el comportamiento de Isaak en landing, panel cliente, panel admin y ChatGPT (MCP).

## Objetivo

- Ofrecer ayuda proactiva y accionable en todas las secciones y canales.
- Evitar mensajes genéricos sin contexto.
- Permitir elegir personalidad desde el primer contacto.
- Un solo Isaak: mismo cerebro, distintas fuentes de datos y canales según el tenant.

## Personalidad

Perfiles disponibles:

- `friendly` (Amigable) — tuteo, emojis moderados, tono cercano
- `professional` (Profesional) — usted/tú según contexto, emojis puntuales
- `minimal` (Directo) — sin emojis, frases cortas

Persistencia actual:

- `apps/app`: backend (`/api/user/preferences`) + fallback localStorage.
- `apps/admin`: backend (`/api/admin/preferences`) + fallback localStorage.
- `apps/client`: backend (`/api/preferences`) con resolución best-effort por tenant + fallback localStorage.
- `apps/landing`: localStorage para visitante anónimo.

---

## Comportamiento proactivo por app

### Landing (`apps/landing`)

- Chat flotante con sugerencias por sección de navegación.
- Endpoint de chat: `POST /api/vertex-chat`.
- Prompts recomendados visibles antes de escribir.
- No requiere tenant; modo anónimo.

### App principal (`apps/app`)

- Isaak contextual por módulo:
  - `dashboard` — acciones proactivas desde `/api/dashboard/actions`; alertas de plazos fiscales
  - `invoices` — emitir, enviar, marcar pagada, Veri\*Factu
  - `expenses` — clasificar con Isaak (`/api/expenses/intake`), confirmar sugerencia
  - `quotes` — crear presupuesto, convertir a factura
  - `clients` / `suppliers` — revisar facturas vencidas, enriquecimiento eInforma
  - `banks` — conciliación de movimientos, creación de gasto desde movimiento
  - `calendar` — plazos fiscales, integración Google Calendar
  - `documents` — subida de archivos, Google Drive / OneDrive
  - `integrations` — conectar ERP externo, estado de sync, conflictos
  - `settings` — configurar Isaak, preferencias, tono
  - `isaak` — historial de conversaciones, conversaciones compartidas
- Prefill de preguntas desde tour y ayudas demo.
- Selector de tono en el panel de preferencias.

### Panel cliente (`apps/client`)

- Uso de `AppShell` + `IsaakDock` compartido (`packages/ui`).
- Contexto de tenant y demo mode enviado al dock.
- Endpoint de preferencias: `GET/PATCH /api/preferences`.
- Mientras no exista auth completa en client, la persistencia usa resolución de usuario por tenant (OWNER activo) como fallback operativo.

### Panel admin (`apps/admin`)

- Isaak activado en `AppShell` admin.
- Proactividad por rutas de admin (`tenants`, `users`, `support`, `operations`, `integrations`).
- Persistencia de tono por admin autenticado en `user_preferences.isaak_tone`.

### ChatGPT — Isaak for Holded (MCP)

- Canal externo: el usuario opera desde ChatGPT con Isaak como agente.
- Protocolo: MCP remote (JSON-RPC 2.0 sobre HTTPS).
- Endpoint: `https://app.verifactu.business/api/mcp/holded`.
- Auth: OAuth propio de Verifactu (Bearer token).
- Isaak NO expone la API key de Holded al usuario; opera server-side.
- Tools disponibles: listar y obtener facturas, listar contactos, listar cuentas, crear borrador con confirmación.
- Onboarding `holded-first`: usuario conecta Holded desde Verifactu antes de usar ChatGPT.
- Documentación: `docs/engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md`.

---

## Módulos e integraciones activas (Marzo 2026)

### Módulos nativos

| Módulo                 | Estado | Notas                                                     |
| ---------------------- | ------ | --------------------------------------------------------- |
| Facturas               | ✅     | CRUD + issue + mark-paid + send + PDF + Veri\*Factu       |
| Gastos Isaak           | ✅     | Ingesta, clasificación IA, confirmación, libros AEAT      |
| Presupuestos           | ✅     | CRUD + convert-to-invoice; bidireccional en Empresa/PRO   |
| Artículos / Catálogo   | ✅     | CRUD                                                      |
| Clientes / Proveedores | ✅     | CRUD                                                      |
| Bancos                 | ✅     | Movimientos, conciliación, crear gasto                    |
| Impuestos AEAT         | ✅     | Libros 303/130, preview y export Excel (todos los planes) |
| Dashboard              | ✅     | KPIs, acciones contextuales Isaak                         |
| Documentos / Storage   | ✅     | Subida de archivos                                        |
| Invitaciones           | ✅     | Multi-tenant (envío y aceptación)                         |

### Integraciones externas

| Integración      | Tipo              | Estado | Planes      |
| ---------------- | ----------------- | ------ | ----------- |
| Holded (ERP)     | API key + MCP     | ✅     | Empresa/PRO |
| Google Calendar  | OAuth             | ✅     | Todos       |
| Google Drive     | OAuth             | ✅     | Todos       |
| Gmail            | OAuth             | ✅     | Todos       |
| Microsoft (M365) | OAuth             | ✅     | Todos       |
| OneDrive         | OAuth             | ✅     | Todos       |
| eInforma         | API key           | ✅     | Todos       |
| Stripe           | Webhook           | ✅     | Todos       |
| Resend (email)   | API key + inbound | ✅     | Todos       |

---

## Componentes y rutas clave

### Shared dock/context

- `packages/ui/src/isaak/IsaakDock.tsx`
- `packages/ui/src/isaak/useIsaakContext.tsx`

### App principal (`apps/app`)

| Componente / Hook            | Ruta                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| `IsaakSmartFloating`         | `apps/app/components/isaak/IsaakSmartFloating.tsx`         |
| `IsaakProactiveBubbles`      | `apps/app/components/isaak/IsaakProactiveBubbles.tsx`      |
| `IsaakDeadlineNotifications` | `apps/app/components/isaak/IsaakDeadlineNotifications.tsx` |
| `IsaakPreferencesModal`      | `apps/app/components/isaak/IsaakPreferencesModal.tsx`      |
| `IsaakDrawer`                | `apps/app/components/isaak/IsaakDrawer.tsx`                |
| `IsaakGreetingCard`          | `apps/app/components/isaak/IsaakGreetingCard.tsx`          |
| `IsaakContextBridge`         | `apps/app/components/isaak/IsaakContextBridge.tsx`         |
| `useIsaakContext`            | `apps/app/hooks/useIsaakContext.ts`                        |
| `useIsaakTone`               | `apps/app/hooks/useIsaakTone.ts`                           |
| `useIsaakPreferences`        | `apps/app/hooks/useIsaakPreferences.ts`                    |
| `useIsaakAnalytics`          | `apps/app/hooks/useIsaakAnalytics.ts`                      |
| `useIsaakVoice`              | `apps/app/hooks/useIsaakVoice.ts`                          |
| `useIsaakDetection`          | `apps/app/hooks/useIsaakDetection.ts`                      |

### Landing (`apps/landing`)

- `apps/landing/app/components/IsaakChat.tsx`
- `apps/landing/app/api/vertex-chat/route.ts`

### Admin (`apps/admin`)

- `apps/admin/app/(admin)/layout.tsx`
- `apps/admin/app/api/admin/preferences/route.ts`

### Client (`apps/client`)

- `apps/client/app/t/[tenantSlug]/AppShellLayout.tsx`
- `apps/client/app/api/preferences/route.ts`

### OAuth y MCP

- `apps/app/lib/oauth/mcp.ts`
- `apps/app/app/oauth/authorize/route.ts`
- `apps/app/app/oauth/token/route.ts`
- `apps/app/app/oauth/userinfo/route.ts`
- `apps/app/app/.well-known/oauth-authorization-server/route.ts`
- `apps/app/app/.well-known/oauth-protected-resource/route.ts`
- `apps/app/app/api/mcp/holded/route.ts`

---

## Notas de implementación

- Si falla persistencia backend, Isaak conserva experiencia funcional con fallback localStorage.
- La proactividad debe mantener foco en tareas concretas del módulo actual.
- El selector de personalidad debe permanecer accesible para cambios posteriores.
- Las tools MCP de escritura (crear borrador) requieren confirmación explícita antes de ejecutar.
- En producción, `HOLDED_TEST_API_KEY` debe estar desactivado.
- Los libros AEAT son el output base para todos los planes; la sync API con ERP es solo Empresa/PRO.
