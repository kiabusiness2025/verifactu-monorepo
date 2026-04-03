# Isaak for Holded - Backlog ejecutable de Fase 2 2026

## Objetivo

Traducir la matriz de Fase 2 del conector directo ChatGPT con Holded en tareas tecnicas concretas, listas para que Codex o cualquier implementador pueda ejecutarlas sin reinterpretar el alcance.

## Regla marco

Este backlog no se ejecuta antes de la aprobacion de OpenAI de la version limitada actual de `Isaak for Holded`, salvo preparacion documental o tecnica que no cambie la surface publica en review.

## Estado de preparacion al 2026-04-03

Ya ha quedado hecha una primera preparacion tecnica no publica para la ola 2.1, sin cambiar el default actual de review.

Completado ya en codigo:

- H2A-001: creado el preset `holded_phase2_accounting`
- H2A-002: permitido el preset `holded_phase2_accounting` en OAuth/MCP
- H2A-003: cubierta por test la visibilidad de `holded_create_accounting_account` y `holded_create_daily_ledger_entry` cuando ese preset esta activo

Se mantiene sin cambios:

- `openai_review_v2` sigue siendo el preset publico por defecto
- no se ha activado la ola contable en produccion ni en la surface publica de review

Pendiente para la siguiente sesion:

- H2A-004
- H2A-005
- H2A-006

Estado de validacion actual:

- sin errores estaticos en los archivos editados
- Jest focalizado bloqueado por validacion de configuracion repo-level en `apps/api/jest.config.cjs`

## Archivos base ya identificados

Archivos existentes que muy probablemente participaran en la implementacion:

- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `apps/app/lib/integrations/holdedMcpScopes.test.ts`
- `apps/app/lib/oauth/mcp.ts`
- `apps/app/lib/oauth/mcp.test.ts`
- `apps/app/app/api/mcp/holded/route.ts`
- `apps/app/app/api/mcp/holded/route.test.ts`
- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/holdedMcpTools.test.ts`
- `apps/app/lib/integrations/accounting.ts`
- `apps/app/lib/integrations/accounting.test.ts`

## Ola 2.1 - Contabilidad estructurada

### H2A-001 - Crear preset `holded_phase2_accounting`

Objetivo:

- abrir solo la primera ola contable sin saltar directamente a `full`

Tareas:

- ampliar `HoldedMcpScopePreset`
- definir el set de scopes `holded_phase2_accounting`
- mantener `openai_review_v2` sin cambios
- cubrir el nuevo preset con tests de scopes

Archivos a tocar:

- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `apps/app/lib/integrations/holdedMcpScopes.test.ts`

Definition of Done:

- el nuevo preset existe y queda cubierto por test
- no altera el catalogo visible de `openai_review_v2`

### H2A-002 - Permitir resolver el preset contable desde OAuth/MCP

Objetivo:

- hacer que el sistema pueda usar el preset post-aprobacion sin romper el flujo actual

Tareas:

- extender validacion de `MCP_PUBLIC_SCOPE_PRESET`
- añadir tests de preset permitido
- verificar que la metadata publica sigue siendo correcta

Archivos a tocar:

- `apps/app/lib/oauth/mcp.ts`
- `apps/app/lib/oauth/mcp.test.ts`

Definition of Done:

- `MCP_PUBLIC_SCOPE_PRESET=holded_phase2_accounting` es valido
- el preset estrecho sigue siendo el default si no se configura otra cosa

### H2A-003 - Exponer tools contables write en `tools/list` solo cuando corresponda

Objetivo:

- que el catalogo visible refleje exactamente la ola activada

Tareas:

- validar visibilidad de `holded_create_accounting_account`
- validar visibilidad de `holded_create_daily_ledger_entry`
- asegurar que las pruebas de `tools/list` cubren el nuevo preset

Archivos a tocar:

- `apps/app/app/api/mcp/holded/route.ts`
- `apps/app/app/api/mcp/holded/route.test.ts`

Definition of Done:

- `tools/list` muestra solo las tools contables nuevas cuando el preset contable esta activo
- `openai_review_v2` no cambia

### H2A-004 - Endurecer `holded_create_accounting_account`

Objetivo:

- convertir la tool en una accion segura y publicamente entendible

Tareas:

- revisar schema y descripcion publica
- exigir confirmacion explicita si todavia no existe
- asegurar lectura posterior o resumen verificable de lo creado
- mejorar mensajes de error orientados a usuario/soporte

Archivos a tocar:

- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/holdedMcpTools.test.ts`
- `apps/app/lib/integrations/accounting.ts`
- `apps/app/lib/integrations/accounting.test.ts`

