# Admin Panel — Auditoría, Plan y Progreso

**Última actualización**: 2026-05-15 (sesión 2)  
**Proyecto**: Verifactu Business — Panel de Administración  
**Objetivo**: Panel orientado a gestión de conectores Holded + preparación para lanzamiento público de Isaak

---

## Historial de sesiones

| Fecha      | Qué se hizo                                                                                 | Commits               |
| ---------- | ------------------------------------------------------------------------------------------- | --------------------- |
| 2026-05-14 | Auditoría inicial F6, panel básico, conectores overview                                     | `bfac388`             |
| 2026-05-14 | Sidebar colapsable, ConnectorsPanelWidget hero, fix gráfico barras                          | `dcfa34e`             |
| 2026-05-15 | Usuarios: paginación server-side, búsqueda, filtros, conexión Holded por fila               | `eb40652`             |
| 2026-05-15 | Auditoría completa del panel, este documento, plan S0–S6                                    | `0be7dbe`             |
| 2026-05-15 | S0: loading.tsx en 4 rutas + nav limpia (6 ítems activos)                                   | `34f5b8e`             |
| 2026-05-15 | S1: /connectors tabla global + /connectors/[id] detalle completo                            | (sesión 2)            |
| 2026-05-15 | S2: /users/[id] reescrito (con tenants, conexiones Holded, acciones)                        | (sesión 2)            |
| 2026-05-15 | S3: Export CSV /users y /connectors con filtros activos                                     | (sesión 2)            |
| 2026-05-15 | S4: Tokens PAT en /connectors/[id] + revocar individual                                     | (sesión 2)            |
| 2026-05-15 | S5: Email marketing scaffold (/admin-marketing + CampaignForm + API)                        | (sesión 2)            |
| 2026-05-15 | S6: KPIs alertas en /panel (errores conectores, demos pendientes)                           | (sesión 2)            |
| 2026-05-15 | Fase A: Visibilidad real actividad (PAT audit log) en /panel, /connectors, /connectors/[id] | `feat(admin): Fase A` |
| 2026-05-15 | Fase B: Edición directa perfil tenant + email "perfil incompleto" por tenant                | `feat(admin): Fase B` |

---

## 1. Inventario actual del panel (2026-05-15)

### 1.1 Navegación (`apps/admin/src/navAdmin.tsx`)

```text
Operaciones:
  Panel             /panel              ✓ funcional
  Usuarios          /users              ✓ rediseñado (paginación + búsqueda)
  Tenants           /tenants            ✓ funcional
  Conectores        /connectors/overview ✓ funcional (dashboard global)
  Pedidos           /orders             ✗ placeholder vacío
  Fulfillment       /fulfillment        ✗ placeholder vacío
  Soporte           /admin-support      ✗ placeholder vacío
  Isaak             /isaak              ~ parcial

Growth:
  Catálogo          /catalog            ✗ placeholder vacío
  Marketing         /admin-marketing    ✗ placeholder vacío
  Métricas          /admin-metrics      ✗ placeholder vacío

Relations:
  Reuniones         /admin-meetings     ✗ placeholder vacío
  Inversores        /admin-investors    ✗ placeholder vacío

Content:
  Documentación     /admin-docs         ✗ placeholder vacío
  Demos             /demo-requests      ✓ funcional
```

### 1.2 Páginas bajo `app/(admin)/`

| Ruta                             | Estado  | Descripción                                           |
| -------------------------------- | ------- | ----------------------------------------------------- |
| `/panel`                         | ✓       | Dashboard con widget conectores + KPIs                |
| `/users`                         | ✓ nuevo | Lista paginada con búsqueda, filtro holded/bloqueados |
| `/users/[id]`                    | ✗ ROTO  | Redirección en bucle — página perdida                 |
| `/tenants`                       | ✓       | Lista con búsqueda y filtros                          |
| `/tenants/[id]/overview`         | ✓       | Detalle empresa + soporte handoff                     |
| `/tenants/[id]/connectors`       | ✓       | Lista conexiones holded + botón revocar               |
| `/tenants/[id]/billing`          | ✓       | Facturación y suscripciones                           |
| `/tenants/[id]/users`            | ✓       | Usuarios del tenant                                   |
| `/tenants/[id]/audit`            | ✓       | Audit log del tenant                                  |
| `/connectors/overview`           | ✓       | Timeline 30d, errores 24h, top tools MCP              |
| `/connectors/smoke-tests`        | ✓       | Tests ChatGPT connector                               |
| `/connectors/claude-smoke-tests` | ✓       | Tests Claude connector                                |
| `/demo-requests`                 | ✓       | Lista y detalle solicitudes demo                      |
| `/audit-log`                     | ✓       | Audit log global                                      |
| `/sessions`                      | ✓       | Sesiones activas                                      |

