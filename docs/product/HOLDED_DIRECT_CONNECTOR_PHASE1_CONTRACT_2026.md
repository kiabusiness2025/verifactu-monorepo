# Holded Direct Connector - Fase 1 Contrato Publico 2026

## Objetivo

Definir el contrato publico canonico de la Fase 1 del conector directo `ChatGPT <-> Holded`.

Reglas base:

- la separacion sigue siendo publica, no de backend
- `apps/app` se mantiene como runtime real de MCP y OAuth
- no se abre otro servidor OAuth ni otro modelo de datos
- no se presenta Isaak como destino, marca o producto dentro del flujo publico del conector

Este documento sustituye el criterio anterior que mezclaba:

- conector directo Holded para ChatGPT
- onboarding Holded-first historico
- branding `Isaak for Holded`
- propuestas de producto mas amplias que no forman parte de esta Fase 1

## Estado a 2026-04-18

### Base entregada (roadmap principal cerrado 2026-04-13)

- branding publico del conector separado de Isaak en MCP y onboarding `channel=chatgpt`
- `connector onboarding session` propia con identidad completa (`authMethod`, `emailVerified`, `firstName`, `lastName`, `verifiedAt`)
- login explicito en `/auth/holded` al entrar desde ChatGPT para identificar usuario antes del onboarding
- login del conector por correo (y opcion Google cuando se habilita por configuracion)
- onboarding con activacion minima obligatoria `OAuth + API key`; datos de perfil/empresa como completado posterior
- retorno estable al OAuth original de ChatGPT
- persistencia channel-aware en `external_connections` con flags de gobernanza
- hardening de persistencia: fallback canónico al backend compartido cuando el almacenamiento local falla temporalmente
- panel admin operativo con gestión de memberships, recipients, claims y access requests
- observabilidad del flujo con `x-verifactu-request-id`
- backend de verificacion de correo por magic link (`identity/email/start`, `holded/verify`)

### Redefinicion vigente de Fase I

La Fase I vigente ya no se define como onboarding largo por pasos antes de producto.

Ahora se define asi:

- flujo base minimo: `OAuth -> API key -> ChatGPT`
- `/holded` como superficie publica canonica del conector
- `/app` solo como backend compartido
- sin presencia de Isaak en el contrato publico del conector
- correos operativos de connect/disconnect para usuario y admin
- panel admin con:
  - control de usuarios conectados / desconectados
  - sesiones activas
  - historial de conversaciones
- al desconectar:
  - se resetea la memoria activa y cualquier relacion operativa con el tenant Holded anterior
  - el historico sigue disponible en backend y consultable por admin

## Decision de producto

La Fase 1 publica se presenta como:

- un conector directo de Holded para ChatGPT
- una conexion guiada y ligera
- una experiencia centrada en terminar el OAuth y volver a ChatGPT
- una identidad minima y contenida dentro del propio flujo del conector

No se presenta como:

- onboarding de Isaak
- acceso al chat de Isaak
- alta comercial de un producto mayor
- handoff a dashboard como requisito para terminar la conexion

## Contrato visible actualizado

### Nombre y posicionamiento

El flujo publico debe hablar solo de:

- Holded
- ChatGPT
- Verifactu como capa tecnica si hace falta

No debe hablar de:

- Isaak
- `Isaak for Holded`
- dashboard de Isaak
- activar Isaak
- entrar al chat de Isaak

### Credenciales visibles permitidas

En esta Fase I el usuario puede ver solo lo estrictamente necesario:

- login / identidad del conector
- API key de Holded
- feedback corto de conexion

### Credenciales visibles no permitidas

El usuario no debe ver como paso publico obligatorio:

- `/login` clasico del producto
- `/signup` clasico del producto
- formulario visible de alta con contrasena como pieza principal del conector
- selector de tenant
- `tenant-switch`
- handoff obligatorio a dashboard para poder terminar la conexion

## Flujo visible objetivo

1. ChatGPT inicia OAuth contra el conector Holded.
2. El usuario pasa por login / identidad del conector si hace falta.
3. El usuario pega la API key de Holded.
4. Verifactu valida y guarda la conexion server-side (con fallback canónico al backend compartido si hay incidencia temporal de persistencia local).
5. Se dispara la notificacion operativa correspondiente.
6. El navegador vuelve al flujo OAuth original.
7. ChatGPT completa la conexion.

