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

## Estado a 2026-04-15

### Base entregada (roadmap principal cerrado 2026-04-13)

- branding publico del conector separado de Isaak en MCP y onboarding `channel=chatgpt`
- `connector onboarding session` propia para evitar login clasico visible, con estado de identidad completo (`authMethod`, `emailVerified`, `firstName`, `lastName`, `verifiedAt`)
- pantalla de entrada `Google` o `Correo` como primera decision visible del conector
- onboarding por pasos (datos, empresa, API key, exito) con stepper visual y conflicto/claims integrados
- retorno estable al OAuth original de ChatGPT
- persistencia channel-aware en `external_connections` con flags de gobernanza
- panel admin operativo con gestión de memberships, recipients, claims y access requests
- observabilidad del flujo con `x-verifactu-request-id`
- backend de verificacion de correo por magic link (`identity/email/start`, `holded/verify`)

### Nueva ola en progreso (abierta 2026-04-14)

Esta nueva ola de Fase 1 ya no se define como "API key primero" sino como:

- identidad ligera primero
- Google opcional o correo verificado
- onboarding por pasos cortos
- pantalla final de exito con tono amable
- email final de bienvenida despues de la conexion completa

## Decision de producto

La Fase 1 publica se presenta como:

- un conector directo de Holded para ChatGPT
- una conexion guiada y ligera
- una experiencia sin login clasico visible ni dashboard visible
- una identidad minima, verificada y contenida dentro del propio flujo del conector

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

En la Fase 1 actualizada el usuario si puede ver como parte publica del conector:

- `Continuar con Google`
- `Continuar con correo`
- una pantalla de verificacion de correo si elige la via manual

Eso no convierte el flujo en un login clasico de producto. Sigue siendo onboarding del conector.

### Credenciales visibles no permitidas

El usuario no debe ver como paso publico obligatorio:

- `/login` clasico del producto
- `/signup` clasico del producto
- formulario visible de alta con contrasena como pieza principal del conector
- selector de tenant
- `tenant-switch`
- handoff obligatorio a dashboard para poder terminar la conexion

## Flujo visible objetivo

1. ChatGPT inicia OAuth contra `app.verifactu.business`.
2. Si no existe conexion valida para el tenant/canal, Verifactu redirige al onboarding directo de Holded.
3. El usuario elige `Google` o `Correo` dentro del propio flujo del conector.
4. Si entra por correo, debe verificar ese correo antes de poder continuar.
5. Una vez verificada la identidad, el onboarding se resuelve por pantallas cortas:
   - nombre y apellidos
   - empresa y CIF/NIF
   - API key de Holded
6. Verifactu valida y guarda la conexion server-side.
7. Se muestra una pantalla final de exito, con tono amable y celebracion ligera.
8. Se envia un email final de bienvenida y primeros pasos.
9. El navegador vuelve al flujo OAuth original.
10. ChatGPT completa la conexion.

## Reglas de UX publica

- una sola tarea por pantalla
- tono claro, cercano y ligero; se permiten emojis si ayudan a reducir friccion
- nada de texto tecnico innecesario en la vista principal
- el bloque legal debe ser corto y de baja friccion
- el usuario no debe rellenar mas de lo necesario para completar identidad y conexion

## Datos visibles por fase

### Paso 1 - Identidad

Opciones visibles:

- Google opcional
- correo manual

Condicion:

- la via manual requiere verificacion de correo antes del resto del onboarding

### Paso 2 - Persona

Campos publicos objetivo:

- nombre
- apellidos

### Paso 3 - Empresa

Campos publicos objetivo:

- nombre de empresa
- CIF/NIF

Opcionales solo si de verdad son necesarios:

- razon social
- telefono

### Paso 4 - Holded

Campo publico objetivo:

- API key de Holded

### Paso 5 - Exito

La pantalla final debe:

- confirmar que la empresa ha quedado conectada
- nombrar al usuario y a la empresa cuando ya esten disponibles
- mostrar primeros pasos claros
- permitir una animacion ligera tipo confetti o serpentina

## Contrato interno

Internamente sigue estando permitido:

- crear o resolver `User`
- crear o resolver `Tenant`
- crear `Membership`
- registrar `channel_identity`
- emitir sesion temporal del conector
- persistir trazabilidad legal y operacional

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

### Via manual por correo

- enviar correo de verificacion
- no enviar aun el correo de bienvenida final

### Via Google

- no enviar correo de verificacion

### Conexion completada con exito

- enviar un unico correo final de bienvenida y primeros pasos
- personalizarlo con nombre y empresa conectada
- evitar duplicados de `welcome` antes de la conexion final

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
