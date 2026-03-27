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

### Proyecto 3: Isaak

- Dominio publico: `https://isaak.verifactu.business`
- App: `apps/isaak`
- Rol: experiencia publica propia de Isaak como producto independiente
- Regla: Isaak no debe presentarse como una seccion de `verifactu.business` ni como una subpantalla de Holded

## Apps internas y compartidas

- `apps/app`: app principal de cliente -> `https://app.verifactu.business`
- `apps/admin`: panel de administracion -> `https://admin.verifactu.business`
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

- apps/app: App principal (clientes) -> /app
- apps/client: App cliente alternativa o legacy (si aplica)
- apps/landing: Proyecto publico 1 -> verifactu.business
- apps/holded: Proyecto publico 2 -> holded.verifactu.business
- apps/isaak: Proyecto publico 3 -> isaak.verifactu.business
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
- docs/product/ISAAK_PRODUCT_REORDER_PLAN_2026.md (reordenacion del producto: Isaak como producto principal, Holded como entrada y app como core)
- apps/landing/README.md (proyecto publico verifactu.business)
- apps/holded/README.md (proyecto publico Holded)
- apps/isaak/README.md (proyecto publico Isaak)
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

- Proyecto publico 1: https://verifactu.business
- Proyecto publico 2: https://holded.verifactu.business
- Proyecto publico 3: https://isaak.verifactu.business
- Panel de Cliente: https://app.verifactu.business
- Panel de Admin: https://admin.verifactu.business
- /dashboard/admin en apps/app redirige al admin nuevo.

## Base de datos

- Migraciones (admin/app): pnpm -F @verifactu/db exec prisma migrate deploy
- Seed: pnpm -F @verifactu/db exec prisma db seed

Actualizado: enero 2026
