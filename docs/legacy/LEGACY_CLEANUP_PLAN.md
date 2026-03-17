# Legacy Cleanup Plan (Feb 11, 2026)

## Objetivo
Eliminar completamente el legacy admin en el cliente y dejar una sola fuente de verdad en el panel Admin.

## Estado actual
- Redirección activa desde /dashboard/admin en cliente → admin.verifactu.business.
- APIs legacy admin en cliente bloqueadas (410).

## Carpetas legacy a eliminar (cliente)
- apps/app/app/dashboard/admin/
- apps/app/app/api/admin/

## Rutas legacy (cliente)
- /dashboard/admin/* (UI legacy)
- /api/admin/* (APIs legacy)

## Siguiente paso técnico
1) Borrar físicamente las carpetas legacy del cliente.
2) Eliminar referencias internas a /dashboard/admin (solo quedan enlaces históricos).
3) Verificar build + despliegue.

## Resultado esperado
- Cliente sin UI/admin legacy.
- Admin solo en admin.verifactu.business.
- Cero duplicidad de APIs admin.
