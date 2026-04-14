# Holded Direct Connector - Backfill Runbook 2026

## Objetivo

Preparar y ejecutar de forma controlada el backfill inicial de:

- `ConnectionRecipient`
- flags conservadores de gobernanza en `ExternalConnection`

sin romper el rollout incremental ni activar todavia restricciones duras no respaldadas por dato fiable.

## Script operativo

- `apps/app/scripts/backfill-holded-governance.mjs`

Comando disponible:

- `pnpm --filter verifactu-app backfill:holded-governance`

## Modo de uso

### Dry run

Por defecto el script no escribe.

Ejecuta:

```powershell
pnpm --filter verifactu-app backfill:holded-governance
```

Opciones:

```powershell
pnpm --filter verifactu-app backfill:holded-governance -- --tenant <tenant-id>
pnpm --filter verifactu-app backfill:holded-governance -- --limit 25
```

Salida esperada:

- `mode`
- `scanned`
- `seededRecipients`
- `updatedConnections`
- `sample`

### Apply real

Solo despues de revisar el `dry-run`.

```powershell
pnpm --filter verifactu-app backfill:holded-governance -- --apply
```

Opciones acotadas:

```powershell
pnpm --filter verifactu-app backfill:holded-governance -- --apply --tenant <tenant-id>
pnpm --filter verifactu-app backfill:holded-governance -- --apply --limit 25
```

## Regla de seguridad

- primero `dry-run`
- despues `--apply` sobre un tenant o lote pequeno
- revisar resultados
- solo entonces ejecutar sobre todo el dataset

## Logica aplicada por el script

### Recipients

Si una conexion Holded no tiene recipients activos, el script intenta sembrar uno con esta prioridad:

1. `company_notification_emails`
2. `tenant_profiles.email`
3. usuario conectador (`connected_by_user_id`)

Reglas:

- `company_notification_emails`
  - `recipientType = client_contact`
  - `isMandatory = true`
  - `isClientSide = true`
  - `isConfirmed = true`
- `tenant_profiles.email`
  - `recipientType = client_contact`
  - `isMandatory = true`
  - `isClientSide = true`
  - `isConfirmed = false`
- usuario conectador
  - `recipientType = user_primary` o `advisor_contact`
  - `isMandatory = true`
  - `isConfirmed = true`
  - `isClientSide` inferido desde `Membership.side` o `role`

### Flags de gobernanza

El script recalcula:

- `ownershipStatus`
- `managedByThirdParty`
- `clientAdminGap`
- `highGovernanceRisk`
- `underClaimReview`
- `technicalOperatorUserId`

Reglas iniciales:

- `managedByThirdParty = true` si ya lo estaba o si existen memberships activas del lado `advisor`
- `clientAdminGap = true` si no existe `company_admin` activo del lado `client`
- `highGovernanceRisk = true` si:
  - `managedByThirdParty = true`
  - `clientAdminGap = true`
  - no hay recipient cliente confirmado activo
- `underClaimReview = true` si hay claims abiertas
- `ownershipStatus` conserva el valor actual; si falta:
  - `third_party_managed` cuando hay tercero
  - `pending_confirmation` en otro caso

## Requisitos previos

- migraciones `20260411100000` a `20260411104000` ya aplicadas
- `DATABASE_URL` disponible
- tabla `external_connections` existente
- tabla `connection_recipients` existente
- tabla `memberships` existente
- tabla `claim_cases` existente

La tabla `company_notification_emails` es opcional. Si no existe, el script sigue con `tenant_profiles.email` y el usuario conectador.

## Validacion posterior recomendada

Revisar al menos:

- conexiones Holded sin recipients activos
- conexiones con `managed_by_third_party = true`
- conexiones con `client_admin_gap = true`
- conexiones con `high_governance_risk = true`
- conexiones con `under_claim_review = true`

## No hace este script

- no activa restricciones duras
- no elimina duplicados historicos
- no resuelve memberships ambiguas
- no envia notificaciones
- no sustituye todavia las rutas publicas de onboarding para claims o access requests

## Siguiente fase despues del backfill

- revisar resultado real
- endurecer reglas en runtime
- preparar `GUARDS-1`
- despues conectar frontend/panel con estados y bloqueos ya fiables