### 1.3 APIs disponibles (`app/api/admin/`)

**Usuarios:**

- `GET /api/admin/users` — lista paginada (search, status, page, limit) ✓ nuevo
- `GET /api/admin/users/[id]` — detalle completo con conexiones holded ✓
- `PATCH /api/admin/users/[id]` — bloquear/desbloquear, editar ✓
- `DELETE /api/admin/users/[id]` — eliminar con protecciones ✓
- `GET /api/admin/users/export` — exportar (endpoint existe, sin UI) ~
- `POST /api/admin/users/[id]/impersonate` — impersonar ✓

**Tenants:**

- `GET /api/admin/tenants` — lista con filtros ✓
- `POST /api/admin/tenants` — crear (manual) ✓
- `PATCH /api/admin/tenants/[id]` — editar metadatos ✓
- `POST /api/admin/tenants/[id]/suspend` / `unsuspend` ✓
- `GET /api/admin/tenants/[id]/connectors` — conexiones del tenant ✓
- `POST /api/admin/tenants/[id]/connectors/[id]/revoke` — revocar ✓

**Conectores:**

- `GET /api/admin/connectors/overview` — stats globales ✓
- `GET /api/admin/connectors/summary` — resumen por canal ✓
- `GET /api/admin/connectors/search` — búsqueda ✓

**Gaps de API (a crear en S1–S6):**

- `PATCH /api/admin/connectors/[id]` — editar metadatos
- `POST /api/admin/connectors/[id]/ping` — test conectividad
- `POST /api/admin/connectors/[id]/reactivate` — restaurar revocada
- `GET /api/admin/connectors/[id]/tokens` — tokens PAT activos
- `DELETE /api/admin/connectors/[id]/tokens/[tokenId]` — revocar token
- `GET /api/admin/connectors/export` — exportar CSV
- `GET /api/admin/connectors/health` — resumen salud
- `POST /api/admin/marketing/campaigns` — crear campaña

---

## 2. Diagnóstico de problemas actuales

### 2.1 Navegación lenta

**Causa**: todas las páginas tienen `export const dynamic = 'force-dynamic'` sin `loading.tsx`. Next.js bloquea la transición esperando la respuesta completa del servidor antes de pintar nada.  
**Solución**: añadir `loading.tsx` en cada sección (skeleton genérico) → navegación instantánea mientras carga el contenido.

### 2.2 Página `/users/[id]` rota

**Causa**: el archivo `app/(admin)/users/[id]/page.tsx` solo hace `redirect('/users/${id}')` que apunta a la misma ruta → bucle infinito. La página de detalle real fue eliminada o nunca se migró.  
**Solución**: crear `/users/[id]/page.tsx` nuevo (Sprint S2).

### 2.3 Nav sobrecargada con secciones vacías

**Causa**: 8+ ítems de nav apuntan a páginas placeholder sin funcionalidad.  
**Solución**: ocultarlos en `navAdmin.tsx` con un flag o moverlos a una sección colapsada.

### 2.4 Panel no tiene tabla global de conexiones

**Causa**: el overview muestra estadísticas pero no permite browsear/gestionar conexiones individuales.  
**Solución**: nueva página `/connectors` con tabla completa (Sprint S1).

---

## 3. Plan de Implementación — Sprints

### Sprint S0 · Rendimiento y limpieza de nav — ✅ COMPLETADO

