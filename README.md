# Verifactu Business - Monorepo

Plataforma SaaS para facturacion y cumplimiento VeriFactu. Este monorepo contiene varios productos publicos y apps internas que comparten backend, autenticacion y datos, pero no deben confundirse como una sola experiencia publica.

## Mapa de productos

### Proyecto 1: verifactu.business

- Dominio publico principal: `https://verifactu.business`
- App: `apps/landing`
- Rol: web corporativa, marketing, captacion, pricing y acceso general

### Proyecto 2: Holded

- Dominio publico: `https://holded.verifactu.business`
- App: `apps/holded`
- Rol: experiencia publica dedicada a la compatibilidad y onboarding Holded-first
- Regla: Holded tiene identidad publica propia, aunque comparta backend con el resto

#### Documentación de ampliación del conector Holded

- [Roadmap de expansión y prioridades](docs/product/HOLDED_DIRECT_CONNECTOR_EXPANSION_ROADMAP_2026.md)
- [Plan de implementación por bloques](docs/product/HOLDED_DIRECT_CONNECTOR_EXPANSION_IMPLEMENTATION_PLAN_2026.md)

### Proyecto 3: Isaak

- Dominio publico: `https://isaak.verifactu.business`
- App: `apps/isaak`
- Rol: experiencia publica propia de Isaak como producto independiente
- Regla: Isaak no debe presentarse como una seccion de `verifactu.business` ni como una subpantalla de Holded

## Apps internas y compartidas

- `apps/app`: core canonico de negocio + panel avanzado + runtime MCP/OAuth de Holded -> `https://app.verifactu.business`
- `apps/admin`: panel de administracion -> `https://admin.verifactu.business`
- `apps/client`: legacy congelado, sin nuevas features
- `packages/*`: UI, utils, db, auth, integrations

Regla operativa:

- Los tres proyectos publicos comparten backend, autenticacion, tenancy y datos cuando corresponde.
- La marca, la UX publica, la documentacion operativa y las variables publicas deben mantenerse separadas.

## Aislamiento obligatorio entre proyectos

Esta regla es obligatoria para evitar incidencias de dominio, certificados y correos.

| Proyecto    | Dominio publico             | Carpeta        | Proyecto Vercel | Dominio de envio email                  |
| ----------- | --------------------------- | -------------- | --------------- | --------------------------------------- |
| Landing     | `verifactu.business`        | `apps/landing` | landing         | `@verifactu.business`                   |
| Holded      | `holded.verifactu.business` | `apps/holded`  | holded          | `@holded.verifactu.business`            |
| Isaak       | `isaak.verifactu.business`  | `apps/isaak`   | isaak           | `@isaak.verifactu.business` (si aplica) |
| App cliente | `app.verifactu.business`    | `apps/app`     | app             | no aplica publico                       |
| Admin       | `admin.verifactu.business`  | `apps/admin`   | admin           | no aplica publico                       |

Normas de no mezcla:

- Cada dominio debe estar asignado solo a su proyecto Vercel correspondiente.
- No reutilizar variables `NEXT_PUBLIC_*` de un proyecto en otro.
- No mezclar remitentes de Resend entre landing y holded.
- Si se mueve un dominio entre proyectos, revalidar DNS y certificado en Vercel antes de darlo por bueno.

## Apps

- apps/app: core compartido, panel avanzado y conector remoto Holded/MCP
- apps/client: legacy congelado
- apps/landing: Proyecto publico 1 -> verifactu.business
- apps/holded: Proyecto publico 2 -> holded.verifactu.business
- apps/isaak: Proyecto publico 3 -> isaak.verifactu.business
- apps/admin: Panel de administracion -> /admin
- packages/\*: UI, utils, db, auth, integrations

## Si trabajas en Holded o en Isaak

La ruta de lectura recomendada es:

1. [apps/app/README.md](apps/app/README.md) para entender el core y el runtime real del conector MCP/OAuth.
2. [packages/integrations/README.md](packages/integrations/README.md) para la capa compartida de conexion e integraciones.
3. [apps/holded/README.md](apps/holded/README.md) para la entrada Holded-first, autenticacion y handoff.
4. [apps/isaak/README.md](apps/isaak/README.md) para el producto principal conversacional.
5. [docs/README.md](docs/README.md) para bajar al resto de documentos tecnicos, de producto y operacion.

## Implementaciones clave (resumen)

