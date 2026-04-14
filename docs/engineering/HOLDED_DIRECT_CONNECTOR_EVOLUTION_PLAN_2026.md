# Holded Direct Connector Evolution Plan 2026

Ultima actualizacion: 2026-04-13

## Objetivo

Convertir el backlog posterior del conector en un plan ejecutable y incremental, apoyado en piezas ya existentes del repo.

Este documento no abre un roadmap nuevo desde cero. Parte de:

- el runtime ya estable de `apps/app`
- el onboarding ya estable de `apps/holded`
- el modelo ya migrado sobre `ExternalConnection`
- la allowlist admin ya operativa
- el smoke demo real ya ejecutado

## Base reutilizable ya disponible

### Observabilidad

Ya existe:

- `apps/app/lib/integrations/connectorObservability.ts`
- `x-verifactu-request-id` ya expuesto por las rutas del conector
- `requestId` ya presente en contratos compartidos
- logs estructurados parciales en varias rutas del conector

Conclusión:

- no hace falta crear un subsistema nuevo
- la siguiente iteracion debe consolidar y homogeneizar

### Notificaciones

Ya existe:

- `apps/app/lib/email/emailService.ts`
- `apps/app/lib/email/holdedConnectionEmails.ts`
- `apps/app/lib/email/holdedSecurityAlerts.ts`
- `RESEND_API_KEY_HOLDED`
- `RESEND_FROM_HOLDED`
- correo propio del flujo Holded en `apps/holded/app/lib/communications/holded-email-service.ts`

Conclusión:

- no hace falta introducir otro proveedor de email
- la siguiente iteracion debe reutilizar Resend y los helpers existentes

### Panel privado

Ya existe:

- `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`
- `apps/app/app/dashboard/integrations/components/ConfirmActionModal.tsx`
- `apps/app/app/dashboard/integrations/components/PanelEmptyState.tsx`
- `apps/app/app/dashboard/integrations/components/PanelSectionCard.tsx`

Conclusión:

- la siguiente iteracion debe extraer secciones
- no conviene rehacer la UI entera

### Dominio de claims y access requests

Ya existe:

- `apps/app/lib/integrations/holdedGovernanceService.ts`
- rutas privadas y publicas de:
  - `claims`
  - `access-requests`
  - `memberships`
  - `recipients`

Conclusión:

- el siguiente trabajo es enriquecer operacion y trazabilidad
- no volver a tocar el modelo base salvo necesidad clara

## Streams recomendados

## OBS-1. Observabilidad estructurada del conector

Prioridad: alta

### Objetivo

- consolidar la trazabilidad por `requestId`
- unificar campos de logging en rutas publicas y privadas
- facilitar investigacion de incidencias sin leer cada ruta a mano

### Reutilizar

- `apps/app/lib/integrations/connectorObservability.ts`
- `requestId` ya generado por las rutas
- docs de release y smoke ya creados

### Refactorizar

- rutas publicas del conector en `apps/holded/app/api/holded/*`
- rutas privadas del conector en `apps/app/app/api/integrations/accounting/*`

### Crear

- helper comun de shape de evento:
  - `scope`
  - `requestId`
  - `tenantId`
  - `entryChannel`
  - `stage`
  - `outcome`
  - `error`

### Archivos candidatos

- `apps/app/lib/integrations/connectorObservability.ts`
- `apps/holded/app/api/holded/validate/route.ts`
- `apps/holded/app/api/holded/connect/route.ts`
- `apps/holded/app/api/holded/status/route.ts`
- `apps/app/app/api/integrations/accounting/status/route.ts`
- `apps/app/app/api/integrations/accounting/connect/route.ts`
- `apps/app/app/api/integrations/accounting/disconnect/route.ts`
- `apps/app/app/api/integrations/accounting/rotate-key/route.ts`
- `apps/app/app/api/integrations/accounting/claims/route.ts`

### Criterio de cierre

- logs consistentes por ruta principal
- `requestId` y `tenantId` trazables de forma uniforme
- checklist de release actualizado con la consulta operativa minima

## NOTIFY-1. Notificaciones reales de access requests y claims

Prioridad: alta

### Objetivo

