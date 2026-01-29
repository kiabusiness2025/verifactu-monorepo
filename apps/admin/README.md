# Admin Panel - Verifactu Business

Panel de administracion para gestion de usuarios, empresas, suscripciones y operaciones.

## Stack
- Next.js 14 (App Router)
- TypeScript
- Prisma + Postgres
- NextAuth (Google Workspace)
- Resend (emails)
- Stripe (suscripciones)
- Firebase Admin (sincronizacion)

## Estructura
```
apps/admin/
+-- app/           # rutas y paginas
+-- components/    # UI admin
+-- lib/           # auth, db, helpers
+-- server/        # integraciones server-side
+-- docs/          # guias internas
```

## Variables de entorno (minimo)
Recomendado en `apps/admin/.env.local`:

```
# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=
ADMIN_EMAILS=support@verifactu.business
ADMIN_ALLOWED_EMAIL=support@verifactu.business
ADMIN_ALLOWED_DOMAIN=verifactu.business
ADMIN_LOCAL_BYPASS=1   # solo local

# Database
DATABASE_URL=postgres://...
POSTGRES_URL=postgres://...
PRISMA_DATABASE_URL=prisma+postgres://...
DIRECT_DATABASE_URL=postgres://...

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Resend
RESEND_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# eInforma
EINFORMA_CLIENT_ID=
EINFORMA_CLIENT_SECRET=
EINFORMA_BASE_URL=https://developers.einforma.com/api/v1

# Vercel/GitHub
VERCEL_TOKEN=
GITHUB_TOKEN=
```

## Arranque local
```
pnpm --filter verifactu-admin dev -- --port 3010
```

## Migraciones y seed
```
pnpm -F @verifactu/db exec prisma migrate deploy
pnpm -F @verifactu/db exec prisma db seed
```

## Troubleshooting rapido
- `Invalid DATABASE_URL`: revisa que comience con `postgres://` y no tenga comentarios al final.
- `relation does not exist`: faltan migraciones en la BD.
- NextAuth warnings (dev): `NEXTAUTH_URL` y `NEXTAUTH_SECRET` deben existir.

## Siguientes pasos
1) Finalizar paneles: usuarios, suscripciones, email, vercel, soporte, auditoria.
2) Conectar Resend y Stripe con datos reales.
3) Revisar permisos SUPPORT y logs de auditoria.

Actualizado: enero 2026