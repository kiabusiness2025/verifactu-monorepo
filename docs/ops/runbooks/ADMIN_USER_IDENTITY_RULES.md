# Admin User Identity Rules

Fecha: 2026-03-03

## Objetivo
Definir reglas operativas para evitar duplicados de usuarios en admin, unificar aliases de correo y mantener roles coherentes en panel y APIs.

## Reglas de identidad
1. La identidad de usuario se basa en `email` normalizado (`trim + lowercase`).
2. El correo canónico del admin de soporte es `soporte@verifactu.business`.
3. El alias histórico `support@verifactu.business` se considera la misma identidad y debe consolidarse sobre el canónico.
4. En panel admin, si existen registros duplicados por alias, debe mostrarse una sola fila consolidada.

## Reglas de rol por defecto
1. El rol por defecto para cualquier usuario registrado sin membership activa es `usuario`.
2. Si el usuario tiene memberships, se muestra el rol de tenant (owner/admin/member, etc.).
3. No se debe mostrar `-` o `Sin rol` en listados de admin para usuarios activos del sistema.

## Política de deduplicación
1. Deduplicar por email normalizado (y por alias canónico definidos por negocio).
2. Al consolidar cuentas, mover primero todas las referencias relacionales al usuario canónico.
3. Eliminar la cuenta alias solo cuando no queden referencias pendientes.

## Script operativo
Script: `scripts/admin/normalize-admin-user-aliases.js`

Modos:
- Dry-run (por defecto):
  - `node scripts/admin/normalize-admin-user-aliases.js`
- Apply:
  - `node scripts/admin/normalize-admin-user-aliases.js --apply`

Qué mueve automáticamente:
- `memberships`, `company_members`
- `user_preferences`, `user_onboarding`
- `support_sessions` (user/admin)
- `companies.owner_user_id`
- `subscriptions.user_id`
- `accounts`, `sessions`
- `audit_logs` (actor/target)
- `webhook_events.user_id`, `email_events.user_id`
- `isaak_conversations.user_id`

## Checklist antes de aplicar
1. Ejecutar dry-run y revisar conteos de referencias.
2. Confirmar que el usuario canónico existe.
3. Confirmar backup/snapshot reciente de base de datos.
4. Ejecutar `--apply` en ventana de mantenimiento corta.

## Checklist después de aplicar
1. Verificar que en admin no aparecen duplicados para soporte.
2. Verificar acceso y sesiones de soporte.
3. Verificar que `soporte@verifactu.business` conserva memberships/roles esperados.
4. Repetir diagnóstico de integridad U/T (`/operations/integrity`).
