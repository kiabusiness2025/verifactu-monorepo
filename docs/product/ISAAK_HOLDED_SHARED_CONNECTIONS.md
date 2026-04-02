# Isaak for Holded - Shared Connection Architecture

## Objetivo

Definir la arquitectura compartida para que una misma conexion Holded sirva para:

- la app interna actual en ChatGPT
- la futura app publica `Isaak for Holded`
- el dashboard de `verifactu.business`
- procesos internos de sync y auditoria

## Decision principal

Mantener una sola conexion Holded por organizacion o tenant usando API key de Holded guardada server-side.

La identidad del usuario se resuelve con OAuth o sesion de Verifactu.

Resumen:

- Holded: fuente externa autorizada por API key
- Isaak: cara visible y asistente fiscal-contable
- Verifactu: core de identidad, motor fiscal, sync y auditoria
- ChatGPT y dashboard: dos canales sobre el mismo core

## Mapa tecnico real hoy

La arquitectura ya no debe entenderse solo por dominios. Tambien hay una capa compartida de integracion y continuidad:

- `packages/integrations` -> logica comun de conexion Holded, diagnosticos, snapshot y continuidad compartida
- `apps/holded` -> onboarding publico Holded-first y captura de la API key
- `apps/app` -> runtime MCP/OAuth, metadata publica y resolucion final del acceso al conector
- `apps/isaak` -> producto principal que reutiliza la conexion y el contexto ya guardado

Regla operativa:

- si el cambio afecta a la conexion compartida, cifrado, snapshot o diagnostico, el primer sitio a revisar es `packages/integrations`
- si afecta a tools, scopes, OAuth o discovery MCP, el ownership real esta en `apps/app`
- si afecta a onboarding o handoff Holded-first, el cambio va en `apps/holded`
- si afecta a experiencia principal, historial o memoria de producto, el cambio va en `apps/isaak`

## Dos productos, un solo core

### 1. App interna actual en ChatGPT

No se elimina.

Nuevo rol:

- entorno interno de validacion
- laboratorio para MCP, tools, scopes y errores
- staging funcional del producto publico

### 2. App publica `Isaak for Holded`

Nuevo rol:

- entrada para usuarios que llegan desde Holded o ChatGPT
- onboarding ligero orientado a conectar Holded y empezar a usar Isaak
- generacion de base de usuarios potenciales para `verifactu.business`

### 3. Dashboard de `verifactu.business`

Nuevo rol:

- panel avanzado
- trazabilidad
- configuracion
- revision manual
- historico
- incidencias y sync

## Flujo recomendado

### Verifactu-first

1. El usuario entra en `verifactu.business`.
2. Conecta Holded desde integraciones.
3. Verifactu guarda la API key cifrada.
4. Isaak y el dashboard reutilizan esa misma conexion.
5. ChatGPT puede usarla mas tarde sin reconectar Holded.

### Holded-first

1. El usuario descubre `Isaak for Holded` en ChatGPT.
2. Se autentica con Isaak y Verifactu como capa de identidad.
3. Si aun no existe conexion Holded, se redirige a `/onboarding/holded`.
4. Aporta su API key de Holded en onboarding server-side.
5. Verifactu crea o vincula tenant, usuario interno e identidad de canal.
6. La misma conexion queda disponible despues en el dashboard.

## Lo que no haremos

- dos conexiones Holded separadas por canal
- dos motores de negocio distintos
- dos sistemas de auditoria distintos
- una app publica que reemplace la app interna actual

## Modelo objetivo

### Entidades existentes que reutilizamos

- `User`
- `Tenant`
- `Membership`
- `UserPreference`
- `TenantIntegration`
- `IntegrationMap`
- `SyncOutbox`
- `SyncConflict`
- `SyncLog`

### Nuevas entidades objetivo

#### `external_connections`

Una conexion compartida por proveedor y tenant.

Campos objetivo:

- `tenant_id`
- `provider`
- `channel_key`
- `provider_account_id`
- `credential_type`
- `api_key_enc`
- `scopes_granted`
- `connection_status`
- `connected_by_user_id`
- `connected_at`
- `last_validated_at`
- `last_sync_at`
- `legal_terms_accepted_at`
- `legal_privacy_accepted_at`
- `legal_acceptance_version`

#### `channel_identities`

Relaciona el mismo usuario con varios canales.

Campos objetivo:

- `user_id`
- `tenant_id`
- `channel_type`
- `channel_subject_id`
- `email`
- `display_name`
- `metadata`

#### `external_connection_audit_logs`

Auditoria operativa por canal.

Campos objetivo:

- `tenant_id`
- `user_id`
- `channel_type`
- `action`
- `resource_type`
- `resource_id`
- `status`
- `request_payload`
- `response_payload`

#### `external_sync_runs`

Jobs y ejecuciones de sincronizacion.

Campos objetivo:

- `tenant_id`
- `connection_id`
- `provider`
- `job_type`
- `status`
- `started_at`
- `finished_at`
- `result_summary`
- `error_message`

## Estrategia de transicion

### Fase 1

No romper nada.

- `TenantIntegration` sigue siendo la fuente operativa actual
- la app interna actual de ChatGPT sigue viva
- la nueva arquitectura se documenta y se prepara en paralelo

### Fase 2

Introducir el nuevo modelo compartido.

- crear `external_connections`
- crear `channel_identities`
- mantener compatibilidad con `TenantIntegration`
- migrar lectura de credenciales a un resolver comun

### Fase 3

Convergencia completa.

- dashboard y MCP usando el mismo resolver de conexion
- auditoria comun por canal
- onboarding `holded-first` y `verifactu-first` sobre el mismo backend

Estado:

- el onboarding `holded-first` inicial ya esta implementado
- la conexion Holded ya se guarda por canal (`dashboard` y `chatgpt`)
- la aceptacion de terminos y privacidad del flujo Holded ya se persiste en `external_connections`
- connect y disconnect ya disparan aviso al usuario y copia interna a `support@verifactu.business`
- siguiente foco: endurecer QA, branding publico y preparar submission

## Decision de producto

La marca visible para el usuario sera `Isaak`.

- `Isaak for Holded` = puerta de entrada para el ecosistema Holded
- `verifactu.business` = core y dashboard avanzado

Esto permite vender una experiencia ligera y conversacional sin duplicar tecnologia.