## Reglas de UX publica

- una sola tarea por pantalla
- tono claro, cercano y ligero; se permiten emojis si ayudan a reducir friccion
- nada de texto tecnico innecesario en la vista principal
- el bloque legal debe ser corto y de baja friccion
- el usuario no debe rellenar mas de lo necesario para completar identidad y conexion

## Datos visibles por fase

### Paso 1 - Identidad

Permitido:

- login del conector
- confirmacion de identidad minima

### Paso 2 - Holded

Campo publico objetivo:

- API key de Holded

### Paso 3 - Retorno

La UX final debe:

- confirmar brevemente que la conexion esta lista
- volver al callback OAuth sin meter al usuario en un producto distinto

## Contrato interno

Internamente sigue estando permitido:

- crear o resolver `User`
- crear o resolver `Tenant`
- crear `Membership`
- registrar `channel_identity`
- emitir sesion temporal del conector
- persistir trazabilidad legal y operacional
- registrar `usage_events` del conector para analitica de adopcion y futuras campanas

Eso forma parte del backend y no del contrato visible.

## Modelo recomendado de autenticacion publica

La Fase 1 debe seguir usando una `connector onboarding session` propia del flujo directo.

La diferencia respecto a la ola anterior es que esa sesion ya no solo transporta tenant y contexto OAuth, sino tambien estado de identidad.

### Estado minimo que debe viajar en la sesion temporal del conector

- `uid`
- `email`
- `name`
- `firstName`
- `lastName`
- `tenantId` cuando ya exista
- `authMethod` (`unknown`, `google`, `email`)
- `emailVerified`
- `verifiedAt` cuando aplique

## Politica de correos del flujo objetivo

### Conexion completada con exito

- enviar correo al usuario
- enviar correo / alerta al admin
- usar shell visual Holded + ChatGPT

### Desconexion completada

- enviar correo al usuario
- enviar correo / alerta al admin
- registrar el evento para trazabilidad

### Regla operativa

- las notificaciones deben existir en el flujo real del conector, no solo en una ruta interna paralela
- en `chatgpt`, el correo de conexion debe respetar el flujo `OAuth -> API -> ChatGPT`, sin empujar al usuario a otro producto

## Contrato admin de Fase I

El panel admin del conector debe permitir:

- ver usuarios conectados y desconectados por tenant
- ver sesiones activas
- ver historial de conversaciones
- revisar claims, requests, recipients y gobernanza

## Politica de desconexion de Fase I

Al desconectar:

- se corta la conexion Holded activa
- se corta la relacion operativa con el tenant anterior
- se resetea la memoria activa asociada
- se limpian sesiones persistidas del contexto afectado
- se conservan los historicos en backend solo para consulta admin

## Lo que se mantiene intacto

No se cambia en esta fase:

- `apps/app` como runtime real de MCP y OAuth
- `external_connections`, `channel_identities`, `memberships`, `tenants`, `users`
- cifrado server-side de la API key
- resolucion interna de tenant
- descriptor MCP, tools y resolver de conexion como backend compartido

## Exclusiones explicitas de Fase 1

No entra en esta fase:

- branding Isaak en pantallas publicas del conector
- selector de tenant visible
- dashboard obligatorio como paso del conector
- CTAs de compra, upgrade o checkout dentro del flujo revisado
- acceso web abierto o asesor universal
- Fase 2 de escritura estructurada ampliada fuera de este onboarding

## Frontera con productos futuros

### Fase 1

Conector directo Holded para ChatGPT con identidad ligera, verificacion contenida y onboarding por pasos.

### Fase 2

Ampliacion estructurada del mismo conector dentro del dominio Holded.

### Producto separado futuro

`Isaak Universal` o equivalente:

- producto distinto
- OAuth y contrato publico propios
- acceso a fuentes oficiales
- propuesta comercial propia

Regla:

- no usar el onboarding del conector directo como caballo de Troya para el producto universal

## Prioridad documental

Este documento manda sobre:

- docs historicos de `Isaak for Holded`
- copys o guias antiguas que sigan diciendo `sin Google visible` como regla permanente
- descripciones operativas que mezclen el flujo directo con el onboarding Holded-first completo
