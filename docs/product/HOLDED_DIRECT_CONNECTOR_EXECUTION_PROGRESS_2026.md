# Holded Direct Connector - Execution Progress 2026

## Objetivo

Registrar el avance real de implementacion del conector directo `ChatGPT <-> Holded` por fases, sin perder continuidad entre producto, datos, backend, frontend y documentacion.

Regla:

- ninguna fase se considera cerrada si no deja documentado:
  - que se entrego
  - que queda pendiente
  - que riesgos siguen abiertos
  - que fase siguiente queda habilitada

## Fase actual

## Fase STAB-2026-04-16 - Disconnect hard reset + ChatGPT onboarding hardening

- estado: completada
- fecha de cierre: 2026-04-16

### Objetivo de fase

Eliminar friccion real en reconexion multiempresa/multiusuario y cerrar una regresion de onboarding `channel=chatgpt` que podia bloquear la conexion por `taxId` historico invalido.

### Entregado

- `apps/app/app/api/integrations/accounting/disconnect/route.ts`:
  - `disconnect` pasa a modo forzado cuando governance lo marcaba como bloqueado.
  - se mantiene trazabilidad via evento `forced_disconnect`.
- `apps/app/lib/integrations/accountingStore.ts`:
  - reset fuerte al desconectar:
    - limpia credencial, operador tecnico y usuario conectado
    - limpia metadatos de identidad legal y tiempos de sync/validacion
    - normaliza flags de gobernanza y estado legal para reconexion limpia
  - en `upsert`, `connected_by_user_id` deja de heredarse por `COALESCE` para evitar arrastre de identidad previa.
- `apps/app/lib/integrations/holdedGovernanceService.ts`:
  - nueva operacion `resetGovernanceOnDisconnect`:
    - cancela `access_requests` abiertas
    - cierra `claim_cases` abiertas
    - escribe timeline en `claim_resolutions`
    - baja `underClaimReview` en la conexion
- `apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx`:
  - en flujo `chatgpt` API-key-only no se envian campos de perfil (`taxId`, `companyName`, `legalName`, `contactEmail`, etc.).
  - se evita que datos historicos prefilled bloqueen `POST /api/holded/connect` con `invalid_tax_id`.

### Verificacion ejecutada

- `pnpm jest app/api/integrations/accounting/disconnect/route.test.ts lib/integrations/accountingStore.test.ts --runInBand`
- `pnpm jest lib/integrations/holdedGovernanceService.test.ts app/api/integrations/accounting/disconnect/route.test.ts lib/integrations/accountingStore.test.ts --runInBand`
- `pnpm --filter verifactu-app exec tsc --noEmit`
- `pnpm --filter verifactu-holded test -- --runTestsByPath app/onboarding/holded/OnboardingHoldedClient.test.tsx --runInBand`
- `pnpm --filter verifactu-holded test -- --runTestsByPath app/api/holded/connect/route.test.ts --runInBand`

### Pendiente

- validar e2e en produccion controlada el caso:
  - empresa previamente conectada
  - `channel=chatgpt`
  - `reset=1`
  - reconexion con correo distinto
- decidir politica final de retencion historica para claims cerradas por disconnect (retener timeline vs purga).

### Decisiones cerradas en esta fase

- governance puede bloquear UX, pero no puede impedir una desconexion de saneamiento.
- en `chatgpt` key-only flow, la identidad de empresa no se debe reenviar implicitamente.

### Riesgos abiertos

- aun existen cambios locales no relacionados en el monorepo que deben revisarse por separado antes de un release global.

### Fase DB-1 - Prisma migration plan

- estado: completada
- fecha de cierre: 2026-04-11

### Objetivo de fase

Dejar cerrado el plan canonico de evolucion de schema y rollout incremental sobre el modelo actual del repo.

### Entregado

- documento canonico de migracion Prisma:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_PRISMA_MIGRATION_PLAN_2026.md`
- clasificacion clara de:
  - reutilizar
  - refactorizar
  - extender
  - crear
  - deprecar despues
- secuencia de migraciones por nombre
- estrategia de backfill
- criterios para activar restricciones duras

### Pendiente

- cerrar el diseno exacto de `schema.prisma`
- fijar DTOs compartidos
- mapear endpoint por endpoint sobre archivos reales
- ejecutar migraciones y rollout

### Decisiones cerradas en esta fase

- `ExternalConnection` sigue siendo el centro tecnico
- `Membership` se extiende, no se sustituye
- recipients, access requests y claims se introducen como tablas nuevas
- la migracion sera incremental
- no se activa bloqueo duro sin dato fiable

### Compatibilidad temporal vigente

- `channelKey` sigue existiendo
- `TenantIntegration` sigue coexistiendo
- `companyNotificationEmailStore` sigue como fallback
- readers actuales de status pueden convivir temporalmente con DTOs ampliados

### Riesgos abiertos

- datos Holded aun no confirmados del todo para identidad de empresa
- calidad historica desigual de memberships y emails de compania
- posibles duplicados historicos

### Siguiente fase habilitada

- Fase DB-2 - diseno exacto de `schema.prisma`

## Fase DB-2 - Exact schema design

- estado: completada
- fecha de cierre: 2026-04-11

### Objetivo de fase

Cerrar el diseno exacto de `schema.prisma` sobre los modelos reales del repo y fijar el orden de migraciones posteriores.

### Entregado

- documento canonico de diseno exacto de schema:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_SCHEMA_DESIGN_2026.md`
- detalle por modelo de:
  - campos que se mantienen
  - campos que se anaden
  - relaciones nuevas
  - indices nuevos
- orden exacto de migraciones `010` a `018`

### Pendiente

- fijar contratos compartidos en archivo TypeScript
- mapear endpoint por endpoint sobre rutas reales
- empezar implementacion de schema

### Decisiones cerradas en esta fase

- `ExternalConnection` se extiende sin perder `channelKey`
- `Membership` se normaliza con enums y lado `client/advisor`
- `ConnectionRecipient`, `AccessRequest`, `ClaimCase` y `ClaimResolution` son tablas nuevas
- no se activa nueva unicidad dura por tenant+provider sin cerrar rollout

### Compatibilidad temporal vigente

- `TenantIntegration` sigue coexistiendo
- `companyNotificationEmailStore` sigue como fallback
- `Membership.side` y `ownershipStatus` pueden empezar como nullable

### Riesgos abiertos

- calidad historica de `Membership.role/status`
- calidad desigual de recipients y emails legacy
- deduplicacion final condicionada por datos historicos

### Siguiente fase habilitada

- Fase API-0 - contratos compartidos y mapa de endpoints

## Fase API-0 - Shared contracts and endpoint map

- estado: completada
- fecha de cierre: 2026-04-11

### Objetivo de fase

Fijar un archivo compartido de contratos y cerrar el mapa endpoint por endpoint antes de tocar implementacion.

### Entregado

- archivo compartido de contratos:
  - `packages/integrations/holded/contracts.ts`
- exports actualizados en:
  - `packages/integrations/index.ts`
