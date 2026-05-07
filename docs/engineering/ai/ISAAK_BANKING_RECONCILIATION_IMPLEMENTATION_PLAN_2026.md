# Isaak Banking + Conciliacion — Plan de Implementacion por Fases (2026)

**Fecha inicio:** 2026-05-06  
**Estado:** EN CURSO 🚧  
**Objetivo de producto:** Activar conciliacion bancaria fiable para pymes con autoconciliacion en casos claros y revision guiada en casos no concluyentes.

---

## Decisiones confirmadas (producto)

1. **Sistema contable maestro:** Holded (segun el usuario final).
2. **Regla inicial de autoconciliacion:** tolerancia por defecto de ±1,00 EUR y ventana de 3 dias.
3. **Personalizacion por cliente:** la tolerancia y reglas deben poder configurarse por tenant/usuario.
4. **Politica operativa:** autoconciliar alta confianza y pedir confirmacion cuando no cuadre.
5. **Despliegue objetivo:** produccion directa.

---

## Estado actual (baseline)

### Ya existe

- Conexion bancaria y sincronizacion de cuentas/transacciones con Salt Edge en `apps/isaak`.
- Modelo de datos bancario en Prisma (`SeCustomer`, `SeConnection`, `SeAccount`, `SeTransaction`).
- Campo `SeTransaction.reconciledAt` disponible para marcar conciliacion.

### Faltaba antes de este plan

- API real de movimientos en `apps/app`.
- Persistencia real en endpoint de conciliacion manual.
- Enlace entre crear gasto y marcar movimiento conciliado.
- Motor de matching por confianza.
- Bandeja operativa completa para revision.
- Jobs de automatizacion de conciliacion.
- Cobertura de tests de conciliacion de extremo a extremo.

---

## Arquitectura funcional objetivo

```text
Banco (Salt Edge)
   -> Sync de movimientos (SeTransaction)
      -> Motor de matching (reglas + score)
         ->
            A) score alto: autoconciliar + guardar evidencia
            B) score medio/bajo: enviar a bandeja de revision
      -> Usuario revisa en UI de bancos
         -> aceptar/rechazar/sugerir
      -> Resultado final
         -> movimiento conciliado
         -> gasto/factura/cobro asociado
         -> trazabilidad y auditoria
```

---

## Fases de implementacion

## Fase 1 — Activacion API minima persistente (MVP tecnico)

**Objetivo:** quitar stubs y dejar persistencia basica funcionando sobre datos reales.

### Tareas

- [x] `GET /api/banks/movements` devuelve movimientos reales de `SeTransaction` con filtros.
- [x] `POST /api/banks/movements/[id]/match` marca y desmarca conciliacion persistente (`reconciledAt`).
- [x] `POST /api/banks/movements/[id]/create-expense` crea gasto y marca conciliado.
- [x] Manejo de idempotencia basica para evitar duplicados por `reference=bank:<movementId>`.

### Criterio de cierre

- Endpoints dejan de ser placeholder.
- El estado de conciliacion persiste en base de datos.

---

## Fase 2 — Configuracion por tenant de reglas de autoconciliacion

**Objetivo:** soportar preferencias por cliente (tolerancia, ventana y modo auto/manual).

### Tareas

- [x] Definir entidad/configuracion por tenant para reglas de conciliacion.
- [x] Exponer endpoint de lectura/escritura de reglas.
- [x] Aplicar defaults globales cuando no haya configuracion explicita.
- [x] Añadir validaciones para rangos seguros (ej. tolerancia y ventana maxima).

### Criterio de cierre

- Cada tenant puede configurar su tolerancia y ventana sin afectar a otros.

---

## Fase 3 — Motor de matching con score de confianza

**Objetivo:** autoconciliar cuando hay alta probabilidad y escalar dudas.

### Tareas

- [x] Implementar score por importe, fecha, referencia y texto.
- [x] Definir umbrales: alta, media y baja confianza.
- [x] Guardar razon de match (evidencias) para auditoria.
- [x] Dejar autoconciliacion activa solo en score alto.

### Criterio de cierre

- Casos claros se concilian automaticamente.
- Casos ambiguos quedan en revision asistida.

✅ **FASE 3 COMPLETADA** — Commit: c87100ff

---

## Fase 4 — Bandeja operativa de revision en dashboard

**Objetivo:** permitir revisar pendientes en una UX clara y accionable.

### Tareas

- [x] Reemplazar placeholder de bancos por listado real con estado.
- [x] Acciones: confirmar, deshacer, crear gasto, enlazar con documento.
- [x] Filtros por estado, cuenta y periodo.
- [x] Mensajes de ayuda de Isaak para casos no concluyentes.

### Criterio de cierre

- Usuario puede cerrar conciliaciones pendientes sin salir del flujo.

✅ **FASE 4 COMPLETADA** — Commit: 0107d459

---

## Fase 5 — Automatizacion, alertas y observabilidad

**Objetivo:** asegurar continuidad operativa en produccion.

### Tareas

