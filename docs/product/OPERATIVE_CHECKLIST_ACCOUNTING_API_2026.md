# Checklist Operativo 2026-02: Web + App + Backend + Datos

## Objetivo

Alinear producto y documentación con el modelo de salida dual:

- Motor A: exportación de libros oficiales compatibles AEAT.
- Motor B: integración con tu programa de contabilidad vía API.

Este documento es la referencia operativa para copy, UX, datos, backend y QA.

## Cambios globales (aplican a todo)

- Integración contable vía API: opcional.
- Libros oficiales AEAT (Excel): disponibles para todos los planes.
- Integración API y bidireccional de presupuestos: solo Empresa/PRO.
- Sin marcas de proveedor en copy público/UI de cliente.

## Reglas de copy (obligatorias)

- No mencionar marcas de proveedores de integración en canales públicos ni UI de cliente.
- En planes `Empresa` y `PRO` usar: `Integración con tu programa de contabilidad vía API`.
- En todos los planes incluir: `Libros oficiales (Excel) compatibles AEAT`.
- La integración contable vía API es opcional y solo funcional en `Empresa` y `PRO`.

## Feature Flags por plan (obligatorio)

- `canExportAeatBooks = true` en todos los planes.
- `canUseAccountingApiIntegration = true` solo en Empresa/PRO.
- `canBidirectionalQuotes = true` solo en Empresa/PRO.

## Roadmap por sprint (estado esperado)

### Sprint 0 (prep)

- [x] Eliminación de marcas en copy/UI/docs públicos.
- [x] Copy de planes: libros AEAT para todos + API solo Empresa/PRO.
- [x] Flags por plan definidos.

### Sprint 1 (pivot base)

- [x] Export AEAT (`books`, `303`, `130`) habilitado para todos.
- [x] Pantalla de Integraciones visible para todos:
  - [x] Empresa/PRO funcional.
  - [x] BÁSICO/PYME bloqueada con upsell.

### Sprint 2 (sync unidireccional API)

- [x] Outbox + logs + ejecución de sync.
- [x] Gating por plan en sync API (solo Empresa/PRO).

### Sprint 3 (quotes bidireccional + conflictos)

- [x] Quote CRUD y convert-to-invoice.
- [x] Pull/push/conflicts/resolve en presupuestos.
- [x] Gating por plan en bidireccional quotes (solo Empresa/PRO).

## A) Web pública (marketing)

### A1. Planes (landing + /planes)

- [x] Sustituir menciones de proveedor concreto por texto genérico de integración API.
- [x] Mantener libros AEAT Excel en todos los planes.
- [x] Mantener la integración API opcional y solo activa en Empresa y PRO.
- [x] Mantener una tabla/comparativa por capacidades (facturación, gastos Isaak, libros AEAT, integración API, conciliación cuando aplique).

### A2. Página Integraciones

- [x] Renombrar bloque a `Programa de contabilidad (vía API)`.
- [x] Texto neutro: conexión por API Key sobre software compatible.
- [x] No listar marcas/partners en copy público por defecto.

### A3. Páginas explicativas

- [x] Mensajería de salida dual: libros AEAT para planes base y sync API para Empresa/PRO.
- [x] Mensajería de migración/importación neutral por proveedor.

## B) App (UX)

### B1. Navegación y módulos

- [x] Ventas: Facturas + Presupuestos.
- [x] Gastos (Isaak).
- [x] Clientes/Proveedores.
- [x] Artículos.
- [x] Documentos.
- [x] Impuestos (303/130 export + preview).
- [x] Integraciones (programa contable vía API).

### B2. Permisos por plan

- [x] Guardrail backend para conectar integración API solo en Empresa/PRO.
- [x] En UI de integraciones mostrar estado de plan y disponibilidad.
- [x] En BÁSICO/PYME mostrar pantalla bloqueada/upsell en Integraciones.
- [x] En Empresa/PRO habilitar conexión API key + estado/sync.

### B3. Todo tipo de empresas

- [x] Onboarding con perfil fiscal mínimo: país, taxId, razón social, dirección fiscal, régimen opcional.
- [x] No bloquear por tipo jurídico (`autónomo`, `SL`, etc.).
- [x] Si no aplica 303/130, mantener exportación de libros oficiales.

## C) Datos (Prisma)

### C1. Perfil fiscal de tenant

- [x] `TenantProfile` extendido con:
  - `taxId`
  - `legalName`
  - `tradeName`
  - `fiscalAddress`
  - `taxRegime`
  - `defaultCurrency`

### C2. Integración contable genérica

