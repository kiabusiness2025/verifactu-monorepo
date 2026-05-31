# Sesión 6 — Demo Sandbox + Landing Overhaul (2026-05-29)

> **Rama**: `main`  
> **Commits**: `972b62e` → `d50159d`

## Objetivo

Cinco metas en una sesión:

1. Mocks visuales con datos reales de empresa demo (Nova Gestión).
2. Hub `verifactu.business` rediseñado con los 3 productos.
3. Tour animado en la home de Isaak + nav unificado.
4. Demo sandbox `isaak.app/demo` — chat Pro real con datos empresa demo.
5. Fix build `verifactu-admin` (Prisma schema + migrate-deploy).

---

## 1. Mocks visuales — `apps/isaak/scripts/demo-artifacts.mjs`

Script standalone ESM que llama a la API de Holded demo (`HOLDED_TEST_API_KEY`) y genera:

- `scripts/output/dashboard.html` — 4 gráficos interactivos (Chart.js CDN, autocontenido)
- `scripts/output/informe.docx` — Word con tablas

**Datos reales Nova Gestión (2024-01-01 → 2026-05-29):**

- 199 facturas de venta · 115.448 € total
- 112 gastos/compras · 19 proveedores · 37.115 €
- IVA a ingresar: 15.291 €

---

## 2. Hub `verifactu.business` — `LandingPublicHubV1.tsx`

### Estructura nueva

```
Hero (2 col: texto + Isaak mockup SVG)
  ├── [Probar Isaak gratis] + [Ver demo →] + pills Claude.ai / ChatGPT
¿Cuál es para ti? (3 cards comparativas con precio, bullets, CTA)
  ├── Isaak (29€/mes · trial)
  ├── Conector Claude (gratis · requiere Claude Pro)
  └── Conector ChatGPT (gratis · requiere ChatGPT Plus)
Qué puedes hacer con Isaak (texto + mockup SVG)
O usa la IA que ya tienes (2 cards: Claude + ChatGPT)
Lo que todos comparten (3 props)
CTA final (3 botones: Isaak + Claude + ChatGPT)
```

**Nav actualizada**: Isaak · Conector Claude · Conector ChatGPT · Contacto.

---

## 3. Tour animado + Landing Isaak — `IsaakHomeLandingV1.tsx`

### `IsaakHeroTour.tsx` — componente cliente reutilizable

- Extrae los 8 escenarios animados de la antigua `/tour/page.tsx`
- Sin título ni CTAs — el padre los proporciona
- Auto-ciclo 7s, pills de navegación, progress dots
- Datos Nova Gestión: bar, pie, line, dashboard, excel, pdf, presupuesto, balance

### Cambios en la home `isaak.app`

|               | Antes                                     | Después                                                     |
| ------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Nav           | Header propio (Precios/FAQ)               | `IsaakSiteChrome` (mismo que `/tour`)                       |
| Hero          | Texto + mockup estático                   | Texto centrado + `IsaakHeroTour` animado                    |
| CTAs          | "Probar gratis" + "Ver en acción → /tour" | **"Probar gratis"** + **"Probar con datos reales → /demo"** |
| CTA features  | Link a /tour                              | Link a /demo                                                |
| CTA principal | Solo registro                             | Registro + demo                                             |
| Indecisos     | No existía                                | Nueva sección: demo + precios + email equipo                |

### `IsaakSiteChrome.tsx`

- Eliminada exclusión `pathname === '/'` (la home ya no tiene su propio header)
- NAV_LINKS actualizado: "Demo en vivo" → `/demo`, "Cómo funciona" → `/#como-funciona`

### `/tour/page.tsx`

- Redirect a `/#como-funciona` (el tour vive en la home)

---

## 4. Demo Sandbox `isaak.app/demo`

### Arquitectura

```
/demo (page.tsx)
  └── getHoldedSession() → if !auth: redirect('/auth?redirect=/demo')
  └── checkDemoQuota(userId) → quota.used
  └── DemoShell (client)
       ├── Banner ámbar: empresa demo · mensajes restantes · [Conectar mi Holded]
       └── IsaakChatSection (streamEndpoint='/api/demo/chat/stream')

/api/demo/chat/stream
  └── loadDemoChatContext() → inyecta HOLDED_DEMO_API_KEY (Nova Gestión)
  └── checkDemoQuota() → 20 msgs/día (feature='demo_chat')
  └── classifyIntent() — mismo classifier
  └── buildReadOnlyToolsForContext({ only: ['holded'] }) — solo Holded read
  └── streamIsaakChat() — mismo orquestador SSE
  └── recordChatMetric(feature='demo_chat') — tracking independiente
```

