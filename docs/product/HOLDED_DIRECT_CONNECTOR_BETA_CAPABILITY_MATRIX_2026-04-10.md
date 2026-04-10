# Holded Direct Connector - Beta Capability Matrix 2026-04-10

## Objetivo

Fijar una referencia operativa unica sobre lo que el conector Holded Beta expone hoy de forma publica en ChatGPT y lo que solo existe en el runtime interno detras de scopes adicionales.

Esta matriz describe el preset publico actual `openai_review_v2`.

No describe por si sola todo el catalogo interno soportado por `apps/app`.

## Regla de interpretacion

Separar siempre tres niveles:

- runtime soportado: familias y scopes que el backend sabe manejar
- beta publico: tools visibles por defecto en el conector revisado
- datos del tenant: que exista una tool no implica que la cuenta conectada tenga datos utiles en este momento

## Leyenda

- Lectura directa: existe tool publica especifica para esa area
- Lectura indirecta: no existe tool publica especifica, pero la informacion aparece por otra area publica del beta
- Escritura: existe accion publica de creacion o modificacion para esa area
- No expuesto: esta area no forma parte del beta publico actual
- Probado: verificado con llamada real o con validacion operativa ya confirmada en este flujo
- No probado: la tool publica existe, pero no se obtuvo aun una respuesta util con datos sustanciales

## Tools publicas del beta actual

El preset `openai_review_v2` expone hoy estas 11 tools:

- `holded_list_invoices`
- `holded_get_invoice`
- `holded_create_invoice_draft`
- `holded_list_contacts`
- `holded_get_contact`
- `holded_list_accounts`
- `holded_list_daily_ledger`
- `holded_list_bookings`
- `holded_list_projects`
- `holded_get_project`
- `holded_list_project_tasks`

## Matriz de capacidades

| Area                        | Lectura directa   | Lectura indirecta | Escritura                  | Estado de prueba       | Observacion                                                                                                                     |
| --------------------------- | ----------------- | ----------------- | -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Facturas                    | Si                | Si                | Si                         | Probado                | `holded_list_invoices`, `holded_get_invoice`, `holded_create_invoice_draft`                                                     |
| Contactos                   | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_contacts`, `holded_get_contact`                                                                                    |
| Cuentas contables           | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_accounts`                                                                                                          |
| Asientos contables / diario | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_daily_ledger`                                                                                                      |
| Gastos / purchase docs      | No                | Si                | No expuesto en este preset | Probado indirectamente | Aparecen en el diario como `purchase`, con referencias tipo `R0001`, `R0002` y cuentas de gasto                                 |
| Impuestos                   | No                | Si                | No expuesto en este preset | Probado indirectamente | Se ven por lineas de IVA y por cuentas fiscales como `472` y `477`                                                              |
| Bancos / treasury           | No                | Si                | No expuesto en este preset | Probado indirectamente | Se ven por cuentas bancarias y movimientos reflejados en el diario                                                              |
| Proyectos                   | Si                | -                 | No expuesto en este preset | Probado                | `holded_list_projects`, `holded_get_project`, `holded_list_project_tasks`; puede devolver vacio si el tenant no tiene proyectos |
| Tareas de proyecto          | Si                | -                 | No expuesto en este preset | No probado utilmente   | Depende de contar con un `projectId` visible                                                                                    |
| Bookings / agenda CRM       | Si                | -                 | No expuesto en este preset | No probado             | `holded_list_bookings` existe y forma parte del preset publico                                                                  |
| Productos / items           | No en este preset | No claro          | No expuesto en este preset | No expuesto            | El runtime interno soporta familia de productos, pero no forma parte del beta publico actual                                    |
| Usuarios                    | No                | No                | No expuesto                | No expuesto            | No existe familia MCP publica de usuarios en este conector                                                                      |
| Documentos adjuntos         | No en este preset | No                | No expuesto en este preset | No expuesto            | El runtime interno tiene familias adicionales para adjuntos, pero no forman parte del beta publico actual                       |
| Conciliacion bancaria       | No                | No claro          | No expuesto                | No expuesto            | No hay tool publica especifica para esta area                                                                                   |
| Presupuestos                | No                | No claro          | No expuesto                | No expuesto            | No hay tool publica especifica para esta area                                                                                   |
| Pedidos                     | No                | No claro          | No expuesto                | No expuesto            | No hay tool publica especifica para esta area                                                                                   |
| Albaranes                   | No                | No claro          | No expuesto                | No expuesto            | No hay tool publica especifica para esta area                                                                                   |

## Resumen operativo

- Capacidad fuerte actual del beta: facturacion, contactos, cuentas contables, diario, bookings y proyectos.
- Capacidad indirecta pero util: gastos, IVA y parte de tesoreria via diario y cuentas.
- Capacidad fuera del beta publico actual: inventario, usuarios, adjuntos, conciliacion y otros documentos comerciales fuera del flujo de factura.

## Nota importante sobre el runtime completo

El runtime interno de `apps/app` soporta mas familias Holded que el beta publico actual.

Eso no debe mezclarse con la revision publica del conector.

Si una familia existe en codigo pero no en esta matriz, interpretarla como capacidad interna o gated por scopes adicionales, no como capacidad publica hoy disponible por defecto en ChatGPT.
