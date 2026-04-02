# Isaak x Holded - Alcance de APIs de facturacion y contabilidad

## Objetivo

Este documento fija el alcance oficial de integracion con la API de Holded para `holded.verifactu.business` e `isaak.verifactu.business`.

No describe toda la API publica de Holded como catalogo general. Define que bloques queremos implementar en producto y como se priorizan para que Isaak pueda:

- leer contexto real del negocio
- responder con datos utiles
- ejecutar acciones operativas desde chat
- preparar automatizaciones futuras sin rehacer la integracion

## Referencias oficiales

- Help Holded para generar la API key:
  - `https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded`
- Referencia oficial de la API:
  - `https://developers.holded.com/reference/api-key-1`

## Estado actual

Hoy la integracion publica usa solo una parte de Holded:

- validacion de conexion y deteccion de modulos
- lectura de primera muestra de documentos
- lectura de contactos
- lectura de cuentas contables
- snapshot inicial para contexto de Isaak

Esto ya permite:

- comprobar que la API key funciona
- detectar una empresa conectada
- construir un primer resumen operativo
- responder primeras preguntas sobre ventas, facturas, clientes y cuentas

Todavia no estamos explotando todas las capacidades operativas de Holded.

## Principio de producto

Holded es la fuente de datos operativos inicial de Isaak, no el producto principal.

Por tanto, priorizamos primero los endpoints que dan valor inmediato al usuario:

1. documentos
2. pagos y tesoreria
3. contactos
4. productos
5. impuestos y contabilidad

Solo despues abrimos operaciones de escritura mas amplias.

## Alcance a implementar

### API de facturacion

#### Tesoreria

- listar cuentas de tesoreria
- crear cuenta de tesoreria
- obtener una cuenta concreta de tesoreria

Valor para Isaak:

- identificar cuentas disponibles
- entender saldos operativos y medios de cobro
- preparar futuras respuestas sobre liquidez y cobros

#### Contactos

- listar contactos
- crear contacto
- obtener contacto
- actualizar contacto
- eliminar contacto
- listar adjuntos de contacto
- obtener adjunto concreto

Valor para Isaak:

- responder sobre clientes y proveedores
- crear y mantener fichas desde chat
- consultar documentación adjunta sin salir del chat
- preparar envío de documentos y seguimiento comercial

#### Cuentas de gastos

- listar cuentas de gasto
- crear cuenta de gasto
- obtener cuenta de gasto
- actualizar cuenta de gasto
- eliminar cuenta de gasto

Valor para Isaak:

- clasificar gastos con mas precision
- ayudar a interpretar costes y cuentas asociadas

#### Series de numeracion

- obtener series por tipo
- crear serie
- actualizar serie
- eliminar serie

Valor para Isaak:

- preparar emision correcta de documentos
- entender series disponibles antes de crear facturas o presupuestos

#### Productos

- listar productos
- crear producto
- actualizar producto
- eliminar producto
- obtener compra de producto
- obtener imagen principal
- listar imágenes
- obtener imagen secundaria
- actualizar stock

Valor para Isaak:

- responder sobre catálogo, imágenes y stock
- preparar facturas y presupuestos con productos reales
- detectar referencias de negocio y rotación básica

#### Canales de venta

- listar canales de venta
- crear canal de venta
- obtener canal de venta
- actualizar canal de venta
- eliminar canal de venta

Valor para Isaak:

- contextualizar ventas por canal
- preparar analisis operativo por origen de ingresos

#### Almacenes

- listar almacenes
- crear almacen
- listar stock
- obtener almacen
- actualizar almacen
- eliminar almacen

Valor para Isaak:

- responder sobre inventario y stock por almacen
- preparar respuestas sobre disponibilidad y movimiento operativo

#### Pagos

- listar pagos
- crear pago
- obtener pago
- actualizar pago
- eliminar pago

Valor para Isaak:

- responder sobre cobros y pagos pendientes
- enlazar facturas con su estado de cobro
- habilitar uno de los casos de uso mas fuertes del producto

#### Impuestos

- obtener impuestos

Valor para Isaak:

