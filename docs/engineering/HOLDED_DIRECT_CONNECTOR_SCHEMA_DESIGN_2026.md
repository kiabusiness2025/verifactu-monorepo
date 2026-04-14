# Holded Direct Connector - Exact Schema Design 2026

## Objetivo

Cerrar el diseno exacto de `schema.prisma` sobre el estado real del repo, reutilizando los modelos actuales y dejando clara la transicion hacia recipients, access requests y claims.

Este documento no implementa aun el schema. Fija el contrato de datos previo a la fase de cambios reales.

## Base existente revisada

Archivo revisado:

- `packages/db/prisma/schema.prisma`

Modelos reutilizables ya presentes:

- `Tenant`
- `TenantProfile`
- `Membership`
- `TenantIntegration`
- `ExternalConnection`
- `ExternalConnectionAuditLog`

Regla de trabajo:

- reutilizar `ExternalConnection` como tabla canonica de conexion Holded
- extender `Membership` en vez de sustituirla
- no romper `TenantIntegration` ni `channelKey` mientras siga habiendo compatibilidad legacy
- aplicar primero una implementacion aditiva que no rompa los campos string legacy mas usados

## Clasificacion por modelo

### Reutilizar

- `Tenant`
- `TenantProfile`
- `TenantIntegration`
- `ExternalConnectionAuditLog`

### Extender

- `ExternalConnection`
- `Membership`

### Crear

- `ConnectionRecipient`
- `AccessRequest`
- `ClaimCase`
- `ClaimResolution`

### Deprecar despues

- `TenantIntegration` como fuente principal de conexion Holded
- `channelKey` como semantica de negocio principal

## Enums exactos

### `ConnectionStatus`

- `connected`
- `needs_reconnection`
- `revoked_api`
- `disconnected`
- `failed`

### `OwnershipStatus`

- `confirmed`
- `pending_confirmation`
- `third_party_managed`

### `MembershipRole`

- `company_admin`
- `operator`
- `viewer`
- `advisor_operator`

### `MembershipSide`

- `client`
- `advisor`

### `MembershipStatus`

- `active`
- `invited`
- `disabled`

### `AccessRequestStatus`

- `submitted`
- `under_review`
- `approved`
- `rejected`
- `cancelled`

### `ClaimType`

- `control`
- `advisor_governance`

### `ClaimStatus`

- `submitted`
- `acknowledged`
- `under_review`
- `awaiting_response`
- `resolved_approved`
- `resolved_rejected`
- `closed`

### `RecipientType`

- `user_primary`
- `client_contact`
- `shared_mailbox`
- `ops`
- `advisor_contact`

## `ExternalConnection`

### Mantener tal cual

- `tenantId`
- `provider`
- `channelKey`
- `providerAccountId`
- `credentialType`
- `apiKeyEnc`
- `scopesGranted`
- `connectionStatus`
- `connectedByUserId`
- `connectedAt`
- `lastValidatedAt`
- `lastSyncAt`
- `lastError`
- `legalTermsAcceptedAt`
- `legalPrivacyAcceptedAt`
- `legalAcceptanceVersion`
- `createdAt`
- `updatedAt`

### Anadir

- `ownershipStatus OwnershipStatus?`
- `managedByThirdParty Boolean @default(false)`
- `clientAdminGap Boolean @default(true)`
- `highGovernanceRisk Boolean @default(false)`
- `underClaimReview Boolean @default(false)`
- `originChannel String?`
- `technicalOperatorUserId String?`
- `disconnectedAt DateTime?`
- `revokedAt DateTime?`
- `companyIdentityJson Json?`
- `governanceUpdatedAt DateTime?`

### Relaciones nuevas

- `technicalOperatorUser User?`
- `recipients ConnectionRecipient[]`
- `accessRequests AccessRequest[]`
- `claims ClaimCase[]`

### Relaciones existentes a mantener

- `tenant`
- `connectedByUser`
- `auditLogs`
- `syncRuns`

### Indices a anadir

- `[tenantId, provider, connectionStatus]`
- `[provider, providerAccountId]`
- `[tenantId, managedByThirdParty]`
- `[tenantId, clientAdminGap]`
- `[tenantId, highGovernanceRisk]`
- `[tenantId, underClaimReview]`
- `[technicalOperatorUserId]`

### Restriccion que se mantiene

- `@@unique([tenantId, provider, channelKey])`

No se endurece todavia una unicidad nueva por tenant+provider sin `channelKey` hasta cerrar el rollout.

### Decision de implementacion incremental

- en `IMP-1`, `connectionStatus` se mantiene como `String`
- el enum de contrato existe a nivel de dominio, pero la columna no se endurece todavia en Prisma para no romper codigo y SQL existentes

## `Membership`

### Mantener tal cual

- `tenantId`
- `userId`
- `invitedBy`
- `createdAt`
- `@@unique([tenantId, userId])`