- Auth: Firebase + NextAuth (Google Workspace) en admin.
- DB: Prisma + Postgres (Vercel Postgres).
- Email: Resend (admin).
- Suscripciones: Stripe (admin).
- eInforma: onboarding y busqueda de empresas (app y admin).
- Isaak unificado: asistencia proactiva por seccion en landing, panel cliente y admin.

## Isaak (estado Feb 2026)

- Personalidad configurable para nuevos usuarios: `Amigable`, `Profesional`, `Directo`.
- Persistencia de personalidad:
  - `apps/app`: backend (`/api/user/preferences`) + fallback local.
  - `apps/admin`: backend (`/api/admin/preferences`) + fallback local.
  - `apps/client`: backend (`/api/preferences`) con resolucion best-effort por tenant + fallback local.
  - `apps/landing`: fallback local (visitante anonimo), con prompts por contexto de pagina.
- Flujo proactivo por dashboards/modulos:
  - Cliente: dashboard, facturas, clientes, bancos, calendario, ajustes, Isaak.
  - Admin: dashboard, empresas, usuarios, soporte, operaciones, integraciones.
  - Landing: home, verifactu, producto, recursos, precios.
- Prefill de prompts desde ayudas guiadas/tour demo hacia el chat de Isaak en `apps/app`.

Nota client (temporal): hasta completar auth/sesion en `apps/client`, la persistencia backend de tono usa resolucion operativa del usuario OWNER activo del tenant.

## Variables de entorno

La documentacion detallada de variables esta en:

- apps/admin/README.md (admin)
- apps/app/.env.example (app)
- apps/client/README.md (client)
- apps/landing/.env.example (landing)
- docs/README.md (indice de documentacion)

## Documentacion

- docs/INDEX.md (indice general)
- docs/product/ISAAK_PRODUCT_REORDER_PLAN_2026.md (reordenacion del producto: Isaak como producto principal, Holded como entrada y app como core)
- apps/app/README.md (core canonico del negocio, runtime MCP/OAuth y fuente de verdad operativa)
- apps/landing/README.md (proyecto publico verifactu.business)
- apps/holded/README.md (proyecto publico Holded y puerta de entrada Holded-first)
- apps/isaak/README.md (producto principal Isaak)
- docs/engineering/ai/ISAAK_UNIFIED_EXPERIENCE_2026.md (flujo unificado de Isaak)
- apps/client/README.md (panel cliente)

## Changelog Feb 2026

- Isaak unificado y proactivo en landing, app, client y admin con sugerencias por contexto.
- Selector de personalidad para nuevos usuarios (`Amigable`, `Profesional`, `Directo`) en todas las experiencias activas.
- Persistencia de personalidad en backend para app y admin; client con endpoint propio y fallback por tenant; landing con fallback local.
- Integracion de guias demo/tour con prefill de preguntas para reducir friccion de uso.
- Documentacion actualizada en README raiz, docs index y guias especificas de app/admin/client/landing.

## Changelog May 2026

- Pipeline de video demo implementado en `scripts/video-pipeline/`: Holded API + Claude API + Playwright + FFmpeg + Sora (opcional).
- 6 escenas HTML animadas autocontenidas con dual-layout (Claude: 2 columnas + panel artefacto / ChatGPT: 1 columna con tablas enriquecidas).
- Tema claro universal inyectado desde `pipeline-utils.js` con overrides CSS `!important`.
- Soporte de 3 formatos de exportacion: 16:9 (YouTube/LinkedIn), 9:16 (Reels/TikTok), 1:1 (Instagram).
- Componente `DemoIframeHero` para embeber las escenas animadas como iframe en los Heros de las landings de cada conector.
- Documentacion completa del pipeline en `scripts/video-pipeline/README.md`.

## Changelog Abr 2026