- interpretar tipos impositivos disponibles
- ayudar a emitir documentos con contexto fiscal correcto

#### Documentos

- listar documentos
- crear documento
- obtener documento
- actualizar documento
- eliminar documento
- crear documento de nomina
- pagar documento
- enviar documento
- obtener PDF
- enviar todos los articulos
- envio por linea
- obtener unidades enviadas por articulo
- adjuntar archivo a documento
- actualizar tracking de un documento
- actualizar pipeline de un documento
- listar metodos de pago

Valor para Isaak:

- resumen de ventas, gastos y facturacion
- lectura de historico por ano o por rango explicito, como minimo ano actual y ano anterior
- creacion de facturas, presupuestos y otros documentos desde chat
- seguimiento de pendientes, envios y adjuntos
- descarga y envio de PDFs

#### Grupos de contacto

- listar grupos de contacto
- crear grupo
- obtener grupo
- actualizar grupo
- eliminar grupo

Valor para Isaak:

- segmentar clientes y proveedores
- preparar automatizaciones comerciales o de gestion

#### Remesas

- listar remesas
- obtener remesa

Valor para Isaak:

- responder sobre agrupaciones de cobro y gestion bancaria

#### Servicios

- listar servicios
- crear servicio
- obtener servicio
- actualizar servicio
- eliminar servicio

Valor para Isaak:

- preparar documentos y catalogos para empresas de servicios

### API contable

#### Libro diario

- listar asientos
- crear asiento

Valor para Isaak:

- responder sobre actividad contable real
- explicar movimientos y asientos recientes con lenguaje no tecnico

#### Plan de cuentas

- listar cuentas contables
- crear cuenta contable

Valor para Isaak:

- interpretar balances y estructura contable
- ayudar a clasificar operaciones y leer el negocio con mas precision

## Priorizacion recomendada

### Fase 1 - Lectura de valor inmediato

- documentos
- pagos
- contactos
- impuestos
- libro diario
- plan de cuentas

Objetivo:

- responder bien a ventas, cobros, gastos, pendientes y contexto fiscal basico

### Fase 2 - Creacion operativa desde chat

- crear documento
- crear contacto
- crear pago
- crear producto
- obtener PDF y enviar documento

Objetivo:

- pasar de asistente de consulta a asistente de accion

### Fase 3 - Gestion avanzada

- stock y almacenes
- canales de venta
- series de numeracion
- cuentas de gasto
- servicios
- remesas

Objetivo:

- dar soporte a operativa mas completa sin ensuciar el onboarding inicial

## Reglas de implementacion

- no exponer toda la API de Holded como menu tecnico al usuario
- agrupar capacidades por tareas de negocio, no por nombres de endpoint
- leer primero, escribir despues
- cada accion de escritura debe llevar confirmacion explicita
- mantener logs y auditoria por tenant y usuario
- usar siempre la conexion Holded compartida del `tenantId` activo

## Casos de uso visibles para Isaak

Con este alcance, Isaak deberia poder cubrir progresivamente preguntas como:

- cuanto he vendido este mes
- que facturas tengo pendientes
- que cobros me faltan
- que gastos recientes veo
- explicame este asiento
- crea una factura para este cliente
- genera un presupuesto
- ensename mis cuentas contables principales
- que impuestos aparecen en mis documentos

## Dependencias tecnicas

- conexion Holded compartida persistida en `external_connections`
- schema canónico en `packages/db/prisma/schema.prisma`
- endpoints compartidos en `packages/integrations/holded/`
- experiencia principal en `apps/isaak`
- onboarding y ayuda de conexion en `apps/holded`

## Fuera de alcance por ahora

- explotar toda la API de Holded desde el primer sprint
- replicar en UI cada seccion tecnica de Holded
- convertir Isaak en un clon del panel de Holded
- mezclar onboarding inicial con configuracion operativa avanzada

## Decision

La integracion con Holded se amplia, pero el producto visible sigue siendo Isaak.

La API de Holded se implementa como capa de datos y acciones operativas para:

- leer negocio real
- responder con contexto
- ejecutar tareas concretas

No como una duplicacion del ERP dentro del chat.
