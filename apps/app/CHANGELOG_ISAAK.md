# Cambios recientes (enero 2026)

## Estructura y rutas

- Añadidas rutas públicas: `/login`, `/logout`, `/select-tenant` en la raíz de la app.
- Ajustada la ruta de equipo a `/settings/team`.
- Todo lo funcional permanece bajo `/t/[tenantSlug]/...` para multiempresa y soporte.

## Handlers de API

- Estructura base creada para `/api/webhooks`, `/api/cron`, `/api/invoices`.
- `/api/invoices` ya implementa lógica real de consulta y creación de facturas.

## Notas prácticas integradas

- Conciliación bancaria, impersonación y Veri\*Factu modelados según la misión.

## Siguiente paso

- Pruebas locales y migración de más handlers/API.
