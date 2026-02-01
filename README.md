# Verifactu Business - Monorepo

Plataforma SaaS para facturacion y cumplimiento VeriFactu. Monorepo con apps web, landing y panel de administracion.

## Apps

- apps/app: App principal (clientes)
- apps/client: App cliente alternativa o legacy (si aplica)
- apps/landing: Marketing + login
- apps/admin: Panel de administracion
- packages/\*: UI, utils, db, auth, integrations

## Implementaciones clave (resumen)

- Auth: Firebase + NextAuth (Google Workspace) en admin.
- DB: Prisma + Postgres (Vercel Postgres).
- Email: Resend (admin).
- Suscripciones: Stripe (admin).
- eInforma: onboarding y busqueda de empresas (app y admin).

## Variables de entorno

La documentacion detallada de variables esta en:

- apps/admin/README.md (admin)
- apps/app/.env.example (app)
- apps/landing/.env.example (landing)
- docs/README.md (indice de documentacion)

## Documentacion

- docs/INDEX.md (indice general)

## Siguientes pasos (prioridad)

1. Terminar paneles admin: usuarios, suscripciones, emails, Vercel, soporte.
2. Completar onboarding con eInforma y activar trial.
3. Verificar permisos y auditoria (admin/support).
4. Revisar seeds y datos demo.

## Desarrollo rapido

- Instalar dependencias: pnpm install
- App cliente: pnpm --filter verifactu-app dev
- Admin: pnpm --filter verifactu-admin dev
- Landing: pnpm --filter verifactu-landing dev

## Base de datos

- Migraciones (admin/app): pnpm -F @verifactu/db exec prisma migrate deploy
- Seed: pnpm -F @verifactu/db exec prisma db seed

Actualizado: enero 2026