- documento canonico de endpoints y contratos:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_ENDPOINT_AND_CONTRACTS_2026.md`

### Pendiente

- implementar cambios reales en `schema.prisma`
- crear migraciones Prisma
- refactorizar rutas existentes para consumir los contratos nuevos

### Decisiones cerradas en esta fase

- los contratos compartidos viven en `packages/integrations/holded/contracts.ts`
- los endpoints existentes se reutilizan y se amplian; no se crea un namespace paralelo
- `rotate-key`, `recipients`, `access-requests`, `claims` y `memberships` se anaden como rutas nuevas

### Compatibilidad temporal vigente

- los contratos nuevos aun no estan cableados a runtime
- las rutas actuales siguen devolviendo payloads legacy hasta la implementacion

### Riesgos abiertos

- divergencia temporal entre contrato documentado y respuesta real hasta ejecutar la fase de implementacion
- necesidad de adaptar tests existentes de `validate` y `connect`

### Siguiente fase habilitada

- Fase IMP-1 - implementar schema Prisma y migraciones reales

## Fase IMP-1 - Prisma additive schema and real migrations

- estado: completada
- fecha de cierre: 2026-04-11

### Objetivo de fase

Aplicar en el repo real el primer bloque de implementacion de Prisma sin romper el runtime existente.

### Entregado

- `packages/db/prisma/schema.prisma` ampliado con:
  - flags de gobernanza en `ExternalConnection`
  - relaciones nuevas a recipients, requests y claims
  - campos nuevos en `Membership`
  - tablas nuevas:
    - `ConnectionRecipient`
    - `AccessRequest`
    - `ClaimCase`
    - `ClaimResolution`
- migraciones reales anadidas:
  - `20260411100000_external_connection_governance_flags`
  - `20260411101000_membership_governance_fields`
  - `20260411102000_connection_recipients`
  - `20260411103000_access_requests`
  - `20260411104000_claim_cases_and_resolutions`
- validacion del schema con:
  - `prisma validate`

### Pendiente

- ejecutar backfills
- cablear runtime y endpoints a los nuevos campos/tablas
- adaptar tests y responses reales al contrato compartido

### Decisiones cerradas en esta fase

- la primera implementacion es aditiva
- `ExternalConnection.connectionStatus` sigue como `String` por compatibilidad
- `Membership.role` y `Membership.status` siguen como `String` por compatibilidad
- la normalizacion dura a enums queda diferida

### Compatibilidad temporal vigente

- `TenantIntegration` sigue coexistiendo
- `companyNotificationEmailStore` sigue como fallback
- los nuevos modelos existen en schema, pero aun no gobiernan runtime

### Riesgos abiertos

- `prisma generate` no pudo completarse por un bloqueo local del engine en `node_modules/.prisma`
- el schema es valido, pero el cliente Prisma debe regenerarse cuando el bloqueo local desaparezca
- aun no hay backfill ni uso real de las nuevas tablas

### Siguiente fase habilitada

- Fase IMP-2 - adaptar stores, resolver y runtime de conexion a los nuevos campos

## Fase IMP-2 - Runtime compatibility for governance fields

- estado: completada
- fecha de cierre: 2026-04-11

### Objetivo de fase

Adaptar el runtime existente para leer y escribir los nuevos campos de gobernanza en `ExternalConnection` sin romper instalaciones a medio migrar ni depender todavia de los modelos nuevos de recipients, requests y claims.

### Entregado

- `packages/integrations/holded/connection.ts` actualizado para:
  - persistir `originChannel`
  - inicializar `ownershipStatus`
  - inicializar flags de gobernanza conservadores
  - guardar `technicalOperatorUserId`
  - escribir `companyIdentityJson`
  - exponer los nuevos campos al leer conexion
- `apps/app/lib/integrations/holdedConnectionResolver.ts` actualizado para:
  - leer columnas opcionales de `external_connections` de forma defensiva
  - exponer `originChannel`, flags de gobernanza y operador tecnico
- `apps/app/lib/integrations/accountingStore.ts` actualizado para:
  - bootstrapear y asegurar columnas nuevas en `external_connections`
  - mantener escritura SQL compatible con schema antiguo y nuevo
  - limpiar `disconnected_at` y `revoked_at` al reconectar o sincronizar correctamente
  - actualizar `governance_updated_at` en transiciones relevantes
- tests actualizados:
  - `apps/app/lib/integrations/holdedConnectionResolver.test.ts`
- verificacion ejecutada:
  - `pnpm --filter verifactu-app test -- --runInBand apps/app/lib/integrations/holdedConnectionResolver.test.ts apps/app/lib/integrations/accountingStore.test.ts`
  - `pnpm --filter @verifactu/integrations type-check`

### Pendiente

- adaptar endpoints publicos y privados al contrato compartido
- empezar a usar `ConnectionRecipient`, `AccessRequest` y `ClaimCase` en runtime real
- regenerar cliente Prisma cuando desaparezca el bloqueo local del engine

### Decisiones cerradas en esta fase

- el runtime SQL de `apps/app` sigue siendo incremental y defensivo
- `accountingStore` asegura schema opcional antes de operar sobre columnas nuevas
- el resolver no asume que todas las columnas nuevas existen todavia en todas las instalaciones
- los flags de gobernanza iniciales siguen siendo conservadores

### Compatibilidad temporal vigente

- `TenantIntegration` sigue coexistiendo para compatibilidad
- `companyNotificationEmailStore` sigue como fallback
- `ConnectionRecipient`, `AccessRequest` y `ClaimCase` todavia no gobiernan las rutas
- el cliente Prisma generado puede seguir desalineado localmente si el engine esta bloqueado

### Riesgos abiertos

- `prisma generate` sigue bloqueado localmente por procesos `node` reteniendo el engine de Prisma
- los endpoints aun devuelven payloads legacy aunque el runtime ya conozca mas campos
- los flags nuevos aun no estan explotados por panel y onboarding

### Siguiente fase habilitada

- Fase API-1 - adaptar endpoints existentes y respuestas reales al contrato compartido

## Fase API-1 - Existing routes adapted to shared contracts

- estado: completada
- fecha de cierre: 2026-04-11

### Objetivo de fase

Ampliar las rutas reales ya existentes para exponer DTOs compartidos y flags de gobernanza sin romper consumidores legacy ni abrir un namespace nuevo.

### Entregado

- nuevos mappers compartidos en:
  - `packages/integrations/holded/dtoMappers.ts`
- exports actualizados en:
  - `packages/integrations/index.ts`
- rutas publicas adaptadas:
  - `apps/holded/app/api/holded/validate/route.ts`
  - `apps/holded/app/api/holded/connect/route.ts`
  - `apps/holded/app/api/holded/status/route.ts`
- rutas privadas adaptadas:
  - `apps/app/app/api/integrations/accounting/status/route.ts`
  - `apps/app/app/api/integrations/accounting/connect/route.ts`
  - `apps/app/app/api/integrations/accounting/disconnect/route.ts`
- tests actualizados y pasando:
  - `apps/holded/app/api/holded/validate/route.test.ts`
  - `apps/holded/app/api/holded/connect/route.test.ts`
  - `apps/app/app/api/integrations/accounting/status/route.test.ts`
  - `apps/app/app/api/integrations/accounting/connect/route.test.ts`
  - `apps/app/app/api/integrations/accounting/disconnect/route.test.ts`
  - `apps/app/lib/integrations/holdedConnectionResolver.test.ts`
  - `apps/app/lib/integrations/accountingStore.test.ts`
- verificaciones ejecutadas:
  - `pnpm --filter verifactu-holded test -- --runInBand apps/holded/app/api/holded/validate/route.test.ts apps/holded/app/api/holded/connect/route.test.ts`
  - `pnpm --filter verifactu-app test -- --runInBand apps/app/app/api/integrations/accounting/status/route.test.ts apps/app/app/api/integrations/accounting/connect/route.test.ts apps/app/app/api/integrations/accounting/disconnect/route.test.ts apps/app/lib/integrations/holdedConnectionResolver.test.ts apps/app/lib/integrations/accountingStore.test.ts`
  - `pnpm --filter @verifactu/integrations type-check`

### Pendiente

- crear rutas nuevas para `rotate-key`, `recipients`, `access-requests`, `claims` y `memberships`
- cablear `ConnectionRecipient`, `AccessRequest` y `ClaimCase` al runtime real
- reducir campos legacy cuando frontend y panel consuman solo DTOs compartidos

### Decisiones cerradas en esta fase

- las rutas existentes se amplian; no se reemplazan
- los DTOs compartidos se exponen como capa anidada y se mantienen campos legacy de primer nivel donde ya habia consumidores
- `validate` sigue devolviendo `manual_completion_required` mientras no exista deteccion de empresa real en esa ruta
- `connect` y `status` ya exponen `governanceFlags` y `availableActions` aunque los modelos nuevos aun no gobiernen todo el sistema

### Compatibilidad temporal vigente

- `apps/holded` sigue necesitando identidad manual en `connect`
- `apps/app` sigue mezclando payload ampliado con campos legacy de plan y estado plano
- `companyNotificationEmailStore` sigue como fallback real
- `AccessRequest`, `ClaimCase` y `ConnectionRecipient` aun no tienen rutas operativas

### Riesgos abiertos

- la deteccion de empresa sigue siendo parcial y en `validate` aun no hay conflicto real ni empresa detectada fiable
- algunos tests de `apps/app` necesitan mocks virtuales para `@verifactu/integrations` porque el resolver de Jest del app no resuelve ese workspace package igual que runtime
- siguen existiendo consumidores potenciales de payload plano que aun no se han migrado

### Siguiente fase habilitada

- Fase API-2 - crear rutas nuevas y empezar a usar recipients, requests y claims en runtime

## Fase API-2 - Private runtime routes for recipients, requests, claims and memberships

- estado: completada
- fecha de cierre: 2026-04-11

### Objetivo de fase

Poner en funcionamiento real las tablas nuevas del conector dentro del runtime privado de `apps/app`, sin romper el modelo incremental ni duplicar servicios entre aplicaciones.

### Entregado

- nuevo servicio de dominio en:
  - `apps/app/lib/integrations/holdedGovernanceService.ts`
- rutas privadas nuevas implementadas:
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
- `apps/app/app/api/integrations/accounting/status/route.ts` actualizado para devolver resumenes reales:
  - `membershipsSummary`
  - `recipientsSummary`
  - `claimsSummary`
- semillas/fallbacks compatibles:
  - primer `ConnectionRecipient` derivado desde `companyNotificationEmailStore` cuando todavia no existan recipients reales
- reglas de guardado iniciales ya activas:
  - no eliminar el ultimo recipient obligatorio
  - no eliminar el ultimo `company_admin` del lado cliente
  - `underClaimReview` se recalcula desde estados abiertos de claim
- tests nuevos anadidos:
  - `apps/app/app/api/integrations/accounting/rotate-key/route.test.ts`
  - `apps/app/app/api/integrations/accounting/recipients/route.test.ts`
  - `apps/app/app/api/integrations/accounting/recipients/[id]/route.test.ts`
  - `apps/app/app/api/integrations/accounting/memberships/invite/route.test.ts`
  - `apps/app/app/api/integrations/accounting/memberships/[id]/route.test.ts`
  - `apps/app/app/api/integrations/accounting/access-requests/[id]/route.test.ts`
  - `apps/app/app/api/integrations/accounting/claims/route.test.ts`
  - `apps/app/app/api/integrations/accounting/claims/[id]/route.test.ts`
- verificaciones ejecutadas:
  - `pnpm --filter verifactu-app test -- --runInBand apps/app/app/api/integrations/accounting/status/route.test.ts apps/app/app/api/integrations/accounting/connect/route.test.ts apps/app/app/api/integrations/accounting/disconnect/route.test.ts apps/app/app/api/integrations/accounting/rotate-key/route.test.ts apps/app/app/api/integrations/accounting/recipients/route.test.ts apps/app/app/api/integrations/accounting/claims/route.test.ts apps/app/app/api/integrations/accounting/memberships/invite/route.test.ts apps/app/lib/integrations/holdedConnectionResolver.test.ts apps/app/lib/integrations/accountingStore.test.ts`
  - `pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/integrations/accounting/recipients/[id]/route.test.ts app/api/integrations/accounting/memberships/[id]/route.test.ts app/api/integrations/accounting/access-requests/[id]/route.test.ts app/api/integrations/accounting/claims/[id]/route.test.ts`
  - `pnpm --filter verifactu-app exec tsc --noEmit`

### Pendiente

- crear la capa publica equivalente en `apps/holded` para `access-requests` y `claims` cuando el onboarding la consuma
- introducir emails reales de invitacion/resolucion para memberships, access requests y claims
- endurecer restricciones cuando el backfill de recipients y memberships sea fiable

### Decisiones cerradas en esta fase

- `API-2` se cierra primero en el runtime privado de `apps/app`
- no se duplica todavia un servicio de gobernanza paralelo en `apps/holded`
- `companyNotificationEmailStore` pasa a ser semilla/fallback, no sistema principal
- las nuevas tablas ya tienen rutas operativas antes de tocar el frontend

### Compatibilidad temporal vigente

- el onboarding publico todavia no llama a rutas publicas nuevas de claims y access requests
- `companyNotificationEmailStore` sigue actuando como fallback si aun no existen recipients
- el workspace de `apps/app` sigue teniendo fallos de typecheck heredados en tests ajenos a `API-2`

### Riesgos abiertos

- falta completar la cara publica del flujo de conflictos y claims en `apps/holded`
- no hay todavia notificaciones reales para las nuevas operaciones privadas
- los bloqueos de gobernanza siguen siendo iniciales; aun no se activan todas las restricciones duras

### Siguiente fase habilitada

- Fase DATA-1 - backfill de recipients y normalizacion de datos para restricciones duras

## Fase DATA-1 - Backfill tooling for recipients and conservative governance normalization

- estado: completada
- fecha de cierre: 2026-04-12

### Objetivo de fase

Preparar el backfill real para que `ConnectionRecipient` y los flags de gobernanza dejen de depender solo de fallback runtime antes de activar restricciones duras.

### Entregado

- script operativo anadido:
  - `apps/app/scripts/backfill-holded-governance.mjs`
- comando disponible en:
  - `apps/app/package.json`
  - `pnpm --filter verifactu-app backfill:holded-governance`
- runbook tecnico:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_BACKFILL_RUNBOOK_2026.md`
- validacion de sintaxis ejecutada:
  - `node --check apps/app/scripts/backfill-holded-governance.mjs`