| Tarea                                                                             | Estado | Notas |
| --------------------------------------------------------------------------------- | ------ | ----- |
| S0-A–D: `loading.tsx` en `/users`, `/tenants`, `/connectors`, `/panel`            | ✅     |       |
| S0-E: Nav limpia (8 ítems vacíos ocultos)                                         | ✅     |       |
| S0-F: Nav reordenada: Panel · Conectores · Usuarios · Tenants · Marketing · Demos | ✅     |       |

---

### Sprint S1 · CRUD Completo de Conectores — ✅ COMPLETADO

| Tarea                                                 | Estado | Notas                                                |
| ----------------------------------------------------- | ------ | ---------------------------------------------------- |
| S1-A: Página `/connectors` — tabla global con filtros | ✅     | Canal, estado, búsqueda, paginación, export CSV      |
| S1-B: Página `/connectors/[id]` — detalle completo    | ✅     | Metadatos, actividad real (PAT log), tokens, revocar |
| S1-C: Acción Revocar token                            | ✅     | `POST /api/admin/connectors/[id]/tokens/[id]/revoke` |
| S1-D: Acción Test Ping                                | ✅     | `POST /api/admin/connectors/[id]/ping`               |
| S1-E: Acción Reactivar conector                       | ✅     | `POST /api/admin/connectors/[id]/reactivate`         |
| S1-F: Acción Eliminar conector (hard delete)          | ✅     | `DELETE /api/admin/connectors/[id]`                  |

---

### Sprint S2 · Detalle de Usuario — ✅ COMPLETADO

| Tarea                                                     | Estado |
| --------------------------------------------------------- | ------ |
| `/users/[id]` reescrito: info, tenants, conexiones Holded | ✅     |
| Acciones: Bloquear/Desbloquear, Eliminar                  | ✅     |
| Loading skeleton                                          | ✅     |

---

### Sprint S3 · Export de Tablas — ✅ COMPLETADO

| Tarea                                        | Estado |
| -------------------------------------------- | ------ |
| Export CSV `/users` con filtros activos      | ✅     |
| Export CSV `/connectors` con filtros activos | ✅     |

---

### Sprint S4 · Gestión de Tokens PAT/MCP — ✅ COMPLETADO

| Tarea                                          | Estado |
| ---------------------------------------------- | ------ |
| Sección "Tokens activos" en `/connectors/[id]` | ✅     |
| API lista + revocar tokens individuales        | ✅     |

---

### Sprint S5 · Email Marketing Scaffold — ✅ COMPLETADO

| Tarea                                                         | Estado | Notas                                           |
| ------------------------------------------------------------- | ------ | ----------------------------------------------- |
| Página `/admin-marketing` con 3 segmentos + CampaignForm      | ✅     |                                                 |
| API `POST /api/admin/marketing/send` con dry-run + envío real | ✅     |                                                 |
| Segmentos: all_users · holded_connected · holded_error        | ✅     |                                                 |
| Historial de campañas (modelo Prisma `MarketingCampaign`)     | ✅     | Modelo + UI implementados en `/admin-marketing` |

---

### Sprint S6 · Monitorización y Alertas — ✅ COMPLETADO

| Tarea                                                                        | Estado | Notas                                                                                  |
| ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| KPIs en `/panel`: Activos 30d, dormant, queries hoy, errores conectores      | ✅     | Basado en PAT audit log (señal real de actividad)                                      |
| Alertas "Atención requerida" en panel (dormant, error, demos, recordatorios) | ✅     |                                                                                        |
| Badge alertas en nav lateral                                                 | ✅     | Implementado en `apps/admin/app/(admin)/layout.tsx` via `/api/admin/connectors/health` |

---

### Fase A · Visibilidad Real de Actividad — ✅ COMPLETADO

| Tarea                                                                        | Estado |
| ---------------------------------------------------------------------------- | ------ |
| A1: "Actividad real" en `/connectors/[id]` (últimas 50 llamadas PAT)         | ✅     |
| A2: Columna "Queries 7d" en tabla `/connectors` (badge azul)                 | ✅     |
| A3: KPI tenant-céntrico en `/panel` (tenants activos vs usuarios conectados) | ✅     |

---

### Fase B · Gestión de Perfiles de Tenant — ✅ COMPLETADO