### Ficheros nuevos

| Fichero                             | Propósito                                    |
| ----------------------------------- | -------------------------------------------- |
| `app/lib/isaak-demo-context.ts`     | `loadDemoChatContext()` + `checkDemoQuota()` |
| `app/api/demo/chat/stream/route.ts` | Endpoint SSE demo                            |
| `app/demo/DemoShell.tsx`            | Banner + chat (client)                       |
| `app/demo/page.tsx`                 | Auth gate + quota (server)                   |

### Decisiones clave

| Decisión                                    | Alternativa            | Motivo                                     |
| ------------------------------------------- | ---------------------- | ------------------------------------------ |
| `userId` real para conversación             | UUID ficticio          | Historial per-user, tracking real          |
| `tenantId` real para métricas               | Tenant demo compartido | Attributable a usuario específico          |
| Cuota separada (20/día)                     | Compartir con plan     | No consume quota de producción             |
| Solo tools Holded read                      | Todas las tools        | Demo = ERP data, sin banking/google/sector |
| Modelo Pro (Sonnet)                         | Haiku                  | Primera impresión importa                  |
| `allowWrites = false` siempre               | Según classifier       | Sandbox nunca modifica datos demo          |
| `streamEndpoint` prop en `IsaakChatSection` | Componente duplicado   | Zero code duplication                      |

### Alineación frontend/backend

- **Frontend**: automática — `IsaakChatSection` es el mismo componente en workspace y demo.
  Cualquier cambio UI aplica a ambos.
- **Backend**: manual — al añadir features a `/api/chat/stream`, evaluar si replicar en `/api/demo/chat/stream`.
  Los eventos SSE (`artifact`, `text-delta`, etc.) son automáticos vía `streamIsaakChat()`.
  Las nuevas tool categories o features (RAG, few-shot) requieren revisión explícita.

### Variable de entorno

```
HOLDED_DEMO_API_KEY=0ecf1267eacc89ff45acab1b8ca28396  # Nova Gestión S.L.
```

Añadida a Vercel production + preview del proyecto `verifactu-monorepo-isaak`.

---

## 5. Fix Prisma — `packages/db`

### Problema

`verifactu-admin` build fallaba con `P1001: Can't reach database server at db.prisma.io:5432`.
Los build servers de Vercel no tienen acceso TCP a Prisma Postgres.

### Fix

**`packages/db/prisma/schema.prisma`**:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("PRISMA_DATABASE_URL")   // Accelerate HTTPS (accessible everywhere)
  directUrl = env("DATABASE_URL")           // Direct TCP (for local dev)
}
```

**`packages/db/scripts/migrate-deploy.mjs`**:

- Si `migrate deploy` falla con P1001, reintenta usando `PRISMA_DATABASE_URL` (Accelerate)
- Prisma Postgres soporta `migrate deploy` vía Accelerate

---

## Próximo sprint (P2)

1. **`CORPUS_PDF_EXTRACTOR_ENABLED=1`** en Vercel — activa ingestor PDFs AEAT. Solo env var.
2. **Holded PGC mapper** — inferir `accountDebit`/`accountCredit` al importar facturas.
   Activa reglas R128/R129 del Inspector para todos los tenants Holded.

---

## Ficheros nuevos

```
apps/isaak/app/components/IsaakHeroTour.tsx
apps/isaak/app/lib/isaak-demo-context.ts
apps/isaak/app/api/demo/chat/stream/route.ts
apps/isaak/app/demo/DemoShell.tsx
apps/isaak/scripts/demo-artifacts.mjs
docs/engineering/sessions/2026-05-29_demo_landing.md
```

## Ficheros modificados

```
apps/isaak/app/components/IsaakHomeLandingV1.tsx   hero tour + CTAs + nav fix
apps/isaak/app/components/IsaakSiteChrome.tsx       quita exclusión home + nav links
apps/isaak/app/(workspace)/components/IsaakChatSection.tsx  prop streamEndpoint
apps/isaak/app/demo/page.tsx                        reemplazado: auth gate + demo
apps/isaak/app/tour/page.tsx                        reemplazado: redirect
apps/landing/app/components/LandingPublicHubV1.tsx  hub 3 productos rediseñado
packages/db/prisma/schema.prisma                    Accelerate como url principal
packages/db/scripts/migrate-deploy.mjs              fallback Accelerate en P1001
```
