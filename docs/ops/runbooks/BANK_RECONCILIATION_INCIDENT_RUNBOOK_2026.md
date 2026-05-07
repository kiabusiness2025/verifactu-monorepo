# Runbook de incidencias — Conciliacion bancaria (2026)

## Objetivo

Disponer de un procedimiento rapido para detectar y resolver incidencias en la conciliacion bancaria automatizada.

## Alcance

- Job periodico de reevaluacion de pendientes (`POST /api/cron`).
- Motor de matching (`POST /api/banks/movements/auto-match`).
- Alertas proactivas de pendientes (`isaak_alerts`, tipo `bank_reconciliation_unmatched`).
- Metricas tecnicas (`GET /api/banks/reconciliation-metrics`).

## Señales de alerta

- Aumento sostenido de `staleUnreconciled7d`.
- Aumento de `unreconciledWithoutAudit`.
- `autoMatchRatio` cae por debajo de 0.40 durante varios dias.
- Errores recurrentes en respuesta de `/api/cron`.

## Checklist de diagnostico (10-15 min)

1. Ejecutar metricas globales con token de monitor.
2. Confirmar que el job cron responde `ok: true` y revisar `errors` por tenant.
3. Identificar tenants con mayor volumen en `tenantResults`.
4. Revisar en tenant afectado:
   - `GET /api/banks/reconciliation-metrics`
   - `GET /api/banks/movements?status=unmatched&limit=100`
5. Validar si hay alertas recientes `bank_reconciliation_unmatched`.

## Acciones de mitigacion

### Caso A: cron no autorizado o no ejecuta

- Verificar `CRON_SECRET` en entorno.
- Reintentar job manual con `Authorization: Bearer <CRON_SECRET>`.
- Revisar despliegue y variables:
  - `BANK_RECONCILIATION_CRON_LIMIT_PER_TENANT`
  - `BANK_RECONCILIATION_CRON_MAX_TENANTS`

### Caso B: backlog de pendientes crece

- Ejecutar manualmente `/api/cron` para forzar reevaluacion.
- Aumentar temporalmente `BANK_RECONCILIATION_CRON_LIMIT_PER_TENANT`.
- Revisar configuracion por tenant en `/api/banks/reconciliation-config`:
  - tolerancia (`amountToleranceEur`)
  - ventana (`dateWindowDays`)
  - umbral (`confidenceThreshold`)

### Caso C: ratio auto-match bajo

- Revisar muestras de auditoria (`/api/banks/movements/audit?movementId=...`).
- Detectar patrones de texto importados con baja similitud.
- Ajustar reglas del tenant (tolerancia y ventana) con validacion controlada.

### Caso D: alertas excesivas

- Confirmar si el backlog supera umbral real.
- Ajustar temporalmente:
  - `BANK_RECONCILIATION_ALERT_DAYS`
  - `BANK_RECONCILIATION_ALERT_MIN_UNMATCHED`

## Verificacion posterior

- `GET /api/banks/reconciliation-metrics` debe reflejar:
  - descenso de `staleUnreconciled7d`
  - descenso de `unreconciledWithoutAudit`
  - estabilizacion de `autoMatchRatio`
- Registrar incidente y causa raiz en documento de operaciones.

## Rollback funcional

Si la autoconciliacion produce comportamiento inesperado:

1. Reducir alcance del cron (`BANK_RECONCILIATION_CRON_MAX_TENANTS=1`) temporalmente.
2. Desactivar auto-match por tenant en `bank_reconciliation_configs` (`autoMatchEnabled=false`).
3. Mantener sugerencias activas y continuar conciliacion manual asistida.

## Referencias

- Plan de implementacion: `docs/engineering/ai/ISAAK_BANKING_RECONCILIATION_IMPLEMENTATION_PLAN_2026.md`
- Endpoint cron: `apps/app/app/api/cron/route.ts`
- Metricas: `apps/app/app/api/banks/reconciliation-metrics/route.ts`
- Motor de automatizacion: `apps/app/lib/banking/reconciliationAutomation.ts`
