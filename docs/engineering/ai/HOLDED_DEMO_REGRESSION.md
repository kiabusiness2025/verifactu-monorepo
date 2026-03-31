# Holded Demo Regression

## Objetivo

Usar el tenant demo de Holded para validar, de forma repetible, la integración de Verifactu con Holded antes y después de cambios en:

- onboarding de Holded
- conexión compartida por tenant
- catálogo MCP de ChatGPT
- acciones internas de Isaak que dependen del adapter de Holded

Este flujo usa un tenant interno de pruebas y no debe ejecutarse contra tenants reales de clientes.

## Entorno local

La clave de pruebas debe vivir solo en entorno interno:

- `apps/holded/.env.local`
- variable esperada: `HOLDED_TEST_API_KEY`

El cargador compartido de scripts usa este orden:

1. `process.env`
2. `apps/holded/.env.local`
3. `.env.local` en la raíz del monorepo

## Comandos

Desde la raíz del monorepo:

```bash
pnpm holded:ci:contract
pnpm holded:demo:seed
pnpm holded:demo:smoke
pnpm holded:demo:validate
```

Variantes útiles:

```bash
pnpm holded:demo:validate -- --seed-only
pnpm holded:demo:validate -- --smoke-only
pnpm holded:demo:validate -- --dry-run-seed
```

## CI frente a smoke real

La separación recomendada ya no es tener un único runner para todo.

- `pnpm holded:ci:contract`: validación segura para CI. No depende de Holded, no escribe datos y comprueba contrato MCP, guards y sincronía de scopes.
- `pnpm holded:demo:validate`: validación viva contra el tenant demo. Usa credenciales reales y debe ejecutarse antes de desplegar cambios que afecten a Holded, ChatGPT o Isaak.

Decisión práctica:

- dejar `scripts/holded-full-smoke.mjs` como runner vivo para validación manual, predeploy o job programado interno
- usar `holded:ci:contract` en cada PR o pipeline normal

Así evitamos meter un test con efectos reales y dependencia externa dentro del CI general, pero seguimos teniendo una regresión viva reproducible cuando toca.

## Qué deja sembrado el seed

El seed de demo deja datos persistentes e idempotentes en Holded para tener contexto funcional estable:

- contactos demo
- grupos de contacto demo
- productos demo
- servicios demo
- borradores de documentos demo

El seed intenta no duplicar registros persistentes ya existentes.

## Qué valida el smoke runner

El smoke runner hace validación real contra la API de Holded y limpia los datos temporales que crea, salvo donde la propia API no permite borrado.

Cobertura validada en vivo el 2026-03-31:

- lectura: documents, contacts, products, services, expensesaccounts, saleschannels, warehouses, contactgroups, treasury, payments, paymentmethods, remittances, taxes, numberingseries
- CRUD completo: contacts, products, services, warehouses, contactgroups, documents, numberingseries, payments
- CRUD con borrado lógico: expensesaccounts, saleschannels
- alta, lectura y edición: treasury

Resultado validado del último pase:

- `104 passed`
- `0 failed`

## Cobertura actual del MCP

La configuración MCP de Holded expone ya la superficie validada de facturación que tiene sentido abrir hoy:

- documentos: listar, obtener, crear, actualizar, eliminar
- contactos: listar, obtener, crear, actualizar, eliminar
- tesorería: listar, obtener, crear, actualizar
- cuentas de gasto: listar, obtener, crear, actualizar, eliminar con semántica de archivado de Holded
- series de numeración: listar por tipo, crear, actualizar, eliminar
- productos: listar, obtener, crear, actualizar, eliminar
- canales de venta: listar, obtener, crear, actualizar, eliminar con semántica de archivado de Holded
- almacenes: listar, obtener, crear, actualizar, eliminar
- pagos: listar, obtener, crear, actualizar, eliminar
- impuestos: listar
- métodos de pago: listar
- grupos de contacto: listar, obtener, crear, actualizar, eliminar
- remesas: listar, obtener
- servicios: listar, obtener, crear, actualizar, eliminar
- lectura de apoyo ya existente: cuentas contables, bookings CRM, proyectos y tareas
- compatibilidad mantenida: `holded_list_invoices`, `holded_get_invoice`, `holded_create_invoice_draft`

## Endpoints todavía no expuestos en MCP

Estos bloques siguen fuera del catálogo MCP porque no están validados en el smoke actual o porque Holded tiene semántica especial que requiere otra capa de producto:

- eliminar cuentas de tesorería
- libro diario contable: listar asientos y crear asiento
- crear cuenta contable
- adjuntos de contacto
- compra de producto
- imágenes de producto
- actualización de stock de producto
- stock por almacén
- documento de nómina
- enviar documento
- obtener PDF de documento
- enviar todos los artículos
- envío por línea
- unidades enviadas por artículo
- adjuntar archivo a documento
- actualizar tracking de documento
- actualizar data string de documento

## Semántica especial de Holded ya verificada

Estas diferencias no son bugs del runner. Son comportamiento real de Holded y hay que tratarlas así en producto y tests:

- `expensesaccounts.delete` archiva, no borra en duro
- `saleschannels.delete` archiva, no borra en duro
- `treasury.delete` devuelve `405`
- `warehouses.update` puede devolver `201`
- `documents.create` puede devolver `200`
- `numberingseries.create` puede devolver un id placeholder y el id real hay que recuperarlo del listado por tipo
- para `expensesaccounts` y `saleschannels`, conviene arrancar desde el máximo visible + 1 y reintentar si Holded responde `409`, porque hay números ocupados fuera de la vista normal

## Cuándo ejecutar esta regresión

Ejecutar `pnpm holded:demo:validate` como mínimo cuando ocurra cualquiera de estos casos:

- cambia la `HOLDED_TEST_API_KEY` del tenant demo
- se toca el onboarding de Holded
- se cambia la resolución de conexión compartida por tenant o canal
- se añaden o cambian tools del MCP de Holded
- se cambia el adapter compartido de Holded
- antes de un despliegue que afecte a ChatGPT o a Isaak con Holded

Ejecutar `pnpm holded:ci:contract` en cualquier cambio que toque:

- catálogo MCP de Holded
- scopes OAuth del MCP
- validación de argumentos o `confirm=true`
- documentación operativa de la integración en ChatGPT

## Criterio de pase

El cambio queda listo si se cumplen las tres condiciones:

1. `pnpm holded:ci:contract` termina sin fallos.
2. `pnpm holded:demo:validate` termina sin fallos cuando el cambio toca integración real o despliegue.
3. No se abre en MCP ninguna operación no validada todavía contra el tenant demo.
