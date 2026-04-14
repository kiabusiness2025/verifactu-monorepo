# Holded Direct Connector Handoff and Backlog 2026

Ultima actualizacion: 2026-04-13

## Objetivo

Cerrar el roadmap principal del conector directo Holded con un documento unico de relevo que deje claro:

- que ya esta entregado
- que sigue abierto pero no bloquea salida
- que backlog posterior conviene abordar
- como retomar el trabajo sin perder contexto

## Estado final del roadmap principal

El roadmap principal del conector queda completado hasta:

- modelo de datos incremental sobre `ExternalConnection`
- runtime privado y publico alineados con DTOs compartidos
- panel admin operativo en `apps/app`
- onboarding publico operativo en `apps/holded`
- allowlist admin y acciones sensibles endurecidas
- QA tecnica y checklist de release cerrados
- smoke post-release preparado con plantilla de evidencias

## Entregado y vigente

### Datos y dominio

- `ExternalConnection` ampliada con flags de gobernanza
- `Membership` ampliada para lado cliente/asesoria y confirmacion
- tablas nuevas operativas:
  - `ConnectionRecipient`
  - `AccessRequest`
  - `ClaimCase`
  - `ClaimResolution`
- backfill conservador ejecutado

### Runtime y contratos

- contratos compartidos en `packages/integrations/holded/contracts.ts`
- mappers DTO y estado visual compartido
- rutas publicas existentes ampliadas
- rutas privadas nuevas para:
  - `rotate-key`
  - `memberships`
  - `recipients`
  - `access-requests`
  - `claims`

### Producto y superficies

- landing publica mantenida en `holded.verifactu.business`
- OAuth Google mantenido sin cambiar URLs legales
- panel admin real sobre `apps/app`
- onboarding publico real sobre `apps/holded`
- duplicate conflict y claims disponibles en onboarding

### Seguridad y operacion

- allowlist admin activa para:
  - `soporte@verifactu.business`
  - `kiabuasiness2025@gmail.com`
- compatibilidad mantenida con aliases internos historicos
- acciones sensibles endurecidas
- checklist de release y plantilla de smoke post-release documentados

## Documentos de entrada para retomar trabajo

Leer en este orden:

1. `docs/product/HOLDED_DIRECT_CONNECTOR_EXECUTION_PROGRESS_2026.md`
2. `docs/engineering/HOLDED_DIRECT_CONNECTOR_ENDPOINT_AND_CONTRACTS_2026.md`
3. `docs/engineering/HOLDED_DIRECT_CONNECTOR_RELEASE_CHECKLIST_2026.md`
4. `docs/engineering/HOLDED_DIRECT_CONNECTOR_POST_RELEASE_SMOKE_EVIDENCE_2026.md`
5. `apps/app/README.md`
6. `apps/holded/README.md`

## Invariantes que no se deben romper

- la landing publica del conector sigue siendo `holded.verifactu.business`
- no se cambian las URLs legales usadas por el flujo OAuth Google
- `apps/app` sigue siendo el runtime real del conector y del panel privado
- `apps/holded` sigue siendo la puerta de entrada publica
- el panel privado del conector sigue protegido por allowlist admin
- `ExternalConnection` sigue siendo el centro tecnico de la conexion

## Compatibilidad temporal que sigue viva

- `channelKey` sigue coexistiendo por compatibilidad
- `TenantIntegration` puede seguir coexistiendo en algunas lecturas legacy
- `companyNotificationEmailStore` sigue siendo fallback temporal
- parte del panel sigue compuesto en una pagina grande, aunque ya hay extraccion local de componentes
- el smoke post-release sigue siendo manual y guiado por documento

## Backlog posterior recomendado

### BL-1. Operacion real post-release

Prioridad: alta cuando haya salida real

- ejecutar la plantilla de evidencias en entorno `preview` o `production`
- registrar `requestId` reales de:
  - `validate`
  - `connect`
  - `status`
  - `disconnect`
  - `rotate-key`
  - `claims`
- dejar una evidencia archivada por despliegue sensible

### BL-2. Observabilidad especifica del conector

Prioridad: media

- dashboard o consulta unica para:
  - errores de `validate`
  - errores de `connect`
  - conflictos de claims
  - rechazos por allowlist
  - bloqueos de `disconnect`
- vista consolidada por `requestId` y `tenantId`

### BL-3. Notificaciones reales de gobernanza

Prioridad: media

- emails al crear `access requests`
- emails al resolver `access requests`
- emails al crear claims
- emails al resolver claims
- avisos internos de riesgo alto de gobernanza

### BL-4. Endurecimiento final de restricciones

Prioridad: media

- endurecer mas la deduplicacion logica si el dato sigue estable
- revisar si `status` privado debe protegerse con una lectura resumida menos sensible
- endurecer aun mas el bloqueo de acciones cuando exista claim abierta o gap critico

### BL-5. Mantenibilidad del panel

Prioridad: media-baja

- extraer secciones del panel privado a componentes dedicados
- reducir acoplamiento de `apps/app/app/dashboard/integrations/isaak-for-holded/page.tsx`
- unificar mas primitives de panel con `packages/ui` si compensa

### BL-6. Automatizacion de smoke

Prioridad: baja

- automatizar captura de evidencias
- guardar resultados de smoke en artefacto o doc semiautomatico
- evitar dependencia completa de registro manual

## Criterio para retomar el trabajo

Si el objetivo es:

- desplegar o validar salida: empezar por `POST_RELEASE_SMOKE_EVIDENCE`
- mejorar operacion interna: empezar por observabilidad y notificaciones
- mejorar mantenibilidad: empezar por extraccion del panel
- endurecer seguridad de negocio: empezar por restricciones y bloqueo fino

## Estado de cierre

- roadmap principal: cerrado
- release checklist: preparado
- smoke post-release: preparado, pendiente de ejecucion real
- backlog posterior: identificado y priorizado

## Siguiente fase sugerida fuera del roadmap principal

- `OPERATE-1 - ejecucion real post-release y archivo de evidencias`
