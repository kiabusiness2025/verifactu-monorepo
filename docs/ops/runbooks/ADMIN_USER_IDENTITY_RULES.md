# Admin User Identity Rules

Fecha: 2026-03-04

## Objetivo
Evitar duplicados visuales/funcionales de usuarios en admin y asegurar rol por defecto consistente.

## Reglas
1. Identidad de usuario por email normalizado (`trim + lowercase`).
2. Correo canónico de soporte: `soporte@verifactu.business`.
3. Alias histórico aceptado: `support@verifactu.business` -> se consolida bajo el canónico.
4. En listados admin no se deben mostrar filas duplicadas para la misma identidad.

## Rol por defecto
1. Si el usuario no tiene memberships activas, mostrar rol `usuario`.
2. Si tiene memberships, priorizar rol de membership para contexto tenant.

## Operación recomendada
1. Ejecutar dedupe visual en API admin (`/api/admin/users`).
2. Ejecutar consolidación de datos con script de aliases cuando aplique.

Script:
- `node scripts/admin/normalize-admin-user-aliases.js` (dry-run)
- `node scripts/admin/normalize-admin-user-aliases.js --apply` (aplica cambios)

## Verificación
1. `/dashboard/admin/users` sin duplicados para cuenta soporte.
2. Botón abrir ficha funciona aunque el usuario no tenga tenant.
3. Rol visible nunca aparece vacío (`-` / `Sin rol`).
