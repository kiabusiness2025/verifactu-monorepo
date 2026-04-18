# Holded Direct Connector - Endpoint And Contracts Map 2026

## Objetivo

Fijar los contratos compartidos y mapear endpoint por endpoint sobre los archivos reales del repo antes de empezar implementacion.

Este documento parte de:

- las rutas publicas existentes en `apps/holded`
- las rutas privadas existentes en `apps/app`
- el store actual `accountingStore`
- el resolver actual `holdedConnectionResolver`
- el archivo compartido de contratos en `packages/integrations/holded/contracts.ts`

## Archivo canonico de contratos

Se fija como archivo compartido:

- `packages/integrations/holded/contracts.ts`

Responsabilidad de ese archivo:

- enums de dominio expuestos al frontend
- DTOs compartidos
- contratos request/response minimos para rutas publicas y privadas

No debe contener:

- acceso a DB
- imports de rutas Next.js
- logica de permisos

## Estado de implementacion actual

Actualizado a 2026-04-18 tras `MVP-2026-04-18`.

Ya estan adaptadas sobre rutas reales existentes:

- `apps/holded/app/api/holded/validate/route.ts`
- `apps/holded/app/api/holded/connect/route.ts`
- `apps/holded/app/api/holded/status/route.ts`
- `apps/app/app/api/integrations/accounting/status/route.ts`
- `apps/app/app/api/integrations/accounting/connect/route.ts`
- `apps/app/app/api/integrations/accounting/disconnect/route.ts`

Ya estan implementadas en runtime privado:

- `apps/app/app/api/integrations/accounting/rotate-key/route.ts`
- `apps/app/app/api/integrations/accounting/recipients/route.ts`
- `apps/app/app/api/integrations/accounting/recipients/[id]/route.ts`
- `apps/app/app/api/integrations/accounting/memberships/route.ts`
- `apps/app/app/api/integrations/accounting/memberships/invite/route.ts`
- `apps/app/app/api/integrations/accounting/memberships/[id]/route.ts`
- `apps/app/app/api/integrations/accounting/access-requests/route.ts`
- `apps/app/app/api/integrations/accounting/access-requests/[id]/route.ts`
- `apps/app/app/api/integrations/accounting/claims/route.ts`
- `apps/app/app/api/integrations/accounting/claims/[id]/route.ts`

Ya estan implementadas en runtime publico:

- `apps/holded/app/api/holded/access-requests/route.ts`
- `apps/holded/app/api/holded/claims/route.ts`
- `apps/holded/app/api/holded/claims/[id]/route.ts`

Regla aplicada en esta fase:

- las respuestas nuevas exponen DTOs anidados (`connection`, `governanceFlags`, `availableActions`)
- se mantienen campos legacy de primer nivel cuando ya habia consumidores existentes
- no se abren namespaces nuevos mientras la migracion siga siendo incremental
- las rutas principales del conector exponen `requestId` tambien en la superficie publica y privada
- las respuestas del conector añaden `x-verifactu-request-id` en cabecera cuando la ruta ya esta instrumentada con la capa comun
- `availableActions` ya bloquea la desconexion cuando `underClaimReview = true`
- `availableActions` ya bloquea la desconexion cuando `highGovernanceRisk = true`
- `disconnect` valida el bloqueo antes de ejecutar la desconexion real
- `apps/holded` ya expone solicitudes de acceso y claims desde el flujo publico
- `validate` ya detecta conflicto publico y devuelve `duplicateConflict` y `detectedCompany`
- las rutas privadas de gestion del panel (`memberships`, `recipients`, `claims`, `access-requests`, `rotate-key`, `disconnect`) exigen sesion admin allowlisted en superficie `dashboard`
- `disconnect` exige `reauthConfirmed = true` en el request
- `status` se mantiene sin guard admin duro para no romper la visibilidad de la pagina general de integraciones
- la metadata MCP/OAuth publica del conector anuncia `holded.verifactu.business`
- el `next` del flujo OAuth publico vuelve por `/holded/oauth/authorize`
- `POST /api/holded/connect` en `channel=chatgpt` termina tras guardar la conexion y no ejecuta post-procesado publico adicional

## Contratos compartidos cerrados

### DTOs base

- `ConnectionStatusDTO`
- `GovernanceFlagsDTO`
- `DetectedCompanyDTO`
- `DuplicateConflictDTO`
- `ActionBlockReasonDTO`
- `AvailableActionsDTO`
- `MembershipDTO`
- `RecipientDTO`
- `AccessRequestDTO`
- `ClaimCaseDTO`
- `ClaimResolutionDTO`

### Contratos de API

- `HoldedValidateRequest`
- `HoldedValidateResponse`
- `HoldedConnectRequest`
- `HoldedConnectResponse`
- `HoldedStatusResponse`
- `HoldedCreateAccessRequest`
- `HoldedCreateClaimRequest`
- `AccountingStatusResponse`
- `AccountingConnectRequest`
- `AccountingConnectResponse`
- `AccountingDisconnectRequest`
- `AccountingDisconnectResponse`
- `AccountingRotateKeyRequest`
- `AccountingRotateKeyResponse`

## Mapa de endpoints existentes

## Publicos `apps/holded`

### `apps/holded/app/api/holded/validate/route.ts`

### Estado actual

- ya existe
- valida API key
- devuelve `ok`, `probe`, `error`, `validationToken`

### Clasificacion

- `Refactorizar`

### Contrato objetivo

#### Request

- `apiKey`
- `channel`

#### Response

- `ok`
- `probe`
- `validationToken`
- `detectedCompany`
- `duplicateConflict`
- `nextStep`
- `error`
- `reason`
- `suggestedAction`

### Cambio principal

- seguir usando el probe actual
- anadir deteccion de empresa y analisis de conflicto

## `apps/holded/app/api/holded/connect/route.ts`

### Estado actual

- ya existe
- mezcla validacion de identidad manual con conexion
- exige nombre de empresa, tax id y datos de contacto en el flujo actual

### Clasificacion

- `Refactorizar`

### Contrato objetivo

#### Request

- `apiKey`
- `channel`
- `validationToken`
- `companyName?`
- `legalName?`
- `taxId?`
- `roleDeclared?`
- `notificationEmail?`
- `acceptedTerms`
- `acceptedPrivacy`
- `authorizationConfirmed`

#### Response

- `ok`
- `connection`
- `detectedCompany`
- `governanceFlags`
- `availableActions`
- `warnings`
- `nextStep`
- `error`
- `reason`

### Cambio principal

- detectar empresa primero
- completar manual solo lo que falte
- devolver flags de gobernanza desde el primer alta
- para `channel=chatgpt`, usar modo MVP:
  - validar API key
  - guardar conexion
  - devolver `connected`
  - evitar verificacion de email, alertas y comunicaciones del onboarding largo

## `apps/holded/app/api/holded/status/route.ts`

### Estado actual

- ya existe
- devuelve conexion tecnica y algunos metadatos

### Clasificacion

- `Extender`

### Contrato objetivo

- `connection`
- `governanceFlags`
- `availableActions`
- `membershipsSummary`
- `recipientsSummary`
- `claimsSummary`

### Cambio principal

- mantener lectura tecnica actual
- ampliar con flags, acciones y resumenes

## Endpoints nuevos publicos

### `apps/holded/app/api/holded/access-requests/route.ts`

- `Crear`
- crea una `AccessRequest`
- implementado en `PUBLIC-1`

### `apps/holded/app/api/holded/claims/route.ts`

- `Crear`
- crea una `ClaimCase`
- implementado en `PUBLIC-1`

### `apps/holded/app/api/holded/claims/[id]/route.ts`

- `Crear`
- devuelve una claim y su timeline
- implementado en `PUBLIC-1`

## Privados `apps/app`

### `apps/app/app/api/integrations/accounting/status/route.ts`

### Estado actual

- ya existe
- resuelve tenant context
- consulta `holdedConnectionResolver`
- devuelve `status`, `connected`, `lastSyncAt`, `lastError` y capacidades de plan

### Clasificacion

- `Refactorizar`

### Contrato objetivo

- `provider`
- `connection`
- `governanceFlags`
- `membershipsSummary`
- `recipientsSummary`
- `claimsSummary`
- `availableActions`
- `requestId`

### Cambio principal

- mantener la capa de auth y observabilidad actual
- sustituir el contrato plano por DTOs compartidos

## `apps/app/app/api/integrations/accounting/connect/route.ts`

### Estado actual

- ya existe
- valida plan
- cifra secreto
- verifica token opcional
- usa `upsertAccountingIntegration`
- envia emails

### Clasificacion

- `Extender`

### Contrato objetivo

#### Request

- `apiKey`
- `validationToken?`
- `mode`
- `acceptedTerms`
- `acceptedPrivacy`

#### Response

- `ok`
- `connection`
- `governanceFlags`
- `availableActions`
- `probe`
- `warnings`
- `requestId`

### Cambio principal

- mantener validacion de plan y legal actual
- distinguir `initial` frente a `reconnect`
- persistir flags y recipients minimos

## `apps/app/app/api/integrations/accounting/disconnect/route.ts`

### Estado actual

- ya existe
- desconecta conexion
- limpia identidades auxiliares
- envia emails

### Clasificacion

- `Extender`

### Contrato objetivo

#### Request

- `reason?`
- `reauthConfirmed`

#### Response

- `ok`
- `provider`
- `status`
- `governanceFlags`
- `requestId?`

### Cambio principal

- aplicar bloqueos por claim y riesgo
- seguir usando cleanup y emails actuales
- devolver `409` con `governanceFlags` y `availableActions` cuando la desconexion este bloqueada

## Endpoints nuevos privados

### `apps/app/app/api/integrations/accounting/rotate-key/route.ts`

- `Crear`
- rota API key sin recrear la conexion logica
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/memberships/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/memberships/[id]/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/memberships/invite/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/recipients/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/recipients/[id]/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/access-requests/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/access-requests/[id]/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/claims/route.ts`

- `Crear`
- implementado en `API-2`

### `apps/app/app/api/integrations/accounting/claims/[id]/route.ts`

- `Crear`
- implementado en `API-2`

## Capas auxiliares a tocar en implementacion

### Reutilizar

- `apps/app/lib/integrations/accountingStore.ts`
- `apps/app/lib/integrations/holdedConnectionResolver.ts`
- `packages/integrations/holded/connection.ts`

### Refactorizar

- `apps/app/lib/integrations/companyNotificationEmailStore.ts`

### Extender

- `packages/integrations/holded/connection.ts`
  - para soportar `initial`, `reconnect`, `rotate`
- `apps/app/lib/integrations/accountingStore.ts`
  - para flags y compatibilidad temporal
- `apps/app/lib/integrations/holdedConnectionResolver.ts`
  - para DTOs ampliados y flags

## Orden recomendado de implementacion de endpoints

1. `validate`
2. `status` publico
3. `status` privado
4. `connect` publico
5. `connect` privado
6. `disconnect`
7. `rotate-key`
8. `recipients`
9. `access-requests`
10. `claims`
11. `memberships`

## Criterio de cierre de esta fase

La fase queda cerrada cuando:

- los contratos compartidos estan fijados en un archivo comun
- cada endpoint existente tiene clasificacion y contrato objetivo
- las rutas nuevas necesarias estan nombradas
- el primer bloque de implementacion ya puede ejecutarse sin redisenar endpoints a mitad de trabajo

## Nota operacional sobre `notified`

Desde `NOTIFY-1`, las rutas del conector que crean o resuelven:

- `access requests`
- `claims`

devuelven `notified` como resultado real del intento de envio de emails:

- `true` cuando los envios previstos se completan correctamente
- `false` cuando la operacion principal se completa pero el envio falla

El fallo de notificacion no rompe la operacion principal. Queda trazado en observabilidad estructurada con `outcome = notification_failed`.

## Addendum Fase I - 2026-04-18

### `/holded/oauth/authorize`

- el endpoint publico ya no hace redirect visible a `/app`
- ahora actua como proxy transparente al backend compartido OAuth
- objetivo: que el navegador no abandone el dominio `/holded` durante el tramo publico del conector

### `POST /api/holded/connect` en `channel=chatgpt`

- vuelve a emitir correo real post-connect
- registra `HOLDED_CONNECTED` en `usage_events`
- mantiene el flujo minimo:
  - validar
  - guardar
  - notificar
  - volver a ChatGPT

### `GET /api/integrations/accounting/admin/traces`

- nuevo endpoint privado de admin
- expone:
  - `activeSessions`
  - `recentConversations`
  - `summary.memoryFacts`

### `POST /api/integrations/accounting/disconnect`

- ahora devuelve tambien `operationalReset`
- limpia:
  - `sessions` persistidas del tenant
  - `isaak_memory_facts`
- conserva:
  - `isaak_conversations` como historico admin