- [x] `TenantIntegration` + `IntegrationMap` + `SyncOutbox` + `SyncLog`.
- [x] `SyncConflict` para resolución de colisiones en bidireccional.
- [x] `IntegrationMap` con metadatos de sync (`lastPulledAt`, `lastRemoteUpdatedAt`).
- [ ] Estandarizar provider de base de datos a valor genérico (`accounting_api`) en todo el stack.

### C3. Gasto fiscal

- [x] `ExpenseRecord` con `docType`, `taxCategory`, `aeatConcept`, `aeatKey`.

## D) Backend

### D1. Motor A (AEAT export)

- [x] `GET /api/aeat/books/sales?from=&to=&format=csv|xlsx`
- [x] `GET /api/aeat/books/purchases?from=&to=&format=csv|xlsx`
- [x] `GET /api/aeat/export/303?period=&format=csv|xlsx`
- [x] `GET /api/aeat/export/130?period=&format=csv|xlsx`
- [x] `GET /api/aeat/preview/303?period=`
- [x] `GET /api/aeat/preview/130?period=`
- [x] Exportación AEAT accesible para cualquier tenant (sin gating por plan).

### D2. Motor B (integración API)

- [x] Alta/desconexión/estado/logs/sync run en integraciones.
- [x] Outbox + retries + logging.
- [x] Push de entidades base (invoice/expense/contact/product/payment) vía cola.
- [x] Presupuestos en sync bidireccional (pull/push/conflicts/resolve).
- [x] Gating por plan en sync/run y bidireccional quotes (solo Empresa/PRO).

## E) Presupuestos (bidireccional)

### E1. Entidad y endpoints

- [x] `Quote` con estados `draft|sent|accepted|rejected|expired`.
- [x] `GET /api/quotes`
- [x] `POST /api/quotes`
- [x] `GET /api/quotes/:id`
- [x] `PATCH /api/quotes/:id`
- [x] `POST /api/quotes/:id/send`
- [x] `POST /api/quotes/:id/accept`
- [x] `POST /api/quotes/:id/reject`
- [x] `POST /api/quotes/:id/convert-to-invoice`

### E2. Reglas anti-conflicto

- [x] Fuente por objeto (`source=local|remote`).
- [x] Detección `both_modified`.
- [x] `SyncConflict` + resolución `use_local|use_remote`.
- [x] Idempotencia con hash de payload canónico.

## F) Admin / Observabilidad

- [x] Estado de integración por tenant (`status`, `lastSyncAt`, `lastError`).
- [x] Logs de sincronización por tenant.
- [x] Cola de sync (`sync_outbox`) preparada para visor operativo.
- [ ] Vista admin dedicada de `Outbox` y reintentos manuales por item.

## G) QA mínimo

- [ ] Tests export AEAT con casos de IVA mixto y gasto no factura.
- [ ] Tests idempotencia: payload idéntico no duplica push.
- [ ] Tests conflictos quotes: cambios locales+remotos crean conflicto.
- [ ] Test e2e de `convert-to-invoice` con evento outbox.

## Inventario de rutas relevantes (actual)

### Integraciones

- `GET /api/integrations`
- `POST /api/integrations/accounting/connect`
- `POST /api/integrations/accounting/disconnect`
- `GET /api/integrations/accounting/status`
- `GET /api/integrations/accounting/logs`
- `POST /api/integrations/accounting/sync/run`
- `POST /api/integrations/accounting/sync/pull?entity=quotes&from=...`
- `POST /api/integrations/accounting/sync/push?entity=quotes&id=...`
- `GET /api/integrations/accounting/conflicts?entity=quotes`
- `POST /api/integrations/accounting/conflicts/:id/resolve`

### Presupuestos

- `GET /api/quotes`
- `POST /api/quotes`
- `GET /api/quotes/:id`
- `PATCH /api/quotes/:id`
- `POST /api/quotes/:id/send`
- `POST /api/quotes/:id/accept`
- `POST /api/quotes/:id/reject`
- `POST /api/quotes/:id/convert-to-invoice`

## Checklist final de copy

- [x] Landing: sin marcas de integración contable.
- [x] `/planes`: sin marcas, con diferenciación BÁSICO/PYME vs Empresa/PRO.
- [x] `/producto/integraciones`: copy neutro vía API.
- [ ] App cliente: eliminar etiquetas visibles de proveedor concreto en todo texto residual.
- [ ] Emails/plantillas: eliminar referencias de proveedor concreto.

## Notas de implementación

- Usar naming técnico genérico (`accounting_api`) en rutas, provider y documentación.
- Si existe naming legacy, planificar migración para eliminar deuda semántica en la siguiente iteración.