Definition of Done:

- schema cerrado
- confirmacion explicita validada por test
- resumen posterior de la cuenta creada

### H2A-005 - Endurecer `holded_create_daily_ledger_entry`

Objetivo:

- abrir la creacion de asientos con trazabilidad y minimo riesgo

Tareas:

- revisar schema y payload minimo
- exigir confirmacion explicita
- asegurar lectura/resumen posterior
- mejorar errores del adapter si Holded devuelve rechazo

Archivos a tocar:

- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/holdedMcpTools.test.ts`
- `apps/app/lib/integrations/accounting.ts`
- `apps/app/lib/integrations/accounting.test.ts`

Definition of Done:

- schema cerrado
- confirmacion explicita validada por test
- resumen posterior del asiento creado

### H2A-006 - QA y smoke de la ola contable

Objetivo:

- cerrar la ola 2.1 con evidencia real

Tareas:

- smoke manual con tenant de prueba
- verificar que list/read siguen funcionando despues de crear
- actualizar docs operativas y de review interna

Archivos a tocar:

- `docs/product/ISAAK_HOLDED_PHASE2_MATRIX_2026.md`
- `docs/product/ISAAK_FOR_HOLDED_STATUS_2026-04-01.md`
- `apps/holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md`

Definition of Done:

- smoke real documentado
- documentacion actualizada

## Ola 2.2 - Documentos y accion comercial estructurada

### H2D-001 - Crear preset `holded_phase2_documents`

Incluye como minimo:

- `holded.documents.read`
- `holded.documents.write`

Archivos a tocar:

- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `apps/app/lib/integrations/holdedMcpScopes.test.ts`
- `apps/app/lib/oauth/mcp.ts`
- `apps/app/lib/oauth/mcp.test.ts`

### H2D-002 - Endurecer tools de documentos

Tools foco:

- `holded_create_document`
- `holded_update_document`
- `holded_send_document`
- `holded_get_document_pdf`
- `holded_update_document_tracking`
- `holded_update_document_pipeline`

Archivos a tocar:

- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/holdedMcpTools.test.ts`

Definition of Done:

- payloads y descripciones coherentes
- confirmacion explicita en acciones mutativas
- smoke real por familia

## Ola 2.3 - Contactos y cobros

### H2C-001 - Crear preset `holded_phase2_contacts_payments`

Incluye como minimo:

- `holded.contacts.read`
- `holded.contacts.write`
- `holded.payments.read`
- `holded.payments.write`

### H2C-002 - Endurecer mantenimiento de contactos y pagos

Tools foco:

- `holded_create_contact`
- `holded_update_contact`
- `holded_create_payment`
- `holded_update_payment`
- `holded_pay_document`

Archivos a tocar:

- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/holdedMcpTools.test.ts`
- `apps/app/lib/integrations/accounting.ts`
- `apps/app/lib/integrations/accounting.test.ts`

Definition of Done:

- no hay ambiguedad de importes, fechas o destinatario
- la respuesta final resume claramente la accion ejecutada

## Ola 2.4 - Datos maestros operativos

### H2M-001 - Crear preset `holded_phase2_master_data`

Scopes esperados:

- `holded.treasury.write`
- `holded.expenses.write`
- `holded.numbering.write`
- `holded.services.write`
- `holded.contactgroups.write`

### H2M-002 - Endurecer familias maestras

Tools foco:

- tesoreria
- cuentas de gasto
- series de numeracion
- servicios
- grupos de contacto

Notas ya verificadas que no deben olvidarse:

- tesoreria delete no es buen primer candidato
- expense delete es archive-only
- numbering series requiere relectura tras crear

## Ola 2.5 - Operativa avanzada y logistica

### H2L-001 - Abrir solo cuando las olas previas sean estables

Families:

- productos y stock
- almacenes
- canales de venta
- shipping y adjuntos de documentos

Regla:

- esta ola no debe arrancar mientras haya deuda o inestabilidad en contabilidad, documentos o pagos

## Checklist rapido para Codex antes de implementar una task

- que preset o gate habilita la ola
- que tools exactas entran
- que scopes exactos se necesitan
- que tests deben tocarse
- que smoke real cierra la task
- que docs deben actualizarse

## Referencias

- `docs/product/ISAAK_HOLDED_PHASE2_MATRIX_2026.md`
- `docs/product/ISAAK_POST_APPROVAL_WEEK1_PLAN_2026.md`
- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `apps/app/lib/integrations/holdedMcpTools.ts`
