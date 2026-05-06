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
- [ ] Guardar razon de match (evidencias) para auditoria.
- [ ] Dejar autoconciliacion activa solo en score alto.

### Criterio de cierre

- Casos claros se concilian automaticamente.
- Casos ambiguos quedan en revision asistida.

---

## Fase 4 — Bandeja operativa de revision en dashboard

**Objetivo:** permitir revisar pendientes en una UX clara y accionable.

### Tareas

- [ ] Reemplazar placeholder de bancos por listado real con estado.
- [ ] Acciones: confirmar, deshacer, crear gasto, enlazar con documento.
- [ ] Filtros por estado, cuenta y periodo.
- [ ] Mensajes de ayuda de Isaak para casos no concluyentes.

### Criterio de cierre

- Usuario puede cerrar conciliaciones pendientes sin salir del flujo.

---

## Fase 5 — Automatizacion, alertas y observabilidad

**Objetivo:** asegurar continuidad operativa en produccion.

### Tareas

- [ ] Job periodico para reevaluar pendientes.
- [ ] Integrar eventos no conciliados en alertas proactivas.
- [ ] Dashboard tecnico: volumen, ratio auto/manual, errores.
- [ ] Runbook de incidencias de conciliacion.

### Criterio de cierre

- Operacion robusta con seguimiento diario y reaccion ante fallos.

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

- Se activaron endpoints de conciliacion minima persistente en `apps/app`.
- Se habilito listado real de movimientos bancarios (ya no placeholder).
- Se habilito conciliacion manual persistente por endpoint de match.
- Se enlazo crear gasto con marcado de conciliacion del movimiento.
- Se añadio endpoint por tenant de reglas de conciliacion en `apps/app/app/api/banks/reconciliation-config/route.ts`.
- Se añadieron defaults y validaciones de rango para tolerancia, ventana y umbral.
- Se añadio migracion SQL para `bank_reconciliation_configs`.
- Se añadio motor inicial de score en `apps/app/lib/banking/reconcileScore.ts` (importe + fecha + texto).
- Se añadio endpoint `POST /api/banks/movements/auto-match` para sugerencias y autoconciliacion por umbral.

---

## Backlog priorizado inmediato (siguiente sesion)

1. Diseñar y migrar configuracion por tenant de reglas de autoconciliacion.
2. Implementar motor de score minimo (importe + fecha + texto).
3. Exponer primera bandeja operativa en dashboard bancos.
4. Añadir tests de endpoints de conciliacion.

---

## Handoff entre sesiones

Al retomar trabajo:

1. Revisar este documento y actualizar checkboxes por fase.
2. Ejecutar pruebas de endpoints tocados y guardar evidencia.
3. Registrar commit por fase en este mismo documento.
4. No mezclar cambios de conciliacion con otras iniciativas no relacionadas.
