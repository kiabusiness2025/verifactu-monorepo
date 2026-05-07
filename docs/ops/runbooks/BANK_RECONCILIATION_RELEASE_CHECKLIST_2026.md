# Checklist de release y rollback — Conciliacion bancaria (Fase 6)

## Objetivo

Validar de forma repetible el flujo completo antes de release y tener rollback operativo claro.

## Pre-release (obligatorio)

1. Tests unitarios y API en verde:
   - `reconcileScore.test.ts`
   - `api/banks/movements/*.test.ts`
   - `api/cron/route.test.ts`
   - `api/banks/reconciliation-metrics/route.test.ts`
2. Build de `apps/app` en verde.
3. Variables de entorno verificadas:
   - `CRON_SECRET`
   - `MONITOR_API_TOKEN`
   - `BANK_RECONCILIATION_CRON_LIMIT_PER_TENANT`
   - `BANK_RECONCILIATION_CRON_MAX_TENANTS`
   - `BANK_RECONCILIATION_ALERT_DAYS`
   - `BANK_RECONCILIATION_ALERT_MIN_UNMATCHED`

## Smoke funcional (release candidate)

1. Sync de movimientos disponible (`GET /api/banks/movements`).
2. Dry run de matching (`POST /api/banks/movements/auto-match` con `dryRun=true`).
3. Confirmacion manual (`POST /api/banks/movements/[id]/match`).
4. Creacion de gasto y conciliacion (`POST /api/banks/movements/[id]/create-expense`).
5. Auditoria visible (`GET /api/banks/movements/audit?movementId=...`).
6. Cron de reevaluacion responde ok (`POST /api/cron` con secret).
7. Metricas por tenant y global disponibles (`GET /api/banks/reconciliation-metrics`).

## Criterios de aceptación release

- No errores 5xx en endpoints de conciliacion durante smoke.
- Job cron sin errores por tenant en ejecucion manual inicial.
- Metricas coherentes: `totalAudits30d >= autoMatched30d`.

## Rollback rápido

### Nivel 1 (mitigacion sin deploy)

1. Bajar alcance de cron:
   - `BANK_RECONCILIATION_CRON_MAX_TENANTS=1`
2. Reducir agresividad:
   - subir `confidenceThreshold` por tenant
   - desactivar `autoMatchEnabled` por tenant

### Nivel 2 (operativo)

1. Parar llamadas automatizadas a `/api/cron`.
2. Mantener solo conciliacion manual asistida en dashboard.

### Nivel 3 (codigo)

1. Revertir commit de release de conciliacion.
2. Desplegar rollback y repetir smoke minimo:
   - lista movimientos
   - match manual
   - create-expense

## Evidencia recomendada

- Captura de respuesta de `/api/cron` (summary + errors).
- Captura de `/api/banks/reconciliation-metrics` (tenant y global).
- Registro de commit/tag desplegado.