- comprobacion de migraciones y despliegue ejecutados contra la base configurada en `apps/app/.env.local`:
  - `pnpm --filter @verifactu/db exec prisma migrate status --schema=prisma/schema.prisma`
  - `pnpm --filter @verifactu/db run db:migrate:deploy -- --schema=prisma/schema.prisma`
- ejecucion real del backfill:
  - `pnpm --filter verifactu-app backfill:holded-governance -- --limit 25`
  - `pnpm --filter verifactu-app backfill:holded-governance -- --apply`
  - `pnpm --filter verifactu-app backfill:holded-governance --`
- resultado real del backfill:
  - `scanned = 10`
  - `updatedConnections = 10`
  - `seededRecipients = 7`
  - validacion posterior con `dry-run` final:
    - `updatedConnections = 0`
    - `seededRecipients = 0`

### Pendiente

- endurecer restricciones duras en runtime ahora que ya existe estado normalizado minimo
- revisar los tenants que siguen con `clientAdminGap = true` para decidir UX y bloqueos
- conectar panel y onboarding con los datos ya backfilleados

### Decisiones cerradas en esta fase

- el backfill se ejecuta desde `apps/app/scripts`
- el script queda en `dry-run` por defecto
- `companyNotificationEmailStore` se usa como fuente prioritaria de seed
- no se activan restricciones duras automaticamente al terminar el script
- antes del backfill se aplican migraciones pendientes reales sobre la base objetivo
- el cierre de fase exige una reejecucion final en `dry-run` sin cambios pendientes

### Compatibilidad temporal vigente

- `companyNotificationEmailStore` sigue siendo fallback runtime
- el frontend aun no depende de que el backfill se haya ejecutado
- las rutas publicas de `apps/holded` para claims y access requests siguen pendientes

### Riesgos abiertos

- la calidad de `Membership.side` historico puede dejar `clientAdminGap` conservadoramente alto
- algunos tenants quedaron sin recipient sembrado y con `technicalOperatorUserId = null`, lo que apunta a falta de datos historicos y posible revision manual
- sigue apareciendo el warning SSL de `pg`; no bloquea, pero conviene normalizar `sslmode` mas adelante

### Siguiente fase habilitada

- Fase GUARDS-1 - endurecer reglas de bloqueo y available actions con datos ya backfilleados

## Fase GUARDS-1 - Governance-aware blocking and available actions

- estado: completada
- fecha de cierre: 2026-04-12

### Objetivo de fase

Endurecer las reglas de bloqueo y `availableActions` usando los datos ya normalizados por `DATA-1`, antes de pasar a panel y onboarding final.

### Entregado

- `packages/integrations/holded/dtoMappers.ts` actualizado para:
  - bloquear `disconnect` cuando `underClaimReview = true`
  - bloquear `disconnect` cuando `highGovernanceRisk = true`
  - sugerir correccion hacia `manageMembers` o `manageRecipients` segun el riesgo activo
  - reflejar `clientAdminGap` y `highGovernanceRisk` en `availableActions`
- `apps/app/lib/integrations/holdedGovernanceService.ts` actualizado para propagar:
  - `clientAdminGap`
  - `highGovernanceRisk`
  - `underClaimReview`
    al calculo centralizado de `availableActions`
- rutas privadas ajustadas:
  - `apps/app/app/api/integrations/accounting/status/route.ts`
  - `apps/app/app/api/integrations/accounting/connect/route.ts`
  - `apps/app/app/api/integrations/accounting/disconnect/route.ts`
- rutas publicas ajustadas:
  - `apps/holded/app/api/holded/status/route.ts`
  - `apps/holded/app/api/holded/connect/route.ts`
- `disconnect` privado endurecido:
  - valida bloqueo antes de ejecutar la desconexion real
  - devuelve `409` con `governanceFlags` y `availableActions` si la accion esta bloqueada
- tests actualizados y pasando:
  - `apps/app/app/api/integrations/accounting/disconnect/route.test.ts`
  - `apps/app/app/api/integrations/accounting/status/route.test.ts`
  - `apps/app/app/api/integrations/accounting/connect/route.test.ts`
- verificaciones ejecutadas:
  - `pnpm --filter verifactu-app test -- --runInBand apps/app/app/api/integrations/accounting/disconnect/route.test.ts apps/app/app/api/integrations/accounting/status/route.test.ts`
  - `pnpm --filter verifactu-app test -- --runInBand apps/app/app/api/integrations/accounting/connect/route.test.ts`
  - `pnpm --filter @verifactu/integrations type-check`

### Pendiente

- endurecer mas restricciones operativas sobre memberships y recipients cuando la UX final este conectada
- exponer la misma semantica de bloqueo en el panel y onboarding final
- crear la cara publica de `access-requests` y `claims` en `apps/holded`

### Decisiones cerradas en esta fase

- `disconnect` no puede ejecutarse si hay una claim abierta en revision
- `disconnect` no puede ejecutarse si existe `highGovernanceRisk`
- el backend responde con el motivo y la siguiente accion sugerida en lugar de fallar de forma opaca
- `availableActions` pasa a ser la fuente canonica para bloquear o habilitar la accion de desconexion

### Compatibilidad temporal vigente

- `companyNotificationEmailStore` sigue siendo fallback runtime
- el frontend aun no consume todos los bloqueos desde UI dedicada
- `highGovernanceRisk` sigue siendo conservador y puede requerir revision manual en algunos tenants

### Riesgos abiertos

- faltan pantallas finales que conviertan estos bloqueos en UX visible de panel y onboarding
- la calidad de `Membership.side` historico puede seguir elevando `clientAdminGap` de forma conservadora
- aun no estan activas todas las restricciones duras de recipients y admins cliente como politica global

### Siguiente fase habilitada

- Fase UI-1 - integrar estados, bloqueos y available actions en onboarding y panel

## Fase UI-1 - Visible governance states in onboarding and panel

- estado: completada
- fecha de cierre: 2026-04-12

### Objetivo de fase

Hacer visibles en las pantallas reales del repo los estados tecnicos, banderas de gobernanza y bloqueos ya implementados en backend, sin rehacer las apps desde cero.

### Entregado

- nueva semantica visual compartida en:
  - `packages/integrations/holded/uiState.ts`
- exports actualizados en:
  - `packages/integrations/index.ts`
- onboarding publico refactorizado sobre la ruta existente:
  - `apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx`
  - `apps/holded/app/onboarding/holded/page.tsx`
- panel privado refactorizado sobre las rutas existentes:
  - `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`
  - `apps/app/app/dashboard/integrations/isaak-for-holded/connect/page.tsx`
- mejoras visuales activas:
  - badges de estado tecnico
  - badges de gobernanza
  - banners para `needs_reconnection`, `revoked_api`, `clientAdminGap`, `highGovernanceRisk`, `underClaimReview`
  - razon visible cuando una accion esta bloqueada
  - resumenes reales de usuarios, recipients y claims en el panel privado
  - onboarding publico con stepper visual, empresa detectada y consentimiento explicito
- tests actualizados y pasando:
  - `apps/holded/app/onboarding/holded/OnboardingHoldedClient.test.tsx`
- verificaciones ejecutadas:
  - `pnpm --filter verifactu-holded test -- --runInBand app/onboarding/holded/OnboardingHoldedClient.test.tsx`
  - `pnpm --filter verifactu-app test -- --runInBand apps/app/app/api/integrations/accounting/status/route.test.ts apps/app/app/api/integrations/accounting/connect/route.test.ts apps/app/app/api/integrations/accounting/disconnect/route.test.ts`
  - `pnpm --filter @verifactu/integrations type-check`

### Pendiente

- conectar el onboarding publico con las rutas publicas nuevas de `access-requests` y `claims`
- anadir gestion visual completa de memberships y recipients desde panel privado
- extraer componentes visuales reutilizables si el panel crece mas alla de estas pantallas

### Decisiones cerradas en esta fase

- la semantica visual compartida vive en `packages/integrations/holded/uiState.ts`
- no se ha creado una app nueva ni una ruta paralela; se refactorizan las pantallas reales ya existentes
- el panel privado muestra el motivo del bloqueo antes de intentar acciones sensibles
- el onboarding publico ya envia consentimiento explicito y refleja estados de gobernanza desde la misma experiencia

### Compatibilidad temporal vigente

- `apps/holded` sigue sin exponer aun las rutas publicas nuevas de claims y access requests
- el panel privado sigue siendo una composicion de pagina, no una libreria completa de componentes del conector
- la semantica visual usa helpers compartidos, pero no se ha movido todavia a `packages/ui`

### Riesgos abiertos

- la UX publica aun no resuelve el camino completo de `duplicate conflict` porque faltan rutas publicas operativas
- los type-check completos de `apps/app` y `apps/holded` siguen mostrando errores heredados en tests ajenos a `UI-1`
- el panel privado todavia no ofrece modales de gestion avanzada para memberships, recipients y claims

### Siguiente fase habilitada

- Fase PUBLIC-1 - exponer `access-requests` y `claims` en `apps/holded` y conectar el flujo publico de conflicto y reclamacion

## Fase PUBLIC-1 - Public duplicate conflict, access requests and claims

- estado: completada
- fecha de cierre: 2026-04-12

### Objetivo de fase

Completar la cara publica del conector en `apps/holded` para que el onboarding pueda detectar conflictos reales, solicitar acceso y abrir reclamaciones sin depender del runtime privado.

### Entregado

- nueva capa publica de gobernanza en:
  - `apps/holded/app/lib/holded-governance.ts`
- rutas publicas nuevas implementadas:
  - `apps/holded/app/api/holded/access-requests/route.ts`
  - `apps/holded/app/api/holded/claims/route.ts`
  - `apps/holded/app/api/holded/claims/[id]/route.ts`
- `apps/holded/app/api/holded/validate/route.ts` actualizado para devolver:
  - `detectedCompany`
  - `duplicateConflict`
  - `nextStep = duplicate_conflict`
- onboarding publico actualizado en:
  - `apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx`
    para:
  - mostrar empresa detectada
  - mostrar conflicto de conexion existente
  - permitir `Solicitar acceso`
  - permitir `Abrir reclamacion`
  - enviar consentimiento explicito y limpiar estado al cambiar la API key
