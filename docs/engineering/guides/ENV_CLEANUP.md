# Entornos: organización y flujo

## Objetivo

Mantener un **único origen local** y generar los .env por proyecto, evitando conflictos y errores en despliegue.

## Estructura

- env/.env.base (local, **NO commit**)
- apps/app/.env.local
- apps/admin/.env.local
- apps/landing/.env.local
- apps/api/.env.local

## Scripts

- Auditoría: scripts/env-audit.mjs
- Importación: scripts/env-import.mjs (rellena env/.env.base desde .env_backup)
- Renderizado: scripts/env-build.mjs (genera .env.local por app)

## Flujo recomendado

1. Rellenar env/.env.base con los valores correctos.
2. Ejecutar:
   - node scripts/env-build.mjs
3. Importar en Vercel cada .env.local en su proyecto.

## Notas críticas

- **landing** no debe incluir secretos de servidor (DB, Firebase Admin, Stripe secret, etc.).
- **app/admin** sí pueden tener secretos si usan rutas server.
- eInforma: usar
  - EINFORMA_TOKEN_URL=https://api.einforma.com/oauth/token
  - EINFORMA_API_BASE_URL=https://developers.einforma.com/api/v1
