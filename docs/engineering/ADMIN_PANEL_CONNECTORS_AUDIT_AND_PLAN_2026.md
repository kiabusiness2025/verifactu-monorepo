# Admin Panel — Auditoría, Plan y Progreso

**Última actualización**: 2026-05-15  
**Proyecto**: Verifactu Business — Panel de Administración  
**Objetivo**: Panel 100% orientado a la gestión de conectores Holded (Claude · ChatGPT · Dashboard · Mobile)

---

## Historial de sesiones

| Fecha      | Qué se hizo                                                                   | Commits   |
| ---------- | ----------------------------------------------------------------------------- | --------- |
| 2026-05-14 | Auditoría inicial F6, panel básico, conectores overview                       | `bfac388` |
| 2026-05-14 | Sidebar colapsable, ConnectorsPanelWidget hero, fix gráfico barras            | `dcfa34e` |
| 2026-05-15 | Usuarios: paginación server-side, búsqueda, filtros, conexión Holded por fila | `eb40652` |
| 2026-05-15 | Auditoría completa del panel, este documento, plan S0–S6                      | `0be7dbe` |
| 2026-05-15 | S0: loading.tsx en 4 rutas + nav limpia (6 ítems activos)                     | `34f5b8e` |

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
- `POST /api/admin/tenants` — crear (manual o Einforma) ✓
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

### Sprint S0 · Rendimiento y limpieza de nav

**Estimación**: ~3 horas  
**Estado**: ⬜ pendiente

| Tarea                                                                                                               | Estado | Notas                               |
| ------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------- |
| S0-A: `loading.tsx` en `/users`                                                                                     | ⬜     | Skeleton de tabla 10 filas          |
| S0-B: `loading.tsx` en `/tenants`                                                                                   | ⬜     | Skeleton de tabla 10 filas          |
| S0-C: `loading.tsx` en `/connectors/overview`                                                                       | ⬜     | Skeleton gráfico + cards            |
| S0-D: `loading.tsx` en `/panel`                                                                                     | ⬜     | Skeleton widget + KPIs              |
| S0-E: Ocultar nav vacía (Pedidos, Fulfillment, Catálogo, Marketing, Métricas, Reuniones, Inversores, Docs, Soporte) | ⬜     | Flag `hidden: true` en navAdmin.tsx |
| S0-F: Reordenar nav: Panel · Conectores · Usuarios · Tenants · Demos                                                | ⬜     |                                     |

---

### Sprint S1 · CRUD Completo de Conectores

**Estimación**: ~1 día  
**Estado**: ⬜ pendiente

| Tarea                                                             | Estado | Notas                                  |
| ----------------------------------------------------------------- | ------ | -------------------------------------- |
| S1-A: Página `/connectors` — tabla global de todas las conexiones | ⬜     | Filtros: canal, estado, tenant, fechas |
| S1-B: Página `/connectors/[id]` — detalle conexión                | ⬜     | Metadatos, audit log, tokens, acciones |
| S1-C: Acción Revocar en detalle (reutiliza API existente)         | ⬜     |                                        |
| S1-D: Acción Test Ping                                            | ⬜     | API nueva `POST /ping`                 |
| S1-E: Acción Reactivar                                            | ⬜     | API nueva `POST /reactivate`           |
| S1-F: Acción Eliminar (hard delete + confirmación)                | ⬜     |                                        |
| S1-G: API `PATCH /api/admin/connectors/[id]`                      | ⬜     | Notas admin, alias                     |
| S1-H: API `POST /api/admin/connectors/[id]/ping`                  | ⬜     | Test Holded API key                    |
| S1-I: API `POST /api/admin/connectors/[id]/reactivate`            | ⬜     | Restaurar revocada                     |

---

### Sprint S2 · Detalle de Usuario

**Estimación**: ~4 horas  
**Estado**: ⬜ pendiente

| Tarea                                                 | Estado | Notas                                         |
| ----------------------------------------------------- | ------ | --------------------------------------------- |
| S2-A: Página `/users/[id]` nueva — detalle completo   | ⬜     | Llama a API existente `/api/admin/users/[id]` |
| S2-B: Mostrar tenants + conexiones holded del usuario | ⬜     |                                               |
| S2-C: Acciones: Bloquear/Desbloquear, Impersonar      | ⬜     | APIs ya existen                               |
| S2-D: Link desde lista usuarios → detalle             | ⬜     | Ya está el `<Link href="/users/[id]">`        |

---

### Sprint S3 · Export de Tablas

**Estimación**: ~3 horas  
**Estado**: ⬜ pendiente

| Tarea                                                            | Estado | Notas                                      |
| ---------------------------------------------------------------- | ------ | ------------------------------------------ |
| S3-A: Botón "Exportar CSV" en `/users`                           | ⬜     | Usa endpoint existente con filtros activos |
| S3-B: API `GET /api/admin/connectors/export` — CSV de conexiones | ⬜     | Nuevo endpoint                             |
| S3-C: Botón "Exportar CSV" en `/connectors`                      | ⬜     |                                            |
| S3-D: Export con streaming (no bloquea en lotes grandes)         | ⬜     | ReadableStream con `text/csv`              |

---

### Sprint S4 · Gestión de Tokens PAT/MCP

**Estimación**: ~4 horas  
**Estado**: ⬜ pendiente

| Tarea                                                          | Estado | Notas                                       |
| -------------------------------------------------------------- | ------ | ------------------------------------------- |
| S4-A: Sección "Tokens activos" en `/connectors/[id]`           | ⬜     | Tabla: issued_at, last_used, canal, revocar |
| S4-B: API `GET /api/admin/connectors/[id]/tokens`              | ⬜     | Lista PATs de la conexión                   |
| S4-C: API `DELETE /api/admin/connectors/[id]/tokens/[tokenId]` | ⬜     | Revocar token individual                    |
| S4-D: Contador de tokens activos en tabla global `/connectors` | ⬜     |                                             |

---

### Sprint S5 · Email Marketing Scaffold

**Estimación**: ~1 día  
**Estado**: ⬜ pendiente

| Tarea                                                                                  | Estado | Notas                                                                      |
| -------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| S5-A: Página `/marketing/campaigns` — lista de campañas                                | ⬜     |                                                                            |
| S5-B: Formulario nueva campaña: segmento + subject + body + preview                    | ⬜     |                                                                            |
| S5-C: Segmentos disponibles                                                            | ⬜     | Todos conectados, solo Claude, solo ChatGPT, con errores, sin actividad 7d |
| S5-D: API `POST /api/admin/marketing/campaigns`                                        | ⬜     | Crea y envía usando infra de emails existente                              |
| S5-E: Modelo Prisma `MarketingCampaign` (id, segment, subject, sentAt, recipientCount) | ⬜     | Migración + seed                                                           |
| S5-F: Reaactivar ítem "Marketing" en nav (apunta a `/marketing/campaigns`)             | ⬜     |                                                                            |

---

### Sprint S6 · Monitorización y Alertas

**Estimación**: ~4 horas  
**Estado**: ⬜ pendiente

| Tarea                                                                            | Estado | Notas                                        |
| -------------------------------------------------------------------------------- | ------ | -------------------------------------------- |
| S6-A: Badge de alertas en nav lateral (conexiones con error, tokens por expirar) | ⬜     |                                              |
| S6-B: API `GET /api/admin/connectors/health` — resumen salud                     | ⬜     | OK, error, revocadas, inactivas              |
| S6-C: Integrar resultado smoke test diario en dashboard `/panel`                 | ⬜     | Lee último resultado de la rutina programada |

---

## 4. Orden de ejecución recomendado

```text
Semana 1:
  Día 1 (hoy):   S0 — nav + loading.tsx (3h)
  Día 2:         S1 — tabla global conectores + CRUD (1 día)
  Día 3 mañana:  S2 — detalle usuario (4h)
  Día 3 tarde:   S3 — exports CSV (3h)

Semana 2:
  S4 — tokens PAT (4h)
  S5 — email marketing (1 día)
  S6 — alertas y monitorización (4h)
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