- tests nuevos o ampliados y pasando:
  - `apps/holded/app/api/holded/validate/route.test.ts`
  - `apps/holded/app/api/holded/access-requests/route.test.ts`
  - `apps/holded/app/api/holded/claims/route.test.ts`
  - `apps/holded/app/onboarding/holded/OnboardingHoldedClient.test.tsx`
- verificaciones ejecutadas:
  - `pnpm --filter verifactu-holded test -- --runInBand app/api/holded/validate/route.test.ts app/api/holded/access-requests/route.test.ts app/api/holded/claims/route.test.ts app/api/holded/claims/[id]/route.test.ts app/onboarding/holded/OnboardingHoldedClient.test.tsx`
  - `pnpm --filter verifactu-holded exec tsc --noEmit`

### Pendiente

- anadir timeline o seguimiento visible de claim en UX publica si producto lo necesita
- cerrar la gestion visual avanzada de memberships, recipients y claims en panel privado
- introducir notificaciones reales para access requests y claims publicas

### Decisiones cerradas en esta fase

- `apps/holded` reutiliza una capa propia de gobernanza publica y no importa servicios privados de `apps/app`
- el conflicto publico se detecta reutilizando el fingerprint de la API key sobre `external_connections`
- el onboarding resuelve el caso de empresa ya conectada sin abrir rutas ni apps paralelas
- el flujo de conflicto queda dentro de la experiencia actual del onboarding

### Compatibilidad temporal vigente

- el onboarding publico sigue conviviendo con partes del formulario legado mientras se completa el rediseño total por pasos
- las nuevas operaciones publicas no envian aun emails reales de notificacion
- el seguimiento de claims publico existe como ruta, pero aun no tiene pantalla dedicada

### Riesgos abiertos

- la deteccion de conflicto por fingerprint es util pero no sustituye una deduplicacion funcional mas fuerte cuando se cierren todos los datos historicos
- el `type-check` global de las apps sigue teniendo ruido heredado ajeno al conector fuera de este bloque
- la UX publica de conflicto aun no cubre un seguimiento completo post-envio

### Siguiente fase habilitada

- Fase PANEL-1 - gestion visual avanzada de memberships, recipients y claims en `apps/app`

## Fase ADMIN-1 - Acceso admin preconfigurado al panel privado del conector

- estado: completada
- fecha de cierre: 2026-04-13

### Objetivo de fase

Dejar el panel privado del Conector Holded accesible solo para cuentas admin preconfiguradas, con compatibilidad entre la sesion real de `apps/app` y el callback de Google usado por superficies que consumen `packages/auth`.

### Entregado

- nueva allowlist compartida en:
  - `packages/utils/admin-access.ts`
- exports actualizados en:
  - `packages/utils/index.ts`
- `packages/auth/config/authOptions.ts` actualizado para:
  - permitir acceso Google a emails preconfigurados
  - eliminar la restriccion rigida de dominio y sustituirla por allowlist real
  - seguir soportando `GOOGLE_HOSTED_DOMAIN` como hint opcional
- nuevo helper de acceso del modulo en:
  - `apps/app/lib/holdedConnectorAdmin.ts`
- `apps/app/lib/adminAuth.ts` actualizado para reutilizar la misma allowlist compartida
- proteccion server-side del modulo privado en:
  - `apps/app/app/dashboard/integrations/isaak-for-holded/layout.tsx`
- feedback de acceso denegado en:
  - `apps/app/app/dashboard/integrations/page.tsx`
- configuracion documentada en:
  - `apps/app/.env.example`
  - `apps/app/README.md`
- tests nuevos y pasando:
  - `apps/app/lib/adminAuth.test.ts`
- verificaciones ejecutadas:
  - `pnpm --filter verifactu-app test -- --runInBand lib/adminAuth.test.ts`
  - `pnpm --filter @verifactu/auth type-check`

### Pendiente

- endurecer, si se decide, las rutas privadas `integrations/accounting/*` con la misma policy de allowlist y no solo el acceso al modulo visual
- anadir gestion visual avanzada de memberships, recipients y claims dentro del panel
- decidir si la cuenta Gmail preconfigurada debe quedarse con acceso admin permanente o migrarse despues a una cuenta corporativa

### Decisiones cerradas en esta fase

- la allowlist por defecto incluye `soporte@verifactu.business` y `kiabuasiness2025@gmail.com`
- se mantiene compatibilidad con aliases historicos `support@verifactu.business` y `kiabusiness2025@gmail.com`
- el panel privado del conector se protege por layout de servidor, sin abrir una app nueva
- `ADMIN_EMAILS` sigue ampliando la allowlist en lugar de sustituirla

### Compatibilidad temporal vigente

- la sesion principal de `apps/app` sigue siendo la cookie compartida del repo, no NextAuth
- `packages/auth` queda alineado para superficies que si usen Google OAuth directo
- la familia `integrations/accounting/*` sigue sin bloqueo admin global en todas sus rutas por compatibilidad operativa

### Riesgos abiertos

- el `type-check` global de `apps/app` sigue mostrando errores heredados en tests ajenos a esta fase
- la proteccion fuerte esta hoy en el acceso al modulo visual y en `adminAuth`, pero no se ha aplicado todavia a toda la familia de rutas del conector
- la coexistencia de cuentas corporativas y Gmail en allowlist requiere gobierno operativo claro

### Siguiente fase habilitada

- Fase PANEL-1 - gestion visual avanzada de memberships, recipients y claims en `apps/app`

## Fase PANEL-1 - Panel privado de gestion avanzada

- estado: completada
- fecha de cierre: 2026-04-13

### Objetivo de fase

Completar el panel privado real del conector en `apps/app` para que un admin autorizado pueda gestionar usuarios, solicitudes de acceso, recipients y claims desde la misma vista privada ya existente.

### Entregado

- panel privado refactorizado en:
  - `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`
- la vista ahora permite:
  - listar y editar `memberships`
  - invitar usuarios
  - resolver `access requests`
  - listar, crear, editar y eliminar `recipients`
  - listar `claims`
  - ver detalle y timeline de una claim
  - actualizar estado de claims desde la propia pantalla
- nuevo test de interfaz:
  - `apps/app/app/dashboard/integrations/isaak-for-holded/page.test.tsx`
- verificaciones ejecutadas:
  - `pnpm --filter verifactu-app test -- --runInBand app/dashboard/integrations/isaak-for-holded/page.test.tsx`
  - `pnpm --filter verifactu-app test -- --runInBand app/dashboard/integrations/isaak-for-holded/page.test.tsx app/api/integrations/accounting/claims/[id]/route.test.ts app/api/integrations/accounting/access-requests/[id]/route.test.ts app/api/integrations/accounting/recipients/[id]/route.test.ts app/api/integrations/accounting/memberships/[id]/route.test.ts`

### Pendiente

- anadir modales especificos para acciones sensibles si producto quiere bajar mas friccion controlada
- separar bloques del panel en componentes reutilizables si la vista sigue creciendo
- endurecer politicas admin tambien sobre todas las rutas privadas del conector si se decide

### Decisiones cerradas en esta fase

- no se crea un panel nuevo; se evoluciona la pagina privada existente
- la gestion avanzada se resuelve inicialmente en una sola pantalla operativa
- la vista usa las rutas privadas ya implementadas en `API-2`, sin crear otra capa frontend paralela
- claims y access requests se administran ya desde el panel real del conector

### Compatibilidad temporal vigente

- la vista sigue siendo una composicion de pagina, no una libreria propia de secciones del conector
- el type-check global de `apps/app` sigue teniendo ruido heredado en tests ajenos al panel
- las rutas privadas `integrations/accounting/*` siguen pudiendo endurecerse mas a nivel admin en una fase posterior

### Riesgos abiertos

- falta decidir si algunas acciones sensibles del panel requieren modales de confirmacion mas fuertes
- el `tsc --noEmit` completo de `apps/app` sigue fallando por tests legacy no relacionados:
  - `lib/integrations/accountingStore.test.ts`
  - `lib/integrations/channelIdentityStore.test.ts`
  - `lib/integrations/holdedConnectionResolver.test.ts`
  - `lib/isaak/runtimeContext.test.ts`
- si el panel sigue creciendo convendra extraer componentes para no concentrar demasiada logica en una sola pagina

### Siguiente fase habilitada

- Fase HARDEN-1 - endurecimiento final de rutas privadas, UX de acciones sensibles y limpieza de deuda de compatibilidad

## Fase HARDEN-1 - Guards admin y friccion en acciones sensibles

- estado: completada
- fecha de cierre: 2026-04-13

### Objetivo de fase

Endurecer el conector despues de `PANEL-1` para que las acciones privadas del dashboard queden protegidas por policy admin y las acciones sensibles tengan una friccion minima coherente con el riesgo.

### Entregado

- helpers de acceso admin ampliados en:
  - `apps/app/lib/holdedConnectorAdmin.ts`
- rutas privadas endurecidas del conector:
  - `apps/app/app/api/integrations/accounting/connect/route.ts`
  - `apps/app/app/api/integrations/accounting/disconnect/route.ts`
  - `apps/app/app/api/integrations/accounting/rotate-key/route.ts`
  - `apps/app/app/api/integrations/accounting/memberships/route.ts`
  - `apps/app/app/api/integrations/accounting/memberships/invite/route.ts`
  - `apps/app/app/api/integrations/accounting/memberships/[id]/route.ts`
  - `apps/app/app/api/integrations/accounting/recipients/route.ts`
  - `apps/app/app/api/integrations/accounting/recipients/[id]/route.ts`
  - `apps/app/app/api/integrations/accounting/access-requests/route.ts`
  - `apps/app/app/api/integrations/accounting/access-requests/[id]/route.ts`
  - `apps/app/app/api/integrations/accounting/claims/route.ts`
  - `apps/app/app/api/integrations/accounting/claims/[id]/route.ts`
- regla aplicada:
  - la superficie `dashboard` de gestion exige email admin allowlisted
  - el flujo `chatgpt` no se bloquea por esta policy
  - `status` sigue abierto como lectura compatible para no romper la pagina general de integraciones
- `disconnect` endurecido:
  - exige `reauthConfirmed = true`
  - sigue bloqueando por `underClaimReview` y `highGovernanceRisk`
- friccion minima de UX anadida en:
  - `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`
  - `apps/app/app/dashboard/integrations/page.tsx`
- la vista privada ahora pide confirmacion explicita antes de:
  - desconectar
  - eliminar usuarios
  - eliminar recipients
  - resolver access requests
  - aprobar o rechazar claims
