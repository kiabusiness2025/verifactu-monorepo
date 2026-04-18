# Holded Direct Connector - Fase 1 Implementation Plan 2026

## Objetivo

Cerrar la Fase I vigente del conector directo `ChatGPT <-> Holded` con este alcance:

- flujo base minimo `OAuth -> API key -> ChatGPT`
- notificaciones reales de connect/disconnect para usuario y admin
- panel admin suficiente para operar el conector
- reset de memoria y relacion activa al desconectar
- conservacion del historico en backend para consulta admin

Documento complementario a:

- `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md`
- `docs/engineering/HOLDED_DIRECT_CONNECTOR_PHASE1_AUDIT_2026-04-18.md`

## Principios

- no se abre otro backend
- no se duplica OAuth
- `/holded` es la cara publica del conector
- `/app` se mantiene como backend compartido
- `/isaak` queda fuera del flujo publico del conector
- no se mezcla backlog de producto mayor con el MVP publicable

## Alcance vigente de Fase I

Incluido:

- simplificar el flujo publico al minimo operativo
- asegurar emails reales de connect/disconnect
- exponer control admin de usuarios conectados / desconectados
- exponer sesiones activas y trazabilidad conversacional
- resetear memoria activa y sesion operativa al desconectar

No incluido:

- asesor universal
- acceso web abierto
- ampliaciones grandes de tools MCP
- rediseño completo del producto conversacional
- Fase 2 de escritura estructurada ampliada

## Estado real al 2026-04-18

### Ya conseguido

- `/holded` como dominio publico del conector
- URL MCP canonica: `https://holded.verifactu.business/api/mcp/holded`
- metadata OAuth/MCP publica alineada al dominio Holded
- flujo publico `chatgpt` reducido a login + API key + callback OAuth
- panel admin con:
  - usuarios y tenants conectados
  - memberships
  - recipients
  - claims
  - access requests
  - observabilidad por `requestId`

### Parcial

- emails de connect/disconnect:
  - existen en backend compartido
  - disconnect ya los dispara
  - connect publico minimo no los garantiza todavia
- relacion operativa con tenant anterior:
  - se limpia conexion y channel identity
  - no se limpia todavia memoria conversacional ni sesiones persistidas

### Pendiente

- sesiones activas en panel admin
- historial de conversaciones en panel admin
- reset de `IsaakConversation`
- reset de `IsaakMemoryFact`
- invalidacion de `Session` activas del contexto afectado

## Backlog priorizado para cerrar Fase I

### P0.1 - Flujo publico minimo `OAuth -> API key -> ChatGPT`

Resultado esperado:

- el usuario no sale a otro producto
- la conexion termina en el callback OAuth de ChatGPT

Estado:

- casi cerrado

Pendiente:

- smoke real end-to-end

### P0.2 - Correos reales de connect/disconnect

Resultado esperado:

- usuario y admin reciben correos en connect y disconnect
- shell visual coherente Holded + ChatGPT

Estado:

- cumplido en Fase I

Resultado:

- `connect` publico `chatgpt` vuelve a emitir correo real post-connect
- `disconnect` mantiene correo a usuario y admin
- ambos caminos usan shell visual Holded + ChatGPT

### P0.3 - Admin operativo del conector

Resultado esperado:

- control de usuarios conectados / desconectados
- control de claims, requests, recipients y governance
- sesiones activas visibles
- historial de conversaciones visible

Estado:

- cumplido para Fase I

Resultado:

- panel admin ya muestra:
  - usuarios conectados / desconectados
  - sesiones activas
  - historial conversacional reciente
  - claims, requests, recipients y governance

### P0.4 - Reset fuerte al desconectar

Resultado esperado:

- se corta la conexion activa
- se corta la relacion operativa con el tenant anterior
- se resetea memoria activa
- se invalidan sesiones activas del contexto
- el historico sigue disponible en backend para admin

Estado:

- cumplido en su version operativa de Fase I

Resultado:

- se limpia conexion activa
- se limpian `channel identities`
- se limpian `verified email identities`
- se eliminan `sessions` persistidas de usuarios del tenant
- se eliminan `IsaakMemoryFact` del tenant
- las conversaciones se conservan como historico admin

### P0.5 - QA de cierre de Fase I

Casos minimos:

- OAuth -> login -> API key -> callback ChatGPT
- connect con correo a usuario y admin
- disconnect con correo a usuario y admin
- admin ve usuarios conectados / desconectados
- admin ve sesiones activas
- admin ve historial de conversaciones
- disconnect resetea memoria activa pero conserva historico en backend

Estado:

- pendiente

## Orden recomendado de ejecucion

1. smoke real publico del flujo ChatGPT
2. validacion manual de correos connect/disconnect
3. validacion admin de sesiones e historico
4. validacion post-disconnect de reset operativo
5. decisiones de endurecimiento para Fase II

## Riesgos

- considerar cerrada la Fase I sin sesiones activas ni historial admin
- mantener emails de connect solo en un camino interno y no en el flujo publico real
- cortar la conexion sin resetear memoria ni sesiones activas
- volver a contaminar el conector con supuestos de Isaak o producto mayor

## Criterio de exito de Fase I

- el usuario completa `OAuth -> API key -> ChatGPT` sin salir visualmente del dominio `/holded`
- connect y disconnect dejan correo a usuario y admin
- admin controla usuarios conectados/desconectados, sesiones e historial
- disconnect resetea memoria activa y sesiones persistidas del tenant afectado
- el historico permanece accesible desde backend/admin