| Tarea                                                                          | Estado |
| ------------------------------------------------------------------------------ | ------ |
| B1: Formulario inline de edición en `/tenants/[id]/overview`                   | ✅     |
| B2: API `PATCH /api/admin/tenants/[id]/profile` con audit trail                | ✅     |
| B3: API `POST /api/admin/tenants/[id]/profile-email` — email perfil incompleto | ✅     |

---

### Fase C · Recordatorios Automáticos de Perfil — ✅ COMPLETADO (2026-05-24)

**Objetivo**: Email automático cada 2-3 días a tenants con perfil incompleto (sin email, teléfono, CNAE o representante), hasta que completen los datos.

| Tarea                                                                                             | Estado | Notas                                                                        |
| ------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| C1: `GET /api/admin/tenants/incomplete-profiles` — lista paginada con search                      | ✅     | `apps/admin/app/api/admin/tenants/incomplete-profiles/route.ts`              |
| C2: Cron Vercel diario `0 8 * * 1-5` → `POST /api/cron/profile-reminders`                         | ✅     | `apps/admin/vercel.json` + route con auth Bearer CRON_SECRET o admin session |
| C3: Tabla SQL `profile_reminder_logs` (tenant_id, sent_at) — cadencia 3 días                      | ✅     | Creada on-demand en el cron; throttle via NOT IN subquery                    |
| C4: `RemindersWidget` en `/admin-marketing` — incompletos, pendientes, último envío, botón manual | ✅     | `RemindersWidget.tsx` + `GET /api/admin/profile-reminders/status`            |

---

### Fase D · Finalización Conectores — ✅ COMPLETADO (2026-05-24)

| Tarea                                                         | Estado | Notas                                                                                 |
| ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| D1: Acción "Test Ping" en `/connectors/[id]`                  | ✅     | `apps/admin/app/api/admin/connectors/[id]/ping/route.ts`                              |
| D2: Acción "Reactivar" conector revocado                      | ✅     | `apps/admin/app/api/admin/connectors/[id]/reactivate/route.ts`                        |
| D3: Acción "Eliminar" conector (hard delete con confirmación) | ✅     | `DELETE` en `connectors/[id]/route.ts:156` — cascade PATs + audit logs                |
| D4: Historial de campañas de marketing (modelo Prisma)        | ✅     | `MarketingCampaign` en `schema.prisma` + UI en `/admin-marketing`                     |
| D5: Badge alertas en nav lateral                              | ✅     | `layout.tsx` — badge dinámico en `/connectors` via `GET /api/admin/connectors/health` |

---

### Fase E · Isaak Admin Copilot — ✅ COMPLETADO (2026-05-24)

**Objetivo**: Isaak visible **solo en el panel de admin** (interno), capaz de responder preguntas sobre métricas, detectar anomalías y recopilar datos.

| Tarea                                                                                     | Estado | Notas                                                                                       |
| ----------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| E1: Widget Isaak en todo el admin con `moduleKey: 'admin'`                                | ✅     | `layout.tsx` — chatApiPath, feedbackApiPath, exportApiPath, uploadApiPath, tenantId context |
| E2: Tools `get_activity_stats`, `list_dormant_tenants`, `get_connector_errors`            | ✅     | `apps/admin/lib/isaakTools.ts` — 10 tools implementadas                                     |
| E3: Tools de análisis fiscal: `get_tenant_fiscal_analysis`, `get_tenant_modelo_303`, etc. | ✅     | Isaak detecta dormant tenants, errores conectores, facturas sin contabilizar                |
| E4: Sugerencias de acción en respuestas Isaak                                             | ✅     | Vía tool results + system prompt con instrucciones de presentación estructurada             |

---

### Fase F · Isaak Público — ✅ COMPLETADO (2026-05-24)

**Objetivo**: Exponer Isaak a usuarios finales (no admin) con onboarding, configuración y controles de privacidad claros.

