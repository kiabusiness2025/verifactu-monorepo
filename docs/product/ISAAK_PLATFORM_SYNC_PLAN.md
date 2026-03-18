# Isaak Platform Sync Plan

## Objetivo
Definir a `Isaak` como asistente único y orquestador de datos contables para:

- plataforma nativa `verifactu.business`
- contabilidad basada en Excel/AEAT en planes Básico y Pyme
- conectores externos como Holded y futuros ERPs

El principio clave es:

`Isaak es uno; las fuentes de datos y canales cambian según el tenant.`

## Confirmación de producto

### 1. Isaak es único
Isaak no debe fragmentarse en varios asistentes distintos.

Roles:

- soporte y guía del propio software
- asistente fiscal y contable
- capa de migración, validación y sincronización con programas externos

### 2. Verifactu es la capa nativa
`verifactu.business` es la plataforma donde vive Isaak y donde existe el modelo operativo nativo.

En planes Básico y Pyme:

- la fuente principal será `Verifactu + Excel + tablas AEAT`
- Isaak explicará, validará y mantendrá consistencia operativa

### 3. El dashboard del cliente es una capa resumida y accionable
El dashboard no debe intentar copiar Holded u otro ERP completo.

Debe mostrar:

- ventas
- gastos
- beneficio
- alertas
- próximos pasos
- explicaciones claras

Isaak convierte sistemas complejos en una capa de decisión de negocio.

## Modelo operativo objetivo

### Fuentes posibles

- `verifactu_native`
- `excel_aeat`
- `holded`
- `external_api`

### Entidades canónicas

- facturas
- presupuestos
- gastos
- clientes
- proveedores
- cuentas contables
- perfil fiscal

### Principio de ownership
Antes de sincronizar, hay que definir qué sistema manda para cada entidad.

Estados posibles:

- `native_master`
- `external_master`
- `shared_with_conflicts`

### Modos por tenant

#### 1. `native_excel`
Para Básico y Pyme.

- Verifactu es maestro
- Excel/AEAT alimenta y exporta
- Isaak valida, explica y ayuda a migrar desde hojas de cálculo

#### 2. `holded_augmented`
Para tenants con Holded conectado.

- Holded puede ser maestro de ciertas entidades
- Verifactu mantiene la vista ejecutiva, capa fiscal y flujos guiados
- Isaak traduce, valida y resuelve conflictos

#### 3. `external_augmented`
Igual que Holded, pero con otro ERP/API.

## Reglas por entidad

### Facturas

- Nativo Excel: `native_master`
- Holded/external: `shared_with_conflicts`
- Fase inicial: lectura + borradores + push controlado
- Fase posterior: bidireccional con `integration_maps` y conflictos

### Presupuestos

- Pueden ser una buena primera entidad bidireccional
- Ya existe base de `quotes`, `sync_outbox`, `integration_maps` y `sync_conflicts`

### Gastos

- Deben pasar por normalización canónica
- La fuente puede ser compartida
- Isaak valida categoría, impuesto y consistencia antes de sincronizar

### Clientes y proveedores

- Entidades compartidas con resolución de conflictos
- Isaak puede servir como puente de migración desde Excel

### Cuentas contables

- En conectores como Holded deben tratarse como `external_master`
- Verifactu no debe inventar un plan contable alternativo si ya existe uno externo
- Isaak sí debe explicarlo y simplificarlo

## Fases de implementación

### Fase 1. Base ya disponible

- conector Holded por API
- MCP remoto para ChatGPT
- tools internas de Isaak para Holded
- módulo `Isaak for Holded` en dashboard
- infraestructura de sync existente:
  - `tenant_integrations`
  - `integration_maps`
  - `sync_outbox`
  - `sync_conflicts`
  - `sync_logs`

### Fase 1.5. Expansión funcional de Holded

- ampliar el adapter de Holded más allá de `Invoice` y `Accounting`
- añadir soporte de lectura para:
  - `CRM`
  - `Projects`
  - `Team`
- mantener `Team` con tratamiento más sensible por contener datos laborales o de empleados

Orden recomendado de exposición en producto:

1. `CRM`
2. `Projects`
3. `Team`

Regla práctica:

- lectura y explicación primero
- escritura después
- datos sensibles de empleados solo con permisos más finos

### Fase 1.6. Conexion compartida y canales

- mantener una sola conexion Holded por tenant
- separar identidad del usuario de la credencial externa
- preparar dos modos de entrada:
  - `verifactu_first`
  - `holded_first`
- conservar la app interna actual de ChatGPT como entorno de validacion
- preparar la futura app publica `Isaak for Holded` sobre el mismo core

Entregables tecnicos:

- `docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md`
- `apps/app/lib/integrations/sharedConnections.ts`

Entregables operativos:

- `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`
- `docs/ops/runbooks/ISAAK_FOR_HOLDED_PUBLIC_DEPLOY.md`

### Fase 2. Modelo canónico y ownership

- fijar políticas por entidad
- asociar tenant a modo operativo
- decidir fuente maestra por entidad antes de activar bidireccionalidad real

Entregables técnicos:

- `apps/app/lib/integrations/canonicalModel.ts`
- `apps/app/lib/integrations/syncPolicy.ts`

### Fase 3. Plataforma nativa Excel/AEAT

- cargar tablas oficiales AEAT
- modelar importación/validación
- crear normalizadores a formato canónico
- diseñar asistente de migración desde Excel

Aquí necesitaré del usuario:

- Excels oficiales AEAT
- estructura de columnas esperadas
- ejemplos reales de importación

### Fase 4. Migración guiada con Isaak

- subida de Excel
- preview de validación
- mapeo de columnas
- detección de errores y sugerencias
- confirmación humana antes de persistir

### Fase 5. Sincronización Holded bidireccional real

Orden recomendado:

1. clientes/contactos
2. presupuestos
3. facturas
4. gastos

No activar todo a la vez.

### Fase 6. Isaak como orquestador completo

- explicar balances y métricas
- guiar cierres y plazos
- reconciliar diferencias entre Verifactu y ERP externo
- registrar conflictos y recomendar resolución

## Roadmap Holded por dominios

### Invoice API

- facturas
- contactos
- grupos de contacto
- borradores

### Accounting API

- cuentas contables
- lectura de saldos y estructura contable

### CRM API

- bookings
- relación comercial y agenda operativa

### Projects API

- proyectos
- tareas
- lectura de rentabilidad y seguimiento operativo

### Team API

- empleados
- partes/tiempos
- posible sensibilidad reforzada por datos laborales

## Qué necesitaremos del usuario

Todavía no hace falta para seguir con la arquitectura, pero sí lo necesitaremos para la siguiente fase:

- Excels oficiales AEAT
- skills/prompts operativos de Holded
- skills de migración Excel → Holded
- ejemplos reales de hojas y casos límite

## Decisiones técnicas ya tomadas

- Isaak es único
- el dashboard es una capa resumida y accionable, no una copia del ERP
- la bidireccionalidad se implementa por entidad y por fases
- Verifactu puede ser fuente nativa en Básico/Pyme
- Holded y futuros ERPs entran mediante adapters y políticas de ownership
