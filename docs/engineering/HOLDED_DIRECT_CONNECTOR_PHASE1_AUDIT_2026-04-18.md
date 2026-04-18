# Holded Direct Connector - Phase I Audit 2026-04-18

## Objetivo

Reauditar el conector directo `ChatGPT <-> Holded` contra la definicion actual de **Fase I**:

- flujo base minimo: `OAuth -> API key -> ChatGPT`
- `/holded` como dominio publico del conector
- `/app` solo como backend compartido
- sin superficie publica ni naming de Isaak dentro del conector
- notificaciones operativas de connect/disconnect
- control admin de conexion, usuarios y trazabilidad
- al desconectar:
  - reset de memoria y relacion activa con el tenant Holded anterior
  - conservacion del historial en backend para consulta admin

Fecha de auditoria: `2026-04-18`

Actualizacion de estabilizacion: `2026-04-19`

- `POST /api/holded/connect` incorpora fallback canónico al backend compartido cuando falla la persistencia local por incidencias temporales de storage.
- si ambos caminos fallan, se mantiene respuesta controlada con motivo explicito `integration_storage_update_pending`.

## Resumen ejecutivo

Estado global de Fase I: **cumplida a nivel de implementacion y lista para smoke real**.

### Lo que ya queda cubierto

- dominio publico correcto del conector:
  - `https://holded.verifactu.business`
- URL MCP canonica:
  - `https://holded.verifactu.business/api/mcp/holded`
- flujo OAuth visible:
  - `OAuth -> API key -> ChatGPT`
- `/holded/oauth/authorize` ya funciona como proxy transparente al backend compartido
- el camino `channel=chatgpt` ya se ha recortado a:
  - login / identidad
  - API key
  - guardado de conexion
  - retorno OAuth
- existen emails reales de:
  - `connected`
  - `disconnected`
- existe panel admin con control de:
  - usuarios y tenants conectados
  - memberships
  - recipients
  - claims
  - access requests
  - logs e incidentes por `requestId`
  - sesiones activas
  - historial conversacional reciente
- al desconectar:
  - se corta la conexion
  - se limpian `channel identities`
  - se limpian `verified email identities`
  - se eliminan `sessions` persistidas del tenant
  - se eliminan `IsaakMemoryFact`
  - se conserva `IsaakConversation` como historico admin

### Lo que queda pendiente tras esta auditoria

- smoke real publico end-to-end
- validacion manual de correos connect/disconnect
- validacion manual del reset operativo y trazas admin en entorno publico

## Matriz de Fase I

| Requisito Fase I                                   | Estado                 | Evidencia principal                                                                                                                | Nota                                                     |
| -------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| OAuth -> API -> ChatGPT                            | `Cumplido`             | `apps/app/app/oauth/authorize/route.ts`, `apps/holded/app/oauth/authorize/route.ts`, `apps/holded/app/api/holded/connect/route.ts` | flujo reducido al MVP y proxy publico real               |
| `/holded` como cara publica del conector           | `Cumplido`             | `apps/holded/app/.well-known/*`, `apps/app/lib/oauth/mcp.ts`                                                                       | metadata y resource MCP ya apuntan a `/holded`           |
| Sin Isaak en la superficie publica del conector    | `Cumplido para Fase I` | limpieza reciente en `auth/holded`, `onboarding/holded`, `accounting.ts`                                                           | quedan aliases tecnicos internos, no visibles al usuario |
| Email al conectar al usuario                       | `Cumplido`             | `apps/holded/app/api/holded/connect/route.ts`, `apps/holded/app/lib/communications/holded-email-service.ts`                        | reactivado en el flujo publico `chatgpt`                 |
| Email al conectar al admin                         | `Cumplido`             | mismos archivos                                                                                                                    | reactivado en el flujo publico `chatgpt`                 |
| Email al desconectar al usuario                    | `Cumplido`             | `apps/app/app/api/integrations/accounting/disconnect/route.ts`                                                                     | se envia por lifecycle emails                            |
| Email al desconectar al admin                      | `Cumplido`             | `disconnect/route.ts`, `holdedSecurityAlerts.ts`                                                                                   | incluido en alertas/lifecycle                            |
| Plantilla Holded vs ChatGPT                        | `Cumplido`             | `apps/app/lib/email/holdedConnectionEmails.ts`, `apps/holded/app/lib/communications/holded-email-templates.ts`                     | shell visual coherente                                   |
| Control admin de usuarios conectados/desconectados | `Cumplido`             | `admin/user-tenants/route.ts`, panel Holded                                                                                        | vista global por tenant/membership/estado                |
| Control admin de sesiones activas                  | `Cumplido`             | `admin/traces/route.ts`, panel Holded                                                                                              | sesiones activas visibles                                |
| Historial de conversaciones desde Admin            | `Cumplido`             | `admin/traces/route.ts`, panel Holded                                                                                              | historial reciente visible                               |
| Reset de memoria al desconectar                    | `Cumplido para Fase I` | `disconnect/route.ts`, `holdedConnectorTraceService.ts`                                                                            | elimina `IsaakMemoryFact` del tenant                     |
| Reset de relacion activa con tenant al desconectar | `Cumplido para Fase I` | `disconnect/route.ts`, `holdedConnectorTraceService.ts`                                                                            | limpia canal, sessions persistidas y memoria operativa   |
| Conservar historial en backend para Admin          | `Cumplido`             | `IsaakConversation*`, panel Holded                                                                                                 | se conserva y se consulta desde admin                    |