| Tarea                                              | Estado | Notas                                                                                              |
| -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| F1: Feature flag `isaak_public_enabled` por tenant | ✅     | Campo en `tenants` + toggle en `/tenants/[id]/overview` + API `isaak-public/route.ts`              |
| F2: Consentimiento explícito para acceso a datos   | ✅     | `POST /api/holded/consent` + tabla `tenant_isaak_settings` con `consent_given`, `consent_given_at` |
| F3: Isaak accede a contexto del tenant             | ✅     | Vía tools fiscales + Holded data (solo si consentimiento activo)                                   |
| F4: Métricas de uso por tenant en panel admin      | ✅     | Via `get_activity_stats` tool + PAT audit log por tenant                                           |

---

## 4. Orden de ejecución recomendado (actualizado)

```text
Inmediato (próxima sesión):
  Fase C — Recordatorios automáticos perfil incompleto
    C1: API /incomplete-profiles (1h)
    C2: Rutina CCR programada (1h — usa /schedule)
    C3: log de cadencia para no saturar usuarios (1h)

A continuación:
  Fase D — Finalizar pequeños items conectores
    D1-D3: Ping, Reactivar, Eliminar (2h)
    D4: Historial campañas (1h)

Siguiente sprint:
  Fase E — Isaak Admin Copilot (interno)
    E1-E2: Widget + tools básicas (2-3h)
    E3-E4: Anomalías + sugerencias accionables (2h)

Futuro (tras validación interna):
  Fase F — Isaak Público (con feature flag por tenant)
```

---

## 5. Decisiones de arquitectura

| Decisión                                               | Razonamiento                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| Server components para listas (no client-side fetch)   | SEO, TTFB, sin loading spinners; URL params como source of truth   |
| `loading.tsx` por sección en lugar de Suspense inline  | Más simple, cubre toda la ruta automáticamente                     |
| Prisma + raw SQL híbrido para queries complejas        | Prisma para CRUD simple, `$queryRaw` para joins multi-tabla holded |
| Tailwind estático (sin template literals dinámicos)    | Requerido por el JIT purger; workaround con mapas H_PCT/W_PCT      |
| Inline styles prohibidos (`no-inline-styles` ESLint)   | Regla del proyecto; usar clases Tailwind o CSS variables           |
| CSV export con streaming                               | Evita timeout en listas de miles de registros                      |
| Segmentos de marketing basados en external_connections | Fuente de verdad sobre qué usuarios/tenants están activos          |

---

## 6. Archivos clave

```text
apps/admin/
  src/navAdmin.tsx                              — definición del menú
  app/(admin)/
    layout.tsx                                  — layout con AppShell
    panel/page.tsx                              — dashboard principal
    users/
      page.tsx                                  — lista paginada (nuevo)
      UsersSearchBar.tsx                        — barra búsqueda client
      [id]/page.tsx                             — ROTO, a reescribir (S2)
    tenants/
      page.tsx
      [id]/connectors/page.tsx                  — conexiones por tenant
    connectors/
      overview/page.tsx                         — stats globales
      [id]/page.tsx                             — a crear (S1)
  components/admin/
    ConnectorsPanelWidget.tsx                   — widget dashboard
  app/api/admin/
    users/route.ts                              — lista+filtros (nuevo)
    users/[id]/route.ts                         — detalle+acciones
    tenants/[id]/connectors/[id]/revoke/        — revocar
    connectors/overview/route.ts
    connectors/summary/route.ts
packages/db/prisma/schema.prisma               — ExternalConnection, Membership, Tenant, User
```

---

## 7. Notas técnicas recurrentes

- **`force-dynamic`**: todas las páginas del admin llevan esta directiva. Necesario para evitar caché de datos sensibles. **Siempre añadirlo en nuevas páginas admin.**
- **Autenticación**: usar `requireAdmin(req)` desde `@/lib/adminAuth` en todas las API routes.
- **DB import**: `import { prisma } from '@/lib/prisma'` en páginas; `import { query } from '@/lib/db'` para raw SQL multi-query.
- **Tailwind classes dinámicas**: si el valor viene de una variable, usar un mapa estático `Record<number, string>` con todas las clases escritas literalmente.
- **ESLint rules críticas**: `no-empty` (catch blocks vacíos), `no-inline-styles` (prohibe `style={{}}`). Los catch vacíos necesitan `catch (_e) { /* comment */ }`.
- **Commits**: siempre pasar mensaje por HEREDOC para evitar problemas con caracteres especiales.
