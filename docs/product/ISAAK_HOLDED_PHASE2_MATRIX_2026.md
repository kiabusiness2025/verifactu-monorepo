# Isaak for Holded - Matriz de Fase 2 2026

## Objetivo

Este documento convierte la Fase 2 del conector directo ChatGPT con Holded en un plan ejecutable.

No define el producto `Isaak Universal`.

Define exactamente que escrituras estructuradas sobre Holded deberian activarse despues de la aprobacion de OpenAI, en que orden y con que gates.

## Gate obligatorio

Nada de esta Fase 2 debe activarse antes de cumplir los tres puntos siguientes:

- aprobacion de OpenAI de la version limitada actual
- smoke real del flujo publico vigente sin regresiones
- validacion de que el preset de review estrecho no se reabre por accidente

## Estado de preparacion al 2026-04-03

- `holded_phase2_accounting` ya existe en codigo como preset intermedio
- `openai_review_v2` sigue siendo el preset publico por defecto
- la visibilidad de `holded_create_accounting_account` y `holded_create_daily_ledger_entry` ya quedo cubierta por tests cuando el preset contable esta activo
- la ola 2.1 no esta activada todavia; faltan endurecimiento de writes, QA y smoke real
- la ultima validacion automatizada quedo bloqueada por una configuracion repo-level de Jest en `apps/api/jest.config.cjs`

## Principios de despliegue

- abrir por familias funcionales, no toda la escritura de una vez
- exigir confirmacion explicita en cualquier mutacion
- mantener lectura posterior de verificacion tras cada escritura
- acompañar cada ola con QA y smoke real sobre tenant de prueba
- registrar trazabilidad por tenant, usuario, tool y payload normalizado

## Estado base ya disponible en codigo

La base tecnica ya existe en el catalogo MCP actual, aunque no este activa en la surface estrecha de review.

Tools ya presentes en codigo y relevantes para Fase 2:

- `holded_create_accounting_account`
- `holded_create_daily_ledger_entry`
- `holded_create_document`
- `holded_update_document`
- `holded_send_document`
- `holded_get_document_pdf`
- `holded_update_document_tracking`
- `holded_update_document_pipeline`
- `holded_create_contact`
- `holded_update_contact`
- `holded_create_payment`
- `holded_update_payment`
- `holded_pay_document`
- `holded_create_treasury_account`
- `holded_update_treasury_account`
- `holded_create_expense_account`
- `holded_update_expense_account`
- `holded_create_numbering_series`
- `holded_update_numbering_series`
- `holded_create_product`
- `holded_update_product`
- `holded_update_product_stock`
- `holded_create_service`
- `holded_update_service`
- `holded_create_contact_group`
- `holded_update_contact_group`

## Olas recomendadas

### Ola 2.1 - Contabilidad estructurada

Objetivo:

- cubrir los dos casos mas claros y ya pactados para apertura post-aprobacion

Tools:

- `holded_create_accounting_account`
- `holded_create_daily_ledger_entry`

Scopes necesarios:

- `mcp.read`
- `holded.accounts.write`
- `holded.accounts.read` para lectura posterior de verificacion

Motivo de prioridad:

- encaja con el valor diferencial de Isaak
- la intención del usuario es muy clara
- evita empezar por acciones mas complejas de documentos y pipeline

Checklist de salida:

- schemas cerrados y sin campos ambiguos
- confirmacion explicita
- lectura posterior del plan contable o del libro diario
- smoke real con tenant de prueba
- prompt y copy publico revisados

### Ola 2.2 - Documentos y accion comercial estructurada

Objetivo:

- pasar de borrador estrecho a ciclo documental mas completo

Tools:

- `holded_create_document`
- `holded_update_document`
- `holded_send_document`
- `holded_get_document_pdf`
- `holded_update_document_tracking`
- `holded_update_document_pipeline`

Scopes necesarios:

- `mcp.read`
- `holded.documents.write`
- `holded.documents.read`

Riesgos a vigilar:

- payloads demasiado abiertos
- estados o pipelines mal explicados al usuario
- confusion entre borrador y documento definitivo

### Ola 2.3 - Contactos y cobros

Objetivo:

- cubrir mantenimiento de clientes/proveedores y pagos estructurados

Tools:

- `holded_create_contact`
- `holded_update_contact`
- `holded_create_payment`
- `holded_update_payment`
- `holded_pay_document`

Scopes necesarios:

- `mcp.read`
- `holded.contacts.write`
- `holded.contacts.read`
- `holded.payments.write`
- `holded.payments.read`

Riesgos a vigilar:

- errores de conciliacion por importes o fechas
- pagos duplicados
- necesidad de resumen claro despues de ejecutar la accion

### Ola 2.4 - Datos maestros operativos

Objetivo:

- ampliar configuracion estructurada sin abrir aun la parte mas delicada de logistica avanzada

Tools:

- `holded_create_treasury_account`
- `holded_update_treasury_account`
- `holded_create_expense_account`
- `holded_update_expense_account`
- `holded_create_numbering_series`
- `holded_update_numbering_series`
- `holded_create_service`
- `holded_update_service`
- `holded_create_contact_group`
- `holded_update_contact_group`

Scopes necesarios:

- `holded.treasury.write`
- `holded.expenses.write`
- `holded.numbering.write`
- `holded.services.write`
- `holded.contactgroups.write`

Notas operativas ya verificadas:

- tesoreria delete devuelve `405`, por lo que no debe priorizarse como apertura inicial
- expense accounts delete es archive-only, asi que la primera apertura debe centrarse en crear y actualizar
- numbering series create puede devolver id placeholder, por lo que hay que releer por nombre/tipo despues de crear

### Ola 2.5 - Operativa avanzada y logistica

Objetivo:

- activar capacidades mas delicadas solo cuando las anteriores sean estables

Tools:

- `holded_update_product_stock`
- `holded_create_product`
- `holded_update_product`
- `holded_create_warehouse`
- `holded_update_warehouse`
- `holded_create_sales_channel`
- `holded_update_sales_channel`
- `holded_ship_document_all_items`
- `holded_ship_document_by_lines`
- `holded_attach_document_file`

Scopes necesarios:

- `holded.products.write`
- `holded.warehouses.write`
- `holded.saleschannels.write`
- `holded.documents.write`

Riesgos a vigilar:

- stock con shape inestable
- acciones logisticas con impacto operativo alto
- adjuntos y multipart mas sensibles a errores de formato

## Lo que no deberia priorizarse al principio

- deletes en familias con semantica no estable
- mutaciones logisticas sin QA previo
- apertura simultanea de todas las familias write
- mezcla de esta Fase 2 con acceso web oficial o asesor universal

## Presets y activacion recomendada

En lugar de saltar de `openai_review_v2` a `full`, la activacion futura deberia pasar por presets intermedios o gates equivalentes.

Secuencia sugerida:

1. `openai_review_v2`
2. `holded_phase2_accounting`
3. `holded_phase2_documents`
4. `holded_phase2_contacts_payments`
5. `holded_phase2_master_data`
6. solo despues evaluar `full`

## Definition of Done por ola

Cada ola solo debe considerarse cerrada si cumple todo esto:

- tools visibles correctas
- scopes correctos
- schemas y descripciones revisados
- confirmacion explicita validada
- smoke real con tenant de prueba
- tests de regresion para scopes y catalogo
- documentacion publica y operativa actualizada

## Referencias

- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md`
- `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`
- `docs/product/ISAAK_HOLDED_PHASE2_BACKLOG_2026.md`