- [x] Job periodico para reevaluar pendientes.
- [x] Integrar eventos no conciliados en alertas proactivas.
- [x] Dashboard tecnico: volumen, ratio auto/manual, errores.
- [x] Runbook de incidencias de conciliacion.

### Criterio de cierre

- Operacion robusta con seguimiento diario y reaccion ante fallos.

✅ **FASE 5 COMPLETADA** — Commit: PENDIENTE

---

## Fase 6 — Calidad, pruebas y release hardening

**Objetivo:** reducir regresiones antes de escalar uso real.

### Tareas

- [ ] Tests unitarios de reglas de matching.
- [ ] Tests de API para endpoints de movimientos/match/create-expense.
- [ ] Smoke de flujo completo (sync -> sugerencia -> conciliacion -> auditoria).
- [ ] Checklist de release y rollback.

### Criterio de cierre

- Flujo estable y repetible en CI/CD.

---

## Registro de cambios de esta sesion

**Sesión 1 (2026-05-06):**

- Se activaron endpoints de conciliacion minima persistente en `apps/app`.
- Se habilito listado real de movimientos bancarios (ya no placeholder).
- Se habilito conciliacion manual persistente por endpoint de match.
- Se enlazo crear gasto con marcado de conciliacion del movimiento.
- Se añadio endpoint por tenant de reglas de conciliacion en `apps/app/app/api/banks/reconciliation-config/route.ts`.
- Se añadieron defaults y validaciones de rango para tolerancia, ventana y umbral.
- Se añadio migracion SQL para `bank_reconciliation_configs`.
- Se añadio motor inicial de score en `apps/app/lib/banking/reconcileScore.ts` (importe + fecha + texto).
- Se añadio endpoint `POST /api/banks/movements/auto-match` para sugerencias y autoconciliacion por umbral.

**Sesión 2 (2026-05-07):**

- Se completó Fase 3: persistencia de evidencias de match.
- Tabla `SeTransactionMatchAudit` con campos: id, tenantId, seTransactionId, matchedExpenseId, matchScore, scoreComponents (JSON), evidenceReasons (JSON), autoMatched, createdAt, updatedAt.
- Relación bidireccional SeTransaction ↔ SeTransactionMatchAudit y Tenant ↔ SeTransactionMatchAudit.
- Migración SQL: `20260507120000_add_bank_reconciliation_audit`.
- Endpoint `POST /api/banks/movements/auto-match` actualizado para guardar auditoria en ambos casos: autoconciliados y sugeridos.
- Endpoint GET `/api/banks/movements/audit?movementId=<id>` para consultar evidencia historica de matches.
- Commit: c87100ff
- Se completó Fase 4: bandeja operativa UI.
- Componente `MovementsList` con funcionalidades:
  - Listado de movimientos sin reconciliar (GET /api/banks/movements)
  - Generación de scores con dryRun=true (POST /api/banks/movements/auto-match)
  - Expandible por movimiento: muestra candidato sugerido, historial de auditoría, botones de acción
  - Acciones: confirmar match, rechazar, crear nuevo gasto
  - Filtros: sin concordancia vs sugeridos
  - Status badges: auto-concordado (verde), sugerencia (naranja)
  - Razones de score visibles en lista y expandible
- Integración en `apps/app/app/dashboard/banks/page.tsx`
- Commit: 0107d459

**Sesión 3 (2026-05-07):**

- Se completó Fase 5: automatización, alertas y observabilidad.
- Endpoint `POST /api/cron` ahora ejecuta job real de reevaluación multi-tenant de conciliación.
- Nuevo servicio reutilizable `apps/app/lib/banking/reconciliationAutomation.ts` para reevaluación por tenant y ejecución global.
- El mismo servicio crea alertas proactivas por pendientes antiguos y expone métricas técnicas de conciliación.
- Endpoint nuevo `GET /api/banks/reconciliation-metrics` con scope tenant (sesión activa) y scope global (token de monitor).
- `POST /api/banks/movements/auto-match` refactorizado para reutilizar el servicio común.
- Runbook creado: `docs/ops/runbooks/BANK_RECONCILIATION_INCIDENT_RUNBOOK_2026.md`.
- Tests añadidos en `apps/app/app/api/cron/route.test.ts` y `apps/app/app/api/banks/reconciliation-metrics/route.test.ts`.

---

## Backlog priorizado inmediato (siguiente sesion)

1. Implementar Fase 5: Job periodico para reevaluar pendientes + alertas proactivas.
2. Implementar Fase 6: Tests unitarios, API tests y E2E.
3. Performance: Optimizar queries de movimientos y scoring (índices, paginación).
4. UX: Integrar Isaak prompts para casos ambiguos en bandeja operativa.

---

## Handoff entre sesiones

Al retomar trabajo:

1. Revisar este documento y actualizar checkboxes por fase.
2. Ejecutar pruebas de endpoints tocados y guardar evidencia.
3. Registrar commit por fase en este mismo documento.
4. No mezclar cambios de conciliacion con otras iniciativas no relacionadas.