## Hallazgos detallados

### 1. Flujo base `OAuth -> API key -> ChatGPT`

Estado: `cumplido`.

Evidencia:

- `apps/app/app/oauth/authorize/route.ts`
- `apps/holded/app/oauth/authorize/route.ts`
- `apps/holded/app/api/holded/connect/route.ts`
- `apps/holded/app/lib/holded-navigation.ts`

Observaciones:

- el `next` ya se canonicaliza a `/holded/oauth/authorize`
- `/holded/oauth/authorize` ya actua como proxy transparente al backend compartido
- el camino `chatgpt` en `connect` evita pasos extra de onboarding largo

### 2. Correos de connect/disconnect

Estado: `cumplido`.

Evidencia:

- `apps/holded/app/api/holded/connect/route.ts`
- `apps/holded/app/lib/communications/holded-email-service.ts`
- `apps/app/app/api/integrations/accounting/disconnect/route.ts`
- `apps/app/lib/email/holdedConnectionEmails.ts`

Conclusion:

- el connect publico `chatgpt` vuelve a emitir correos reales post-connect
- el disconnect mantiene correos desde el backend compartido

### 3. Control admin de usuarios conectados / desconectados

Estado: `cumplido`.

Evidencia:

- `apps/app/app/api/integrations/accounting/admin/user-tenants/route.ts`
- `apps/app/app/dashboard/integrations/holded/page.tsx`

### 4. Sesiones activas

Estado: `cumplido`.

Evidencia:

- `apps/app/app/api/integrations/accounting/admin/traces/route.ts`
- `apps/app/lib/integrations/holdedConnectorTraceService.ts`
- `apps/app/app/dashboard/integrations/holded/page.tsx`

### 5. Historial de conversaciones en Admin

Estado: `cumplido`.

Evidencia:

- `apps/app/app/api/integrations/accounting/admin/traces/route.ts`
- `apps/app/lib/integrations/holdedConnectorTraceService.ts`
- `apps/app/app/dashboard/integrations/holded/page.tsx`

### 6. Reset de memoria y relacion activa al desconectar

Estado: `cumplido para Fase I`.

Evidencia:

- `apps/app/app/api/integrations/accounting/disconnect/route.ts`
- `apps/app/lib/integrations/holdedConnectorTraceService.ts`

Conclusion:

- la relacion activa con la conexion Holded se corta
- la memoria operativa y las sesiones persistidas se resetean
- el historico conversacional se conserva para auditoria admin

## Decision recomendada

### Obligatorio antes de considerar Fase I publicada

1. smoke real publico end-to-end
2. validacion real de correos connect/disconnect
3. validacion manual de trazas admin y reset operativo

### Regla de conservacion aplicada

- no se borra historico duro por defecto
- se elimina memoria operativa reutilizable
- se conservan conversaciones como historico admin

## Siguiente bloque tecnico recomendado

`PHASE1-SMOKE-1`

Objetivo:

- validar en entorno publico que la Fase I ya se comporta como contrato minimo publicable

## Estado final de esta auditoria

- Fase I documentada de forma precisa: `cerrada a nivel de implementacion`
- MVP publico de conexion: `listo para smoke real`
- operacion admin avanzada: `cubrimiento suficiente para Fase I`
- reset fuerte de memoria/sesiones: `cumplido en alcance operativo de Fase I`