- avisar a los actores correctos cuando se crea o resuelve:
  - una `AccessRequest`
  - una `ClaimCase`

### Reutilizar

- `apps/app/lib/email/emailService.ts`
- `apps/app/lib/email/holdedConnectionEmails.ts`
- `apps/app/lib/email/holdedSecurityAlerts.ts`
- recipients ya persistidos en `ConnectionRecipient`
- allowlist y emails admin ya presentes en entorno

### Refactorizar

- `apps/app/app/api/integrations/accounting/access-requests/[id]/route.ts`
- `apps/app/app/api/integrations/accounting/claims/route.ts`
- `apps/app/app/api/integrations/accounting/claims/[id]/route.ts`
- `apps/holded/app/api/holded/access-requests/route.ts`
- `apps/holded/app/api/holded/claims/route.ts`

### Crear

- helpers de destinatarios por evento
- templates ligeros para:
  - solicitud recibida
  - solicitud resuelta
  - claim abierta
  - claim resuelta

### Criterio de cierre

- `notified` deja de ser `false` fijo cuando el envio tiene exito
- errores de envio quedan logueados sin romper la operacion principal
- tests cubren exito y fallo de notificacion

## PANEL-2. Extraccion y mantenibilidad del panel

Prioridad: media

### Objetivo

- reducir el acoplamiento de la pagina privada del conector
- separar secciones funcionales sin mover el ownership fuera de `apps/app`

### Reutilizar

- `ConfirmActionModal`
- `PanelEmptyState`
- `PanelSectionCard`

### Refactorizar

- `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`

### Crear

- `HoldedMembersSection.tsx`
- `HoldedRecipientsSection.tsx`
- `HoldedAccessRequestsSection.tsx`
- `HoldedClaimsSection.tsx`
- `HoldedGovernanceSummary.tsx`

### Criterio de cierre

- la pagina principal pierde logica repetida
- cada seccion mantiene sus tests basicos
- la pantalla sigue sin romper rutas ni carga inicial

## GUARDS-2. Endurecimiento final de restricciones

Prioridad: media

### Objetivo

- revisar si ya se puede activar un nivel mas fuerte de proteccion operativa

### Reutilizar

- `availableActions`
- `governanceFlags`
- `holdedGovernanceService`
- datos del backfill ya ejecutado

### Refactorizar

- `apps/app/lib/integrations/holdedGovernanceService.ts`
- rutas privadas de mutacion del conector

### Posibles decisiones

- endurecer deduplicacion logica
- revisar si `status` privado necesita lectura resumida distinta
- bloquear aun mas mutaciones cuando exista claim abierta o riesgo alto

### Criterio de cierre

- las restricciones nuevas se activan solo si el dato es fiable
- se documenta cualquier guard rail nuevo en contratos y progreso

## OPERATE-2. Smoke desplegado y archivo continuo de evidencias

Prioridad: media

### Objetivo

- completar el hueco que sigue abierto:
  - smoke manual sobre dominios desplegados
  - archivo real de `requestId`

### Reutilizar

- `docs/engineering/HOLDED_DIRECT_CONNECTOR_POST_RELEASE_SMOKE_EVIDENCE_2026.md`
- `docs/engineering/HOLDED_DIRECT_CONNECTOR_RELEASE_CHECKLIST_2026.md`

### No crear

- no hace falta otro formato de evidencia
- no hace falta otro runner mientras el actual sirva

### Criterio de cierre

- al menos una evidencia real con:
  - `holded.verifactu.business`
  - `app.verifactu.business`
  - `requestId` de runtime

## Orden recomendado

1. `OBS-1`
2. `NOTIFY-1`
3. `OPERATE-2`
4. `PANEL-2`
5. `GUARDS-2`

## Criterio de priorizacion

Si la prioridad es:

- diagnostico y soporte: empezar por `OBS-1`
- operacion y comunicacion: seguir con `NOTIFY-1`
- release real: ejecutar `OPERATE-2`
- mantenibilidad interna: abordar `PANEL-2`
- endurecimiento de negocio: dejar `GUARDS-2` al final

## Estado

- backlog posterior ya identificado
- siguiente trabajo recomendado: `OBS-1`
- no hay necesidad de redisenar el modelo ni los contratos base