- El conector directo `ChatGPT <-> Holded` en `apps/app` se ha estabilizado con onboarding por pasos, sesion temporal propia para `channel=chatgpt` e identidad verificada antes de pedir la API key.
- El paso de identidad ya soporta Google opcional o correo verificado; la sesion del conector conserva `authMethod`, `emailVerified`, `verifiedAt`, `firstName` y `lastName`, y recuerda identidad validada con prefill reutilizable por `(uid, email)`.
- El flujo ya no debe depender del login web clasico ni del estado React del mismo ciclo: `tenantId` y onboarding token se propagan de forma explicita hasta `connect` y `oauth/authorize` para evitar rebotes y bucles.
- La UX publica del conector se ha endurecido: aceptacion legal explicita, correo final solo tras conexion correcta, notificaciones de seguridad, bloqueo del paso de API hasta completar los datos previos y correcciones de popup, cache y mobile.
- Holded pasa a resolverse en modo `channel-aware`: `external_connections` es la fuente operativa activa para `dashboard` y `chatgpt`, con estado, sync, error y disconnect aislados por `channel_key`.
- El runtime MCP/OAuth se ha reforzado con PKCE S256, codigos de autorizacion de un solo uso y metadata alineada con OpenAI para discovery y protected resource.
- Se ha reforzado la compatibilidad con entornos legacy: `tenant_profiles` se lee y escribe segun disponibilidad real de columnas, y se corrigieron incidencias de produccion por columnas ausentes y por SQL mal formado en `holdedConnectionResolver`.
- El perimetro publico del conector queda ahora mas claro: eInforma sale de la surface publica del conector y el preset publico por defecto `openai_review_v2` mantiene una exposicion limitada y revisable.
- La capacidad publica validada hoy del conector queda centrada en facturas, contactos, cuentas contables, diario, bookings y proyectos; el detalle operativo del preset actual esta documentado en `apps/app/README.md`.

## Pipeline de video demo (automatizacion de marketing)

Sistema Python en `scripts/video-pipeline/` que genera videos de demostracion del conector Holded+IA de forma completamente automatizada.

**Flujo:** Holded API (datos reales) → Claude API (guiones Q&A) → Playwright (graba escenas HTML animadas) → FFmpeg (monta video final)

**Escenas HTML** (en `apps/holded/public/demo/`):

- 6 escenas animadas autocontenidas: P&G, clientes, facturas, dashboard, borrador de factura, comparativa
- Dual-layout por conector: `?connector=claude` → 2 columnas (chat + panel artefacto blanco animado) / `?connector=chatgpt` → 1 columna ancho completo con tablas enriquecidas
- `?once=1` → Playwright graba un ciclo y el HTML llama a `window.signalDone()` al terminar
- Tema claro inyectado automaticamente desde `pipeline-utils.js` (fondo `#f5f7fa`, texto oscuro)

**Comando rapido (sin instalar Sora):**

```bash
pip install anthropic openai playwright requests python-dotenv
python -m playwright install chromium
winget install --id Gyan.FFmpeg -e

cd scripts/video-pipeline
python run.py --connector claude --skip-sora        # Video Claude 16:9
python run.py --all-connectors --all-formats --skip-sora  # 6 videos (2 conectores x 3 formatos)
```

**Formatos de salida:** `16x9` (YouTube/LinkedIn) · `9x16` (Reels/TikTok) · `1x1` (Instagram)

**Variables de entorno necesarias** (en `.env.local` raiz):

- `ANTHROPIC_API_KEY` — para generar guiones con Claude
- `ISAAK_NEW_OPENAI_API_KEY` o `SORA_API_KEY` — para fondos Sora (opcional con `--skip-sora`)

**Documentacion completa:** [scripts/video-pipeline/README.md](scripts/video-pipeline/README.md)

**Embed en Hero de landings:** componente `DemoIframeHero` cicla las 6 escenas como iframe en las landings de `/conectores/claude` y `/conectores/chatgpt`.

## Siguientes pasos (prioridad)

1. Terminar paneles admin: usuarios, suscripciones, emails, Vercel, soporte.
2. Completar onboarding con eInforma y activar trial.
3. Verificar permisos y auditoria (admin/support).
4. Revisar seeds y datos demo.
5. Dashboard /app: "Acciones con Isaak" ya dinamico por empresa demo (API stub; pendiente conectar a tenants reales).

## Desarrollo rapido

- Instalar dependencias: pnpm install
- App cliente: pnpm --filter verifactu-app dev (http://localhost:3000)
- Admin: pnpm --filter verifactu-admin dev (http://localhost:3003)
- Landing: pnpm --filter verifactu-landing dev

## Rutas y paneles

- Proyecto publico 1: https://verifactu.business
- Proyecto publico 2: https://holded.verifactu.business
- Proyecto publico 3: https://isaak.verifactu.business
- Panel de Cliente: https://app.verifactu.business
- Panel de Admin: https://admin.verifactu.business
- /dashboard/admin en apps/app redirige al admin nuevo.

## Base de datos

- Migraciones (admin/app): pnpm -F @verifactu/db exec prisma migrate deploy
- Seed: pnpm -F @verifactu/db exec prisma db seed

Actualizado: abril 2026