- para cerrar una claim en aprobado/rechazado ahora se exigen notas de resolucion en UI
- tests actualizados y pasando:
  - `app/dashboard/integrations/isaak-for-holded/page.test.tsx`
  - `app/api/integrations/accounting/connect/route.test.ts`
  - `app/api/integrations/accounting/disconnect/route.test.ts`
  - `app/api/integrations/accounting/rotate-key/route.test.ts`
  - `app/api/integrations/accounting/memberships/invite/route.test.ts`
  - `app/api/integrations/accounting/recipients/route.test.ts`
  - `app/api/integrations/accounting/claims/route.test.ts`
  - `lib/adminAuth.test.ts`

### Pendiente

- decidir si `status` del dashboard debe endurecerse en una fase futura con una capa de lectura resumida no sensible
- limpiar deuda legacy de tests para recuperar `tsc --noEmit` completo del app

### Decisiones cerradas en esta fase

- la policy admin se aplica a gestion y mutacion privadas del dashboard, no al flujo `chatgpt`
- `status` se mantiene compatible para no romper la vista general de integraciones
- la confirmacion reforzada minima entra ya en la UI existente sin esperar a una libreria de modales
- `disconnect` queda alineado con el contrato que ya exigia confirmacion reforzada

### Compatibilidad temporal vigente

- el panel sigue siendo una sola pagina operativa, aunque ya usa piezas locales reutilizables para confirmaciones y estados vacios
- `tsc --noEmit` de `apps/app` sigue fallando por deuda heredada fuera del conector

### Riesgos abiertos

- el endurecimiento admin no cubre todavia todas las superficies no panel que puedan leer estado del conector
- el type-check global sigue fallando por problemas legacy no relacionados:
  - `lib/integrations/accountingStore.test.ts`
  - `lib/integrations/channelIdentityStore.test.ts`
  - `lib/integrations/holdedConnectionResolver.test.ts`
  - `lib/isaak/runtimeContext.test.ts`

### Siguiente fase habilitada

- Fase POLISH-1 - extraccion de componentes, modales propios y limpieza de deuda tecnica puntual

## Fase POLISH-1 - modales propios y extraccion local de componentes

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- sustituir confirmaciones nativas por modales propios en la superficie privada de integraciones
- extraer piezas locales reutilizables del dashboard sin rehacer la app existente
- dejar el panel listo para seguir endureciendo o limpiar deuda sin perder el flujo funcional

### Entregado

- componentes locales nuevos en:
  - `apps/app/app/dashboard/integrations/components/ConfirmActionModal.tsx`
  - `apps/app/app/dashboard/integrations/components/PanelEmptyState.tsx`
  - `apps/app/app/dashboard/integrations/components/PanelSectionCard.tsx`
- `window.confirm` eliminado en:
  - `apps/app/app/dashboard/integrations/page.tsx`
  - `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`
- el panel privado del conector ahora usa `ConfirmActionModal` para:
  - desconectar la empresa
  - eliminar usuarios
  - eliminar recipients
  - aprobar o rechazar access requests
  - aprobar o rechazar claims
  - pasar claims a revision
- el dashboard general de integraciones ahora usa tambien `ConfirmActionModal` antes de desconectar
- `PanelEmptyState` reutilizado para vacios del panel privado:
  - usuarios
  - solicitudes
  - recipients
  - claims
  - timeline de claim
- test del panel privado actualizado y pasando:
  - `app/dashboard/integrations/page.test.tsx`
  - `app/dashboard/integrations/isaak-for-holded/page.test.tsx`
- smoke tests de rutas sensibles siguen pasando:
  - `app/api/integrations/accounting/disconnect/route.test.ts`
  - `app/api/integrations/accounting/access-requests/[id]/route.test.ts`
  - `app/api/integrations/accounting/claims/[id]/route.test.ts`

### Pendiente

- extraer mas bloques del panel privado si se decide dividir la pagina en secciones dedicadas
- revisar si conviene extraer mas piezas del panel a una libreria compartida del dashboard

### Decisiones cerradas en esta fase

- no se crea un panel nuevo: se mejora la pagina existente
- el modal de confirmacion se implementa como componente local compartido sobre `Modal` de `@verifactu/ui`
- la extraccion se hace de forma incremental y local al dashboard, sin mover todavia todo el panel a una libreria compartida

### Compatibilidad temporal vigente

- `PanelSectionCard` queda disponible para la siguiente extraccion, pero el panel sigue mayoritariamente compuesto en una sola pagina
- la extraccion sigue siendo local a `apps/app/app/dashboard/integrations`

### Riesgos abiertos

- todavia queda acoplamiento alto en `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`
- la siguiente extraccion del panel debe mantener compatibilidad con las rutas ya estabilizadas

### Siguiente fase habilitada

- Fase CLEANUP-1 - saneamiento de deuda legacy y recuperacion del type-check global del app

## Fase CLEANUP-1 - saneamiento de tests legacy y recuperacion del type-check

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- recuperar el `tsc --noEmit` global de `apps/app`
- corregir deuda minima en tests legacy sin alterar el comportamiento del conector

### Entregado

- los tests legacy de stores/resolver ahora compilan como modulos aislados:
  - `apps/app/lib/integrations/accountingStore.test.ts`
  - `apps/app/lib/integrations/channelIdentityStore.test.ts`
  - `apps/app/lib/integrations/holdedConnectionResolver.test.ts`
- el mock de contexto en:
  - `apps/app/lib/isaak/runtimeContext.test.ts`
    ya no fuerza un tipo incompatible y mantiene el comportamiento esperado
- verificacion completada:
  - `pnpm --filter verifactu-app exec tsc --noEmit --pretty false`
  - `pnpm --filter verifactu-app test -- --runInBand lib/integrations/accountingStore.test.ts lib/integrations/channelIdentityStore.test.ts lib/integrations/holdedConnectionResolver.test.ts lib/isaak/runtimeContext.test.ts`

### Pendiente

- decidir si la siguiente fase entra a seguir extrayendo componentes del panel o a reforzar QA funcional end-to-end del conector

### Decisiones cerradas en esta fase

- la limpieza se limita a deuda de compilacion y tests, no a refactors de dominio
- no se toca logica productiva del conector para recuperar el type-check

### Compatibilidad temporal vigente

- el panel sigue apoyandose en componentes locales del dashboard
- las rutas y contratos del conector no cambian en esta fase

### Riesgos abiertos

- sigue existiendo acoplamiento alto en la pagina privada principal del conector
- todavia falta decidir si la siguiente prioridad es mas extraccion de UI o un bloque de QA/regresion

### Siguiente fase habilitada

- Fase QA-1 - verificacion integral del conector y cierre de pendientes funcionales

## Fase QA-1 - verificacion integral del conector

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- validar de forma transversal el conector ya implementado
- confirmar que onboarding publico, runtime privado, panel y contratos compartidos siguen coherentes
- cerrar la fase de construccion base con una matriz de checks real

### Entregado

- verificacion publica completada:
  - `pnpm --filter verifactu-holded test -- --runInBand app/api/holded/validate/route.test.ts app/api/holded/connect/route.test.ts app/api/holded/access-requests/route.test.ts app/api/holded/claims/route.test.ts app/onboarding/holded/OnboardingHoldedClient.test.tsx`
  - `pnpm --filter verifactu-holded test -- --runInBand --runTestsByPath app/api/holded/claims/[id]/route.test.ts`
  - `pnpm --filter verifactu-holded exec tsc --noEmit`
- verificacion privada completada:
  - `pnpm --filter verifactu-app test -- --runInBand app/dashboard/integrations/page.test.tsx app/dashboard/integrations/isaak-for-holded/page.test.tsx app/api/integrations/accounting/status/route.test.ts app/api/integrations/accounting/connect/route.test.ts app/api/integrations/accounting/disconnect/route.test.ts app/api/integrations/accounting/rotate-key/route.test.ts app/api/integrations/accounting/access-requests/[id]/route.test.ts app/api/integrations/accounting/claims/[id]/route.test.ts app/api/integrations/accounting/memberships/invite/route.test.ts app/api/integrations/accounting/recipients/route.test.ts`
  - `pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/integrations/accounting/access-requests/[id]/route.test.ts app/api/integrations/accounting/claims/[id]/route.test.ts app/api/integrations/accounting/memberships/[id]/route.test.ts app/api/integrations/accounting/recipients/[id]/route.test.ts`
  - `pnpm --filter verifactu-app exec tsc --noEmit`
- verificacion compartida completada:
  - `pnpm --filter @verifactu/integrations type-check`
- resultado:
  - no se han detectado regresiones funcionales en las rutas y vistas principales del conector
  - el type-check del `app` y del `holded` queda recuperado en la superficie trabajada

### Pendiente

- preparar un bloque final de hardening/release si se quiere dejar el conector listo para despliegue controlado
- decidir si la siguiente prioridad es extraer mas UI o cerrar checklist operativo de release

### Decisiones cerradas en esta fase

- la implementacion base del conector se considera estable en runtime y en tests de regresion principales
- las siguientes fases ya no necesitan ampliar modelo o contratos base salvo cambio de producto

### Compatibilidad temporal vigente

- siguen conviviendo componentes locales del dashboard con primitives compartidos
- la evolucion del panel sigue siendo incremental sobre las vistas existentes

### Riesgos abiertos

- aun puede merecer una fase especifica de checklist de despliegue, permisos y observabilidad antes de release
- el panel privado principal sigue siendo grande y podria beneficiarse de mas extraccion si se prioriza mantenibilidad

### Siguiente fase habilitada

- Fase RELEASE-1 - checklist de despliegue, observabilidad y cierre operativo

## Fase RELEASE-1 - checklist de despliegue y cierre operativo

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- dejar el conector listo para despliegue controlado
- fijar checklist operativo de entorno, smoke y observabilidad
- eliminar ejemplos inseguros de variables de entorno

### Entregado

- checklist de release creado en:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_RELEASE_CHECKLIST_2026.md`
- ejemplo de entorno publico para `apps/holded` creado en:
  - `apps/holded/.env.example`
- ejemplo de entorno de `apps/app` saneado:
  - se elimina la linea duplicada de `HOLDED_TEST_API_KEY` con valor inseguro en `apps/app/.env.example`
- referencias documentales actualizadas en:
  - `apps/app/README.md`
  - `apps/holded/README.md`
  - `docs/README.md`

### Pendiente

- ejecutar el checklist de release contra el entorno real de despliegue cuando toque salida controlada
- decidir si se anade una fase final de smoke manual post-deploy con evidencias

### Decisiones cerradas en esta fase

- no se cambian dominios ni rutas legales
- la release se apoya en checklist y saneamiento documental, no en nueva logica de runtime
- `apps/holded` debe tener ya su propio `.env.example` canonico

### Compatibilidad temporal vigente

- la operativa de despliegue sigue distribuida entre `apps/app`, `apps/holded` y docs de engineering
- el smoke post-deploy sigue siendo manual, no automatizado

### Riesgos abiertos

- falta ejecutar el checklist en el entorno real cuando se prepare release
- la observabilidad sigue dependiendo de revisar logs por ruta y `requestId`, no de un dashboard consolidado especifico

### Siguiente fase habilitada

- Fase POST-RELEASE-1 - smoke manual en entorno real y evidencias de salida

## Fase POST-RELEASE-1 - smoke manual y evidencias de salida

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- dejar preparada la salida operativa post-release del conector
- reutilizar los runners reales ya existentes para smoke de Holded
- fijar una plantilla unica de evidencias para no perder trazabilidad

### Entregado

- plantilla de evidencias creada en:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_POST_RELEASE_SMOKE_EVIDENCE_2026.md`
- referencias actualizadas en:
  - `docs/README.md`
  - `apps/app/README.md`
  - `apps/holded/README.md`
