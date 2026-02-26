# Verifactu Business - Monorepo

Plataforma SaaS para facturacion y cumplimiento VeriFactu. Monorepo con apps web, landing y panel de administracion.

## Apps

- apps/app: App principal (clientes) -> /app
- apps/client: App cliente alternativa o legacy (si aplica)
- apps/landing: Marketing + login
- apps/admin: Panel de administracion -> /admin
- packages/\*: UI, utils, db, auth, integrations

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
- docs/engineering/ai/ISAAK_UNIFIED_EXPERIENCE_2026.md (flujo unificado de Isaak)
- apps/client/README.md (panel cliente)

## Changelog Feb 2026

- Isaak unificado y proactivo en landing, app, client y admin con sugerencias por contexto.
- Selector de personalidad para nuevos usuarios (`Amigable`, `Profesional`, `Directo`) en todas las experiencias activas.
- Persistencia de personalidad en backend para app y admin; client con endpoint propio y fallback por tenant; landing con fallback local.
- Integracion de guias demo/tour con prefill de preguntas para reducir friccion de uso.
- Documentacion actualizada en README raiz, docs index y guias especificas de app/admin/client/landing.

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

- Panel de Cliente: https://app.verifactu.business
- Panel de Admin: https://admin.verifactu.business
- /dashboard/admin en apps/app redirige al admin nuevo.

## Base de datos

- Migraciones (admin/app): pnpm -F @verifactu/db exec prisma migrate deploy
- Seed: pnpm -F @verifactu/db exec prisma db seed

Actualizado: enero 2026
