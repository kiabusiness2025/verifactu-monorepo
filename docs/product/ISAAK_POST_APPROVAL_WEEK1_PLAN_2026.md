# Isaak - Plan de la primera semana tras aprobacion OpenAI 2026

## Objetivo

Este documento fija el orden exacto de trabajo para la primera semana despues de que OpenAI apruebe la version limitada actual de `Isaak for Holded`.

Su funcion es evitar dudas sobre que se ejecuta primero, que no debe tocarse y que puede avanzar en paralelo.

## Regla marco

La semana 1 post-aprobacion no es el momento de abrir todo a la vez.

Se ejecutan dos carriles, con prioridad distinta:

1. `Isaak for Holded` Fase 2, empezando solo por la ola contable
2. `Isaak Universal`, arrancando solo Sprint 0 y preparacion de Sprint 1

## Lo que no se hace en semana 1

- no saltar directamente a `full`
- no abrir documentos, contactos, pagos y logistica a la vez
- no arrancar aun crawling amplio o web abierta no controlada
- no mezclar el producto universal con el conector Holded ya aprobado

## Precondiciones del dia 0

Antes de tocar codigo:

- confirmar aprobacion real de OpenAI
- dejar evidencia de la version aprobada y el preset activo
- validar que el flujo publico vigente sigue sano en produccion
- abrir rama o worktree especifico para Fase 2 Holded
- abrir rama o worktree separado para `Isaak Universal` si se trabaja en paralelo

## Semana 1 - orden exacto recomendado

Nota de estado al 2026-04-03:

- como preparacion tecnica no publica ya quedaron adelantados H2A-001, H2A-002 y H2A-003
- ese adelanto no cambio el preset publico por defecto y no activa todavia la ola contable
- al retomar, la prioridad real pasa a ser validar el scaffold, cerrar H2A-004 y H2A-005, y despues ejecutar H2A-006

### Dia 1 - Blindar el arranque contable de Holded

Orden:

1. H2A-001 - crear preset `holded_phase2_accounting`
2. H2A-002 - permitir resolver el preset desde OAuth/MCP

Resultado esperado al final del dia:

- el sistema entiende el nuevo preset
- `openai_review_v2` no cambia
- aun no se ha ampliado la surface visible por defecto

## Dia 2 - Controlar visibilidad y catalogo

Orden:

1. H2A-003 - exponer tools contables write en `tools/list` solo cuando corresponda
2. revisar tests de catalogo, scopes y metadata MCP

Resultado esperado al final del dia:

- la visibilidad depende del preset correcto
- el catalogo de review aprobado sigue intacto

## Dia 3 - Endurecer escritura de cuentas contables

Orden:

1. H2A-004 - endurecer `holded_create_accounting_account`

Checklist del dia:

- schema cerrado
- confirmacion explicita
- mensajes de error utiles
- resumen posterior de lectura o verificacion

## Dia 4 - Endurecer escritura de asientos

Orden:

1. H2A-005 - endurecer `holded_create_daily_ledger_entry`

Checklist del dia:

- schema cerrado
- confirmacion explicita
- errores del adapter mejorados si hace falta
- lectura posterior o resumen verificable

## Dia 5 - QA, smoke y cierre de ola 2.1

Orden:

1. H2A-006 - smoke manual con tenant de prueba
2. verificar lectura despues de cada escritura
3. actualizar docs de estado y setup operativo

Resultado esperado al final del dia:

- ola 2.1 lista o casi lista para despliegue controlado

## Carril paralelo permitido para `Isaak Universal`

Si hay capacidad paralela, en esta misma semana solo deberian avanzar estas tasks:

- U0-001 - cerrar contrato operativo de separacion
- U0-002 - preparar inventario de fuentes oficiales
- U1-001 - definir superficie publica separada

No deberian arrancar todavia en semana 1:

- crawling amplio
- integracion de web oficial en runtime productivo
- lanzamiento comercial

## Orden exacto para Codex si hay un solo implementador

Si solo trabaja un agente o una persona, el orden recomendado es este:

1. H2A-001
2. H2A-002
3. H2A-003
4. H2A-004
5. H2A-005
6. H2A-006
7. U0-001
8. U0-002
9. U1-001

## Orden recomendado si trabajan dos agentes en paralelo

Agente A:

1. H2A-001
2. H2A-002
3. H2A-003
4. H2A-004
5. H2A-005
6. H2A-006

Agente B:

1. U0-001
2. U0-002
3. U1-001

## Gate de salida de la semana 1

La semana solo se considera bien cerrada si se cumple todo esto:

- no hay regresion del flujo aprobado por OpenAI
- el preset estrecho sigue siendo trazable y recuperable
- la ola contable de Holded tiene evidencia de QA y smoke
- `Isaak Universal` queda mejor definido, pero sin contaminar el conector Holded

## Referencias

- `docs/product/ISAAK_HOLDED_PHASE2_BACKLOG_2026.md`
- `docs/product/ISAAK_HOLDED_PHASE2_MATRIX_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TICKETS_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_SPRINT_PLAN_2026.md`