- decision operativa fijada:
  - el smoke post-release del conector debe apoyarse en `pnpm holded:demo:validate` y en el checklist de release ya creado
  - no se crea un runner paralelo nuevo

### Pendiente

- ejecutar el smoke manual con entorno real o tenant demo cuando se prepare la salida efectiva
- rellenar la plantilla de evidencias con request IDs y resultado real del despliegue

### Decisiones cerradas en esta fase

- se reutiliza `scripts/holded-full-smoke.mjs` y `scripts/holded-demo-regression.mjs`
- la evidencia post-release queda documentada en engineering, no dispersa en conversaciones o notas locales

### Compatibilidad temporal vigente

- el smoke post-release sigue siendo manual y guiado por docs
- no se automatiza todavia la captura de evidencias ni el archivado de request IDs

### Riesgos abiertos

- si no se ejecuta la plantilla de evidencias en cada salida real, se pierde trazabilidad operativa
- el smoke real sigue dependiendo de credenciales internas y tenant demo disponible

### Siguiente fase habilitada

- Fase HANDOFF-1 - cierre final de roadmap y backlog de mejoras posteriores

## Fase HANDOFF-1 - cierre final de roadmap y backlog posterior

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- cerrar formalmente el roadmap principal del conector
- dejar un documento unico de relevo para continuar sin depender de la conversacion
- fijar backlog posterior y siguiente punto operativo real

### Entregado

- documento de cierre y relevo creado en:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_HANDOFF_AND_BACKLOG_2026.md`
- referencias actualizadas en:
  - `docs/README.md`
  - `apps/app/README.md`
  - `apps/holded/README.md`
- correccion menor de enlace documental en `apps/holded/README.md`

### Pendiente

- ejecutar `POST-RELEASE` real con tenant demo o produccion cuando toque salida efectiva
- archivar evidencias reales por despliegue sensible
- priorizar backlog posterior segun operacion, observabilidad o mantenibilidad

### Decisiones cerradas en esta fase

- el roadmap principal del conector se considera cerrado
- el siguiente trabajo ya no es de construccion base, sino de operacion y mejora incremental
- la continuidad futura debe apoyarse en un documento de handoff y no en contexto conversacional

### Compatibilidad temporal vigente

- sigue vivo el fallback de `companyNotificationEmailStore`
- el smoke post-release sigue siendo manual
- parte del panel sigue concentrada en una pagina grande aunque funcional

### Riesgos abiertos

- si no se ejecuta la plantilla de evidencias en salidas reales, se pierde trazabilidad operativa
- sigue habiendo backlog deseable en observabilidad, notificaciones y mantenibilidad

### Siguiente fase habilitada

- Fase OPERATE-1 - ejecucion real post-release y archivo de evidencias

## Fase OPERATE-1 - ejecucion real del smoke y archivo de evidencias

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- ejecutar el smoke real reutilizando los runners ya existentes
- registrar una evidencia operativa real sin depender solo del checklist teorico
- dejar claro el alcance exacto del pase realizado

### Entregado

- evidencia rellenada en:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_POST_RELEASE_SMOKE_EVIDENCE_2026.md`
- ejecucion real completada:
  - `pnpm holded:demo:validate`
- checks tecnicos previos ejecutados y pasando:
  - `pnpm --filter verifactu-holded exec tsc --noEmit`
  - `pnpm --filter verifactu-app exec tsc --noEmit`
  - `pnpm --filter @verifactu/integrations type-check`
  - `pnpm holded:ci:contract`
- resultado real del smoke demo:
  - `105 passed`
  - `0 failed`
  - `105 total checks`

### Pendiente

- ejecutar smoke manual sobre dominios desplegados cuando haya salida real en `preview` o `production`
- registrar `requestId` reales del runtime publico y privado en esa salida

### Decisiones cerradas en esta fase

- el pase operativo ejecutado en esta fase se considera valido como regresion viva contra tenant demo
- no se sobredeclara validacion de dominios desplegados cuando esa parte no se ha ejecutado aun
- la evidencia post-release debe distinguir siempre entre:
  - smoke demo contra Holded real
  - smoke manual de dominios desplegados

### Compatibilidad temporal vigente

- la evidencia de dominios desplegados sigue pendiente hasta la siguiente salida efectiva
- la captura de evidencias sigue siendo manual y documental

### Riesgos abiertos

- si no se completa el smoke de dominios desplegados en la siguiente release real, quedara un hueco entre regresion demo y salida publica efectiva
- la trazabilidad por `requestId` del runtime sigue pendiente de esa salida real

### Siguiente fase habilitada

- Fase EVOLVE-1 - backlog posterior de observabilidad, notificaciones y mantenibilidad

## Fase EVOLVE-1 - plan ejecutable de la siguiente ola

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- convertir el backlog posterior en un plan ejecutable
- basarlo en piezas reutilizables reales del repo
- fijar el siguiente stream recomendado sin abrir otro roadmap desde cero

### Entregado

- plan de evolucion creado en:
  - `docs/engineering/HOLDED_DIRECT_CONNECTOR_EVOLUTION_PLAN_2026.md`
- referencias actualizadas en:
  - `docs/README.md`
  - `apps/app/README.md`
  - `apps/holded/README.md`

### Pendiente

- ejecutar los streams posteriores del plan:
  - `OBS-1`
  - `NOTIFY-1`
  - `OPERATE-2`
  - `PANEL-2`
  - `GUARDS-2`

### Decisiones cerradas en esta fase

- la siguiente ola no rediseña modelo ni contratos base
- se reutilizan:
  - `connectorObservability.ts`
  - servicios de email existentes
  - componentes locales del panel
  - runtime y rutas ya estabilizadas
- el siguiente stream recomendado es `OBS-1`

### Compatibilidad temporal vigente

- siguen vivas las compatibilidades ya documentadas en `HANDOFF-1`
- la evidencia de dominios desplegados sigue pendiente para una salida real

### Riesgos abiertos

- si se ataca notificacion o panel sin observabilidad previa, el diagnostico posterior sera mas caro
- el backlog posterior sigue siendo incremental y puede dispersarse si no se sigue el orden recomendado

### Siguiente fase habilitada

- Fase OBS-1 - observabilidad estructurada y trazabilidad uniforme por `requestId`

## Fase OBS-1 - observabilidad estructurada y trazabilidad uniforme por `requestId`

- Estado: completada
- Fecha de cierre: 2026-04-13

### Objetivo de fase

- unificar la trazabilidad del conector por `requestId`
- reutilizar una capa comun de observabilidad entre `apps/app` y `apps/holded`
- extender esa trazabilidad tambien a la superficie publica principal

### Entregado

- helper compartido anadido en:
  - `packages/integrations/holded/observability.ts`
- exports actualizados en:
  - `packages/integrations/index.ts`
- wrapper local de `apps/app` convertido en reexport:
  - `apps/app/lib/integrations/connectorObservability.ts`
- rutas publicas principales instrumentadas:
  - `apps/holded/app/api/holded/validate/route.ts`
  - `apps/holded/app/api/holded/status/route.ts`
  - `apps/holded/app/api/holded/connect/route.ts`
  - `apps/holded/app/api/holded/access-requests/route.ts`
  - `apps/holded/app/api/holded/claims/route.ts`
- rutas privadas principales instrumentadas:
  - `apps/app/app/api/integrations/accounting/status/route.ts`
  - `apps/app/app/api/integrations/accounting/validate/route.ts`
  - `apps/app/app/api/integrations/accounting/connect/route.ts`
  - `apps/app/app/api/integrations/accounting/disconnect/route.ts`
  - `apps/app/app/api/integrations/accounting/rotate-key/route.ts`
  - `apps/app/app/api/integrations/accounting/claims/route.ts`
- contratos publicos alineados para reflejar `requestId` en respuestas del conector:
  - `packages/integrations/holded/contracts.ts`

### Verificacion

- `pnpm --filter @verifactu/integrations type-check`
- `pnpm --filter verifactu-holded exec tsc --noEmit`
- `pnpm --filter verifactu-app exec tsc --noEmit`
- `pnpm --filter verifactu-holded test -- --runInBand app/api/holded/validate/route.test.ts app/api/holded/connect/route.test.ts app/api/holded/access-requests/route.test.ts app/api/holded/claims/route.test.ts`
- `pnpm --filter verifactu-app test -- --runInBand app/api/integrations/accounting/status/route.test.ts app/api/integrations/accounting/validate/route.test.ts app/api/integrations/accounting/connect/route.test.ts app/api/integrations/accounting/disconnect/route.test.ts app/api/integrations/accounting/rotate-key/route.test.ts app/api/integrations/accounting/claims/route.test.ts`

### Pendiente

- extender el mismo patron a rutas secundarias del conector si se consideran operativas para soporte
- consolidar consulta o vista operativa sobre esos logs en una fase posterior

### Decisiones cerradas en esta fase

- la observabilidad del conector se apoya en una pieza compartida de `packages/integrations`
- la superficie publica principal tambien emite `requestId`, no solo la privada
- el shape comun minimo de evento queda fijado con:
  - `requestId`
  - `tenantId`
  - `entryChannel`
  - `stage`
  - `outcome`
  - `error`

### Compatibilidad temporal vigente

- sigue habiendo rutas secundarias no instrumentadas con el nuevo helper comun
- la explotacion operativa de estos logs sigue siendo por consola y `requestId`, no por dashboard consolidado

### Riesgos abiertos

- sin una vista agregada posterior, el soporte sigue dependiendo de buscar por logs manualmente
- las respuestas publicas añaden `requestId`; cualquier consumidor que asuma shape exacto debe ignorar campos extra

### Siguiente fase habilitada

- Fase NOTIFY-1 - notificaciones reales para `access-requests` y `claims`

