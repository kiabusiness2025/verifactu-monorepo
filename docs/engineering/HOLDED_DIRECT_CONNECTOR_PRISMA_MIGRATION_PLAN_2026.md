# Holded Direct Connector - Prisma Migration Plan 2026

## Objetivo

Definir la evolucion incremental del modelo de datos del conector directo `ChatGPT <-> Holded` sin romper el runtime existente del monorepo.

Este documento parte del estado real ya presente en el repo:

- `ExternalConnection` ya es la base tecnica canonica de la conexion Holded.
- `Membership` ya resuelve acceso de usuario a tenant.
- `TenantProfile` ya guarda identidad de empresa y algunos datos detectados/manuales.
- `ExternalConnectionAuditLog` ya permite trazabilidad operativa.
- `TenantIntegration` y `companyNotificationEmailStore` siguen existiendo por compatibilidad.

Regla principal:

- evolucionar lo existente
- no introducir una arquitectura paralela
- activar restricciones duras solo cuando el dato sea fiable

## Alcance

Incluido en este plan:

- ampliar `ExternalConnection` con estados y flags de gobernanza
- ampliar `Membership` con lado cliente/asesoria y estados mas claros
- introducir recipients multiples por conexion
- introducir access requests
- introducir claims y resoluciones
- preparar auditoria y rollout sin romper consumidores actuales

No incluido aqui:

- schema Prisma final en codigo
- implementacion de endpoints
- implementacion de UI

## Estado actual del repo

### Reutilizar

- `Tenant`
- `TenantProfile`
- `Membership`
- `ExternalConnection`
- `ExternalConnectionAuditLog`
- migraciones ya aplicadas de conexiones compartidas Holded por canal

### Refactorizar

- uso de `channelKey` como semantica de negocio principal
- store de email unico de empresa
- resolvers y stores que aun devuelven un contrato tecnico demasiado estrecho

### Extender

- `ExternalConnection`
- `Membership`
- auditoria operativa

### Crear

- `ConnectionRecipient`
- `AccessRequest`
- `ClaimCase`
- `ClaimResolution`

### Deprecar despues

- suposicion de ownership implicito del primer conectador
- uso del email unico de empresa como sistema principal de recipients
- cualquier logica que trate la conexion como "del usuario" en vez de "del tenant"

## Principios de migracion

1. Migracion incremental, no big bang.
2. Compatibilidad temporal con readers y stores existentes.
3. Backfill conservador: cuando no haya certeza, marcar estados pendientes y no confirmados.
4. Ningun bloqueo duro de gobernanza se activa antes de tener datos fiables.
5. Las migraciones de schema y los jobs de backfill se separan.
6. La primera implementacion real puede anadir campos y tablas nuevas sin endurecer aun los campos string legacy si eso evita romper tipado y SQL existente.

## Modelo objetivo

## ExternalConnection

`ExternalConnection` sigue siendo la tabla canonica de conexion tecnica y se amplia con:

- `ownershipStatus`
- `managedByThirdParty`
- `clientAdminGap`
- `highGovernanceRisk`
- `underClaimReview`
- `originChannel`
- `technicalOperatorUserId`
- `disconnectedAt`
- `revokedAt`
- `companyIdentityJson`
- `governanceUpdatedAt`

Responsabilidades futuras:

- lifecycle tecnico
- flags de gobernanza
- enlace a recipients, access requests y claims

## Membership

`Membership` se amplia para soportar:

- rol operativo canonico
- lado `client` o `advisor`
- estado del membership
- confirmacion explicita del lado cliente cuando aplique

Regla de negocio:

- `company_admin` se reserva al lado cliente
- `advisor_operator` no sustituye a un admin del cliente

## ConnectionRecipient

Nueva tabla para los destinatarios reales de avisos por conexion.

Debe soportar:

- recipients obligatorios
- recipients del lado cliente
- recipients de asesoria
- recipients compartidos u operativos

## AccessRequest

Nueva tabla para solicitudes de acceso cuando una empresa ya esta conectada.

Debe soportar:

- estado de revision
- aprobacion/rechazo
- trazabilidad del solicitante y resolvedor

## ClaimCase

Nueva tabla para reclamaciones de control y de gobernanza de asesoria.

Debe soportar:

- apertura
- revision interna
- resolucion
- vinculacion con `underClaimReview`

## ClaimResolution

Nueva tabla de historial de decisiones y cambios de estado de una claim.

## Enums objetivo

### ConnectionStatus

- `connected`
- `needs_reconnection`
- `revoked_api`
- `disconnected`
- `failed`

### OwnershipStatus

- `confirmed`
- `pending_confirmation`
- `third_party_managed`

### MembershipRole

- `company_admin`
- `operator`
- `viewer`
- `advisor_operator`

### MembershipSide

- `client`
- `advisor`

### MembershipStatus

- `active`
- `invited`
- `disabled`

### AccessRequestStatus

- `submitted`
- `under_review`
- `approved`
- `rejected`
- `cancelled`

### ClaimType

- `control`
- `advisor_governance`

### ClaimStatus

- `submitted`
- `acknowledged`
- `under_review`
- `awaiting_response`
- `resolved_approved`
- `resolved_rejected`
- `closed`

### RecipientType

- `user_primary`
- `client_contact`
- `shared_mailbox`
- `ops`
- `advisor_contact`

## Modelo transitorio

Mientras dure el rollout:

- `channelKey` sigue existiendo en `ExternalConnection`
- `TenantIntegration` sigue conviviendo por compatibilidad
- `companyNotificationEmailStore` sigue vivo como fallback
- `Membership.side` puede empezar como nullable
- `ownershipStatus` puede empezar como nullable
- no se activan restricciones duras sobre ultimo admin cliente o ultimo recipient obligatorio

## Cambios de schema por fase

### Fase DB-1 - Flags y enums de conexion

Migracion sugerida:

- `010_external_connection_governance_flags`

Incluye:

- enums `ConnectionStatus`, `OwnershipStatus`
- columnas nuevas en `ExternalConnection`
- indices por estado y flags

Nota de implementacion incremental:

- en la primera pasada real, `connectionStatus` puede seguir como `String` en Prisma y en SQL mientras se anaden flags nuevos y se evita romper runtime existente

### Fase DB-2 - Memberships operativos

Migracion sugerida:

- `011_membership_side_and_role_normalization`

Incluye:

- enums `MembershipRole`, `MembershipSide`, `MembershipStatus`
- columnas nuevas en `Membership`

Nota de implementacion incremental:

- en la primera pasada real, `Membership.role` y `Membership.status` pueden seguir como `String`
- la normalizacion dura a enum queda diferida hasta cerrar compatibilidad con Prisma y SQL raw existentes

### Fase DB-3 - Recipients

Migracion sugerida:

- `012_connection_recipients`

Incluye:

- enum `RecipientType`
- tabla `ConnectionRecipient`
- FKs e indices base

### Fase DB-4 - Access requests

Migracion sugerida:

- `013_access_requests`

Incluye:

- enum `AccessRequestStatus`
- tabla `AccessRequest`

### Fase DB-5 - Claims

Migracion sugerida:

- `014_claim_cases_and_resolutions`

Incluye:

- enums `ClaimType`, `ClaimStatus`
- tabla `ClaimCase`
- tabla `ClaimResolution`

### Fase DB-6 - Auditoria ampliada

Migracion sugerida:

- `015_external_connection_audit_log_indexes`

Incluye:

- indices y soporte a catalogo de acciones ampliado

## Backfill recomendado

## Backfill de ExternalConnection

Asignacion conservadora para registros antiguos:

- `ownershipStatus = pending_confirmation`
- `managedByThirdParty = false` salvo evidencia clara
- `clientAdminGap = true` si no puede demostrarse admin cliente confirmado
- `highGovernanceRisk = false`
- `underClaimReview = false`
- `originChannel = channelKey` cuando exista

## Backfill de Membership

- mapear `role` legacy a enum nuevo cuando sea seguro
- `side = null` si no hay certeza
- promover a `client` o `advisor` solo con senales fiables o accion posterior

## Backfill de Recipients

Orden de prioridad:

1. email del usuario conectador
2. email confirmado de `company_notification_emails`
3. email de `TenantProfile`

Regla:

- crear al menos un recipient operativo cuando sea posible
- no asumir `isClientSide = true` salvo evidencia clara

## Restricciones duras: cuando activarlas

### Dedupe fuerte de conexion

Solo despues de:

- diagnostico de duplicados historicos
- definicion estable de identidad tecnica/funcional

### Bloqueo de ultimo recipient obligatorio

Solo despues de:

- `ConnectionRecipient` activo en produccion
- backfill minimo completado

### Bloqueo de ultimo admin cliente

Solo despues de:

- `Membership.side` con calidad minima suficiente
- flujo funcional de reemplazo disponible

### Activacion real de `highGovernanceRisk`

Solo despues de:

- poder calcular con fiabilidad:
  - `managedByThirdParty`
  - `clientAdminGap`
  - ausencia de recipient cliente

## Compatibilidad hacia atras

Compatibilidad minima que debe mantenerse durante rollout:

- readers actuales de `ExternalConnection`
- status actual de integracion en `apps/app`
- flujo publico de `apps/holded`
- fallback de `companyNotificationEmailStore`
- coexistencia controlada de `TenantIntegration`

## Riesgos de migracion

### Datos antiguos incompletos

- impacto: alto
- mitigacion: defaults conservadores y backfill progresivo

### Duplicados historicos de conexion

- impacto: alto
- mitigacion: diagnostico previo a constraints fuertes

### Conexiones sin lado cliente claro

- impacto: alto
- mitigacion: `pending_confirmation` y `clientAdminGap`

### Frontend/backend desalineados en despliegue parcial

- impacto: alto
- mitigacion: doble lectura temporal y rollout por fases

### Asesorias historicas sin modelo explicito

- impacto: medio-alto
- mitigacion: no promover automaticamente; usar flags conservadores

## Definition of Done de migracion Prisma

Esta fase queda cerrada cuando:

- el schema objetivo esta definido sobre el modelo actual
- existe secuencia de migraciones con nombres y alcance
- existe estrategia de backfill
- existe plan de compatibilidad temporal
- no se han activado restricciones duras sin dato fiable
- el documento de arquitectura y el de estados/gobernanza quedan alineados

## Archivos que este plan obliga a revisar despues

- `packages/db/prisma/schema.prisma`
- `packages/integrations/holded/connection.ts`
- `apps/app/lib/integrations/accountingStore.ts`
- `apps/app/lib/integrations/holdedConnectionResolver.ts`
- `apps/app/lib/integrations/companyNotificationEmailStore.ts`
- `apps/holded/HOLDED_CONNECTION_ARCHITECTURE.md`

## Estado del documento

- estado: canonico para fase DB-1
- siguiente paso habilitado: cerrar el diseno exacto de `schema.prisma`
