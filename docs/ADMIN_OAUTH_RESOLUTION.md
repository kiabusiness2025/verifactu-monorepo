# Resolución OAuth /admin (2026-02-03)

## Resultado
- Acceso a https://admin.verifactu.business operativo.
- OAuth Google funcionando.

## Causas raíz
1) Variables de OAuth almacenadas con salto de línea en Vercel.
2) Faltaban variables de base de datos para Prisma en el proyecto admin.

## Cambios aplicados (Vercel: proyecto admin)
- Reconfiguradas variables sin saltos de línea:
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
- Añadidas variables de base de datos:
  - DATABASE_URL
  - PRISMA_DATABASE_URL
- Asegurado NEXTAUTH_URL en producción.
- Eliminada la variable temporal:
  - ADMIN_RELAXED_AUTH
- Redeploy de producción tras cada cambio.

## Nota sobre Google Cloud Console
- Orígenes/redirects de OAuth incluyen:
  - https://admin.verifactu.business
  - https://admin.verifactu.business/api/auth/callback/google

## Estado actual
- Login con cuenta de admin funciona.

## Siguientes pasos recomendados
- Mantener solo variables necesarias en el proyecto admin.
- Evitar almacenar secretos en archivos del repo.