## Fase NOTIFY-1 - notificaciones reales para `access-requests` y `claims`

- Estado: completada
- Fecha de cierre: 2026-04-14

### Objetivo de fase

- avisar a los actores correctos cuando se crea o resuelve:
  - una `AccessRequest`
  - una `ClaimCase`
- dejar de devolver `notified: false` como placeholder fijo
- mantener las operaciones principales tolerantes a fallo de email

### Entregado

- plantillas compartidas anadidas en:
  - `packages/integrations/holded/governanceEmailTemplates.ts`
- exports actualizados en:
  - `packages/integrations/index.ts`
- helper privado de notificaciones anadido en:
  - `apps/app/lib/email/holdedGovernanceEmails.ts`
- helper publico de notificaciones anadido en:
  - `apps/holded/app/lib/communications/holded-governance-emails.ts`
- transporte reutilizable anadido en:
  - `apps/holded/app/lib/communications/holded-email-service.ts`
- rutas publicas conectadas a notificaciones reales:
  - `apps/holded/app/api/holded/access-requests/route.ts`
  - `apps/holded/app/api/holded/claims/route.ts`
- rutas privadas conectadas a notificaciones reales:
  - `apps/app/app/api/integrations/accounting/access-requests/[id]/route.ts`
  - `apps/app/app/api/integrations/accounting/claims/route.ts`
  - `apps/app/app/api/integrations/accounting/claims/[id]/route.ts`
- tests ampliados para cubrir exito y fallo de notificacion:
  - `apps/holded/app/api/holded/access-requests/route.test.ts`
  - `apps/holded/app/api/holded/claims/route.test.ts`
  - `apps/app/app/api/integrations/accounting/access-requests/[id]/route.test.ts`
  - `apps/app/app/api/integrations/accounting/claims/route.test.ts`
  - `apps/app/app/api/integrations/accounting/claims/[id]/route.test.ts`

### Verificacion

- `pnpm --filter @verifactu/integrations type-check`
- `pnpm --filter verifactu-holded exec tsc --noEmit`
- `pnpm --filter verifactu-app exec tsc --noEmit`
- `pnpm --filter verifactu-holded test -- --runInBand app/api/holded/access-requests/route.test.ts app/api/holded/claims/route.test.ts`
- `pnpm --filter verifactu-app test -- --runInBand app/api/integrations/accounting/claims/route.test.ts`
- `pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/integrations/accounting/access-requests/[id]/route.test.ts app/api/integrations/accounting/claims/[id]/route.test.ts`

### Pendiente

- ampliar notificaciones a `memberships` si producto decide operarlas tambien por correo
- introducir plantillas mas ricas o versionadas si soporte necesita mayor detalle operativo
- decidir si en una siguiente ola conviene enviar tambien avisos internos adicionales al resolver claims

### Decisiones cerradas en esta fase

- `notified` deja de ser un valor fijo en las rutas de requests y claims cubiertas
- el envio de email no bloquea la operacion principal
- las plantillas de contenido se centralizan en `packages/integrations`
- la resolucion de destinatarios sigue siendo local a cada app para no forzar un acoplamiento cruzado entre `apps/app` y `apps/holded`

### Compatibilidad temporal vigente

- solo se cubren notificaciones reales para `access-requests` y `claims`
- `memberships` y otros avisos operativos siguen dependiendo de fases posteriores si se priorizan

### Riesgos abiertos

- si el entorno no tiene configuradas correctamente las credenciales de Resend, `notified` devolvera `false` aunque la operacion de negocio se complete
- la politica de destinatarios es conservadora y puede ampliarse despues si soporte necesita routing mas fino

### Siguiente fase habilitada

- Punto recomendado de corte para `commit + push + pruebas reales`
- Fase OPERATE-2 - pruebas reales con verificacion manual de correos y flujo completo

## Fase NUEVA-OLA-P0.2 - Estado de identidad en la sesion temporal del conector

- Estado: completada
- Fecha de cierre: 2026-04-14

### Objetivo de fase

Extender el token de onboarding del conector para transportar estado de identidad verificada sin perderse entre pasos, permitiendo que el resto del flujo pueda leer ese estado sin depender del login clasico de producto.

### Entregado

- `HoldedOnboardingPayload` en `apps/app/lib/oauth/mcp.ts` extendido con:
  - `authMethod` (`unknown` | `google` | `email`)
  - `emailVerified`
  - `firstName`
  - `lastName`
  - `verifiedAt`
- `mintHoldedOnboardingToken` y `mintHoldedOnboardingTokenForSubject` actualizados para incluir todos los campos
- `mintHoldedEmailVerificationToken` anadido para el flujo de verificacion por codigo
- `verifyHoldedEmailVerificationToken` anadido para consumir el token de verificacion
- `HoldedOnboardingSession` en `apps/app/lib/integrations/holdedOnboardingSession.ts` expone los mismos campos
- `isVerifiedHoldedOnboardingIdentity` anadida como helper de acceso guardado
- `apps/app/app/api/onboarding/tenant/route.ts` conserva el estado de identidad al refrescar el token tras crear o reusar tenant

### Pendiente

- ninguno

### Decisiones cerradas en esta fase

- el token de onboarding es la unica fuente de verdad del estado de identidad dentro del flujo del conector
- el estado viaja cifrado en el JWT; no se almacena en cookie ni en session de producto
- `isVerifiedHoldedOnboardingIdentity` es el guard canonico para proteger pasos posteriores al correo

### Compatibilidad temporal vigente

- los consumidores que no envian `authMethod` reciben `unknown` por defecto
- el campo `emailVerified` llega a `false` si no esta en el payload

### Riesgos abiertos

- ninguno relevante en este punto

### Siguiente fase habilitada

- Fase NUEVA-OLA-P0.3 - pantalla de entrada de identidad del conector

## Fase NUEVA-OLA-P0.3 - Pantalla de entrada de identidad Google o Correo

- Estado: completada
- Fecha de cierre: 2026-04-14

### Objetivo de fase

Redisenar la pantalla de entrada del conector como una primera decision visible: `Google` o `Correo`. Google es opcional. No hay selector de tenant ni dashboard visible. El flujo sigue siendo del conector, no del producto principal.

### Entregado

- `apps/holded/app/auth/holded/page.tsx` redisanado para:
  - mostrar `authStep = 'choose'` como primera pantalla con opcion `Google` y `Correo`
  - el camino Google usa popup primero con fallback a redirect para entornos embebidos
  - el camino Email lleva a `authStep = 'email'` (login existente) o `authStep = 'register-account'` (registro)
  - texto de salida `Volver` sustituye al condicional anterior
  - badge de Holded visible en el formulario de email
- `apps/holded/app/api/auth/session/health/route.ts` anadido para health check de la sesion compartida
- hardening del flujo de redirect result de Google:
  - reintentos antes de fallar
  - integracion con App Check
  - limpieza de estado pendiente al detectar error definitivo

### Pendiente

- el camino Email sigue usando Firebase email/password; no usa aun el flujo de magic link

### Decisiones cerradas en esta fase

- `choose` es el estado inicial siempre salvo que el parametro `mode=register` fuerce `register-account`
- Google usa redirect como fallback real, no solo como ultimo recurso
- el health check de sesion es un endpoint propio de `apps/holded`, sin depender de `apps/app`

### Compatibilidad temporal vigente

- la ruta de login por correo con contrasena sigue activa para usuarios existentes
- el flag `NEXT_PUBLIC_HOLDED_ENABLE_GOOGLE_LOGIN` controla si Google aparece en pantalla

### Riesgos abiertos

- el email path usa contrasena en lugar de magic link; esto es el gap principal de P0.4

### Siguiente fase habilitada

- Fase NUEVA-OLA-P0.4 - verificacion obligatoria del correo manual con magic link

## Fase NUEVA-OLA-P0.4 - Verificacion de correo manual con magic link

- Estado: completada
- Fecha de cierre: 2026-04-15

### Objetivo de fase

Reemplazar el camino de email con contrasena por un flujo de magic link ligero: el usuario escribe su correo, recibe un enlace de un solo uso, lo abre y queda verificado sin contrasena. La via manual no puede continuar al wizard sin correo verificado.

### Entregado

- `apps/holded/app/lib/auth.ts` extendido con:
  - `sendMagicLinkEmail(email, returnUrl)` — llama a `sendSignInLinkToEmail` de Firebase y guarda email en localStorage
  - `detectMagicLinkInUrl()` — detecta si la URL actual contiene un magic link de Firebase
  - `getStoredMagicLinkEmail()` / `clearStoredMagicLinkEmail()` — gestion del email guardado
  - `consumeMagicLink(email, options)` — llama a `signInWithEmailLink`, limpia localStorage y minta session cookie
  - `MAGIC_LINK_EMAIL_KEY` exportada para tests
- `apps/holded/app/auth/holded/page.tsx` redisanado:
  - `AuthStep` reducido a `'choose' | 'magic-email' | 'magic-sent' | 'password'`
  - eliminados `'register-account'` y `'register-company'` del flujo publico
  - pantalla `'magic-email'`: solo campo de correo; envia magic link con URL de retorno preservando `source` y `next`
  - pantalla `'magic-sent'`: confirmacion con reenvio y cambio de correo
  - pantalla `'password'`: accesible via "Ya tengo contrasena" como fallback para cuentas existentes
  - deteccion automatica de magic link en URL al cargar la pagina; consume el enlace y activa la sesion
  - fallback a pantalla de correo si localStorage no tiene email almacenado al llegar por el link
- `apps/holded/.env.example` anotado: `holded.verifactu.business` debe estar en Firebase Authorized Domains para email link auth
- Nota operativa: el dominio debe anadirse en Firebase Console → Authentication → Settings → Authorized Domains

### Pendiente

- ninguno

### Decisiones cerradas en esta fase

- se usa Firebase Email Link Authentication en lugar de la API `identity/email/start` de `apps/app` para evitar dependencias cruzadas
- la URL de retorno del magic link apunta a la misma pagina de auth con `source` y `next` preservados
- el fallback de contrasena se mantiene como opcion oculta para cuentas existentes con contrasena

### Compatibilidad temporal vigente

- usuarios con cuenta de contrasena existente pueden usar "Ya tengo contrasena" como fallback
- el camino `register-account` / `register-company` fue eliminado; el registro nuevo es por magic link o Google

### Riesgos abiertos

- si el correo del magic link va a spam o tarda, el usuario puede quedarse esperando sin retorno visible
- el dominio de produccion debe estar en Firebase Authorized Domains antes de activar en produccion

### Siguiente fase habilitada

- Fase NUEVA-OLA-P0.5 - onboarding por pasos completo

