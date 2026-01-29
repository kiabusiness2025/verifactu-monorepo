# Admin Build Status (local)

Date: 2026-01-29

## Resultado
- Build admin: OK
- Command: `pnpm --filter verifactu-admin build`

## Pruebas locales
Servidor dev lanzado con:
```
pnpm --filter verifactu-admin dev
```
Local URL: `http://localhost:3003`

Rutas comprobadas:
- `/tenants` -> 200
- `/users` -> 200
- `/audit-log` -> 200 (redirige a `/dashboard/admin/reports`)
- `/operations` -> 200

## Notas
- El script `dev` de admin fuerza el puerto 3003.
- Si quieres 3010, hay que actualizar el script en `apps/admin/package.json`.