### Normalizar

- `role` pasa de `String` a `MembershipRole`
- `status` pasa de `String` a `MembershipStatus`

### Decision de implementacion incremental

- en `IMP-1`, `role` y `status` se mantienen como `String`
- se anaden `side`, `confirmedAt`, `disabledAt` y `metadataJson`
- la normalizacion dura de `role/status` queda diferida para una fase posterior con refactor de consumidores

### Anadir

- `side MembershipSide?`
- `confirmedAt DateTime?`
- `disabledAt DateTime?`
- `metadataJson Json?`

### Reglas de negocio

- `company_admin` solo puede existir con `side = client`
- `advisor_operator` solo puede existir con `side = advisor`

### Indices a anadir

- `[tenantId, role, status]`
- `[tenantId, side, status]`
- `[userId, status]`

## `TenantProfile`

### Mantener

- `source`
- `sourceId`
- `taxId`
- `legalName`
- `tradeName`
- `email`
- `representative`
- `phone`

### Regla funcional

- `TenantProfile` sigue siendo identidad operativa de empresa
- `ExternalConnection.companyIdentityJson` guarda snapshot tecnico detectado en la conexion
- no mezclar ambas capas sin regla explicita

## `ConnectionRecipient`

Tabla nueva para destinatarios reales de una conexion Holded.

### Campos

- `id`
- `connectionId`
- `tenantId`
- `email`
- `recipientType`
- `isMandatory`
- `isClientSide`
- `isConfirmed`
- `createdByUserId`
- `disabledAt`
- `createdAt`
- `updatedAt`

### Relaciones

- `connection ExternalConnection`
- `tenant Tenant`
- `createdByUser User?`

### Indices

- `[connectionId, disabledAt]`
- `[tenantId, isClientSide, disabledAt]`
- `[email]`

### Restriccion logica

- no duplicar recipients activos exactos en la misma conexion

## `AccessRequest`

Tabla nueva para solicitudes de acceso sobre una conexion ya existente.

### Campos

- `id`
- `connectionId`
- `tenantId`
- `requesterUserId`
- `status`
- `requestedRole`
- `message`
- `resolvedByUserId`
- `resolvedAt`
- `createdAt`
- `updatedAt`

### Relaciones

- `connection ExternalConnection`
- `tenant Tenant`
- `requesterUser User`
- `resolvedByUser User?`

### Indices

- `[connectionId, status]`
- `[requesterUserId, status]`

### Restriccion logica

- una request abierta equivalente por `connectionId + requesterUserId`

## `ClaimCase`

Tabla nueva para reclamaciones de control o gobernanza.

### Campos

- `id`
- `connectionId`
- `tenantId`
- `createdByUserId`
- `claimType`
- `status`
- `reason`
- `scope`
- `requiresInternalReview`
- `resolvedByUserId`
- `resolvedAt`
- `outcome`
- `createdAt`
- `updatedAt`

### Relaciones

- `connection ExternalConnection`
- `tenant Tenant`
- `createdByUser User`
- `resolvedByUser User?`
- `resolutions ClaimResolution[]`

### Indices

- `[connectionId, status]`
- `[createdByUserId, status]`
- `[claimType, status]`

### Restriccion logica

- una claim abierta equivalente por `connectionId + claimType`

## `ClaimResolution`

Tabla nueva de historial inmutable para una claim.

### Campos

- `id`
- `claimCaseId`
- `actorUserId`
- `action`
- `previousStatus`
- `nextStatus`
- `notes`
- `createdAt`

### Relaciones

- `claimCase ClaimCase`
- `actorUser User?`

### Indice

- `[claimCaseId, createdAt]`

## `ExternalConnectionAuditLog`

### Mantener

- modelo actual
- `requestPayload`
- `responsePayload`

### Extender

- catalogo de `action`
- indice opcional por `[action, createdAt]`

## Orden exacto de migraciones futuras

Las siguientes migraciones deben continuar el historial actual del repo:

1. `010_external_connection_governance_flags`
2. `011_membership_side_and_role_normalization`
3. `012_connection_recipients`
4. `013_access_requests`
5. `014_claim_cases_and_resolutions`
6. `015_external_connection_audit_log_indexes`
7. `016_backfill_holded_governance`
8. `017_backfill_connection_recipients`
9. `018_enable_guard_rails`

## Compatibilidad temporal obligatoria

- `channelKey` sigue existiendo
- `TenantIntegration` sigue conviviendo
- `companyNotificationEmailStore` sigue vivo como fallback
- `Membership.side` puede empezar nullable
- `ownershipStatus` puede empezar nullable

## Criterio de cierre de esta fase

La fase queda cerrada cuando:

- el schema objetivo esta fijado por modelo y campo
- las migraciones tienen nombre y orden definidos
- la compatibilidad temporal queda explicita
- el siguiente paso ya puede ser implementar el schema real sin ambiguedad