## Fase NUEVA-OLA-P0.5 - Onboarding por pasos conversacionales

- Estado: completada
- Fecha de cierre: 2026-04-15

### Objetivo de fase

Un paso por tarea, sin friccion, con identidad como paso externo previo al wizard.

### Entregado

El wizard de `apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx` ya implementa la secuencia correcta del plan:

- Paso 0 (externo al wizard): pantalla de identidad en `apps/holded/app/auth/holded/page.tsx` — Google o correo verificado via magic link
- Paso 1 — `Tus datos`: nombre y apellidos (`contactFirstName`, `contactLastName`), correo y telefono opcionales
- Paso 2 — `Empresa`: nombre de empresa, CIF/NIF, razon social opcional
- Paso 3 — `Conexion`: API key de Holded con validacion y deteccion de duplicados
- Paso 4 — pantalla de exito: confirmacion personalizada con nombre de empresa detectada, animacion de exito, badges de modulos soportados

El `StepIndicator` muestra los pasos 1 a 3 con estados done/active/pending. El paso 4 es la pantalla final sin indicador de pasos.

La alineacion con el plan de 5 pasos es completa: identidad → nombre → empresa → API key → exito.

### Pendiente

- ninguno

### Decisiones cerradas en esta fase

- el wizard no necesito reestructuracion; ya implementaba la secuencia correcta
- la identidad pre-rellena en el wizard viene del `initialIdentity` que el server component lee de la sesion y la base de datos
- si el usuario entro por magic link su nombre puede llegar vacio (Firebase Email Link no almacena display name); el wizard step 1 sirve para que lo rellene

### Compatibilidad temporal vigente

- el wizard puede arrancar con `initialIdentity` vacio; el usuario rellena en los pasos

### Riesgos abiertos

- ninguno relevante

### Siguiente fase habilitada

- Fase NUEVA-OLA-P0.6 - politica de correos final

## Fase NUEVA-OLA-P0.6 - Politica de correos del conector directo

- Estado: completada
- Fecha de cierre: 2026-04-15

### Objetivo de fase

Paridad entre via Google y via manual. Sin correos de bienvenida antes de la conexion completada. Un unico correo final de bienvenida tras conexion exitosa, personalizado con nombre y empresa.

### Entregado

- `apps/holded/app/lib/auth.ts`: `SignInOptions` extendida con `source?: string`; todos los `mintSessionCookie` en `signInWithEmail`, `signInWithGoogle`, `consumeGoogleRedirectResult`, `signInWithMicrosoft`, `consumeMagicLink` propagan `source`
- `apps/holded/app/lib/serverSession.ts`: `MintSessionOptions` extendida con `source?: string`; `mintSessionCookie` adjunta `?source=...` al endpoint `/api/auth/session` cuando esta disponible
- `apps/holded/app/auth/holded/page.tsx`: `activateSessionAndRedirect` recibe `source` y lo pasa a `mintSessionCookie`; los tres call sites de `activateSessionAndRedirect` y los de `consumeMagicLink`, `consumeGoogleRedirectResult` y `signInWithEmail` propagan el `source` del URL param de la pagina
- `apps/holded/app/api/auth/session/route.ts`: `isConnectorFlow` detecta cuando el source indica flujo del conector (`chatgpt`, `connector`, `holded_onboarding`) y salta `sendVerifiedAccessEmails` para esas sesiones. El DB update de `emailVerified` y el registro de actividad siguen ocurriendo siempre
- `apps/holded/app/api/holded/connect/route.ts`: `sendHoldedConnectedCommunication` ya envia el correo final despues de `saveHoldedConnection` y `persistConnectionIdentity` — correcto, sin cambios necesarios
- todos los tests pasan (25/25)

### Paridad Google / manual verificada

- Google: email verificado en Firebase desde el inicio; `isConnectorFlow=true` suprime `sendVerifiedAccessEmails`; correo final al completar wizard
- Magic link: email verificado al consumir el link; `isConnectorFlow=true` suprime `sendVerifiedAccessEmails`; correo final al completar wizard
- Dashboard login (no conector): `isConnectorFlow=false`; `sendVerifiedAccessEmails` se envia normalmente al verificar el correo por primera vez

### Pendiente

- ninguno

### Decisiones cerradas en esta fase

- el `source` del URL param del auth page es la senal canonica de contexto de flujo; no se necesita otro mecanismo de tracking
- `isConnectorFlow` es conservador: solo suprime para fuentes que contienen `chatgpt`, `connector`, o empiezan por `holded_onboarding`
- el DB update de `emailVerified` ocurre siempre independientemente del flujo para mantener trazabilidad correcta

### Compatibilidad temporal vigente

- los usuarios de dashboard que no llegan por `source=holded_onboarding*` siguen recibiendo `sendVerifiedAccessEmails` como antes

### Riesgos abiertos

- si el `source` no se propaga correctamente en algun path no cubierto por tests, `isConnectorFlow` puede evaluarse como `false` y enviar emails no deseados; bajo riesgo dado que el check es permisivo

### Siguiente fase habilitada

- Fase NUEVA-OLA-P1.1 - reordenar OnboardingHoldedClient por estados claros

## Fase NUEVA-OLA-P1.1 - Estructura de estados del wizard

- Estado: completada
- Fecha de cierre: 2026-04-15

### Objetivo de fase

Verificar que `OnboardingHoldedClient` esta organizado como flujo por estados claros, sin estados mezclados y facil de extender.

### Verificado

`apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx` ya implementa la estructura correcta:

- `WizardStep = 1 | 2 | 3 | 4` — discreto y no solapable
- `phase = 'idle' | 'validating' | 'connecting' | 'connected'` — separado del step; solo transiciona dentro de step 3
- steps 1 y 2 son navegacion pura sin side effects
- step 3 tiene `handleSubmit` que maneja validacion + conexion con `setPhase` claro en cada rama
- step 4 es la pantalla de exito; `setStep(4)` ocurre al final del flujo de conexion exitosa
- `conflictWorking` / `conflictAction` solo tienen significado en step 3 con conflicto detectado

No se necesitaron cambios estructurales. El componente ya estaba organizado correctamente.

### Pendiente

- ninguno

### Decisiones cerradas en esta fase

- la separacion `step` (wizard) vs `phase` (async op) es suficiente para este wizard de 4 pasos
- no es necesario extraer sub-componentes por paso en esta fase; la legibilidad es acceptable

### Siguiente fase habilitada

- Fase NUEVA-OLA-P1.2 - revalidacion del retorno OAuth

## Fase NUEVA-OLA-P1.2 - Retorno OAuth con la nueva UX

- Estado: completada
- Fecha de cierre: 2026-04-15

### Objetivo de fase

Verificar que el flujo `authorize → onboarding → return` sigue funcionando correctamente con la nueva UX de magic link y la pantalla de identidad.

### Verificado

Flujo completo analizado:

1. ChatGPT → `app.verifactu.business/oauth/authorize?...`
2. App redirige a `holded.verifactu.business/onboarding/holded?source=holded_chatgpt_entry&channel=chatgpt&next=<authorize_url>&onboarding_token=...`
3. Onboarding page: sin sesion → redirige a `auth/holded?source=holded_onboarding_connect&next=/onboarding/holded?...`
4. Auth page: usuario elige magic link → `sendMagicLinkEmail(email, returnUrl)` donde `returnUrl = /auth/holded?source=holded_onboarding_connect&next=/onboarding/holded?...` (source y next preservados)
5. Usuario abre link → auth page detecta magic link → consume → `activateSessionAndRedirect` con `postLoginTarget = dashboard?source=holded_onboarding_connect&next=/onboarding/holded?...`
6. Dashboard page: sesion valida → `redirect(nextTarget)` = `/onboarding/holded?source=holded_chatgpt_entry&channel=chatgpt&next=<authorize_url>&onboarding_token=...`
7. Wizard completa → `window.location.assign(nextTarget)` = `<authorize_url>` original de ChatGPT
8. ChatGPT completa la conexion OAuth

Identico para Google: el redirect de Google devuelve a la auth page con los mismos params en URL; la cadena es la misma desde el paso 5.

`buildLocalHandoffTarget` en auth page construye el handoff correctamente. `resolveHoldedCompletionTarget` en onboarding devuelve el next sanitizado. No hay roturas.

### Pendiente

- prueba manual end-to-end en entorno con ChatGPT real

### Decisiones cerradas en esta fase

- la URL de retorno del magic link debe incluir `source` y `next` para que el handoff funcione; esto ya esta implementado en `magicLinkReturnUrl`

### Siguiente fase habilitada

- Fase NUEVA-OLA-P1.3 - QA multi-camino

## Fase NUEVA-OLA-P1.3 - Matriz de QA

- Estado: pendiente de pruebas manuales
- Fecha de inicio: 2026-04-15

### Objetivo de fase

Validar manualmente los casos minimos del flujo completo en entorno real.

### Casos a probar

| Caso                         | Descripcion                               | Resultado esperado                                                                   |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Google nuevo usuario         | Primer acceso via Google en flujo ChatGPT | Wizard sin datos, correo final despues de conexion, sin emails previos               |
| Google usuario existente     | Google con tenant ya creado               | Wizard pre-relleno, wizard completa, correo final                                    |
| Magic link nuevo usuario     | Primer acceso por correo, magic link      | Pantalla magic-sent, link en correo, wizard, correo final                            |
| Magic link usuario existente | Segundo acceso por correo conocido        | Flujo identico, wizard pre-relleno                                                   |
| Sin email guardado al volver | magic link consumed sin localStorage      | Pantalla magic-email con error, usuario escribe correo y reintenta                   |
| Desktop                      | Chrome, Safari, Firefox                   | Flujo completo sin errores                                                           |
| Mobile / webview             | ChatGPT en iOS o Android                  | Google puede fallar en webview (redirect preferido sobre popup); magic link funciona |
| Sin duplicados de correo     | Google nuevo usuario                      | Solo recibe correo final despues de conexion; sin correos de acceso previos          |
| Sin duplicados de correo     | Magic link nuevo usuario                  | Solo recibe correo final despues de conexion; sin correos de acceso previos          |

### Prerequisito operativo

- El dominio `holded.verifactu.business` debe estar en Firebase Console → Authentication → Settings → Authorized Domains antes de probar magic link en produccion

### Pendiente

- ejecucion de todos los casos anteriores en entorno real

## Plantilla de cierre para siguientes fases

Cada nueva fase debe anadir:

- estado
- fecha de cierre
- objetivo
- entregado
- pendiente
- decisiones cerradas
- compatibilidad temporal vigente
- riesgos abiertos
- siguiente fase habilitada
