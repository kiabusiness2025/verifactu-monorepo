# ISAAK Product Reorder Plan 2026

## Objetivo

Reordenar el monorepo para que `isaak.verifactu.business` sea el producto principal visible para el usuario final, mientras que `holded.verifactu.business` actua como canal de entrada y `verifactu.business` como plataforma madre y panel avanzado.

La regla es simple:

- un core comun
- varias superficies
- una identidad compartida

No queremos mantener tres productos separados. Queremos mantener un producto principal con varias entradas y varios niveles de complejidad.

## Decisiones de producto

### 1. `verifactu.business`

Debe quedarse como plataforma madre.

Responsabilidades:

- identidad legal
- panel cliente avanzado
- emision VeriFactu
- configuracion fiscal y contable compleja
- administracion de empresa
- billing avanzado
- backoffice cliente
- base canonica de usuarios, organizaciones, permisos y datos

### 2. `holded.verifactu.business`

Debe quedarse como canal de adquisicion y conexion para usuarios de Holded.

Responsabilidades:

- landing especifica Holded
- alta y login simples
- conexion Holded
- educacion inicial muy enfocada
- handoff a Isaak

No debe crecer como dashboard final.

### 3. `isaak.verifactu.business`

Debe ser el producto principal visible.

Responsabilidades:

- chat
- historial
- memoria
- onboarding conversacional
- soporte guiado
- configuraciones ligeras
- activacion y valor diario

## Regla de oro

No hacer tres productos. Hacer un core y tres capas.

Eso implica:

- una base de datos
- un modelo comun de usuario, tenant, roles y planes
- un sistema de sesion compartido
- un sistema comun de conexiones
- un sistema comun de chats, memoria y eventos

Encima de eso viven:

- `holded.verifactu.business`
- `isaak.verifactu.business`
- `verifactu.business`

## Estado actual del monorepo

### `apps/isaak`

Estado:

- ya contiene la experiencia conversacional publica
- ya tiene rutas de chat, demo, soporte y onboarding Holded
- ya consume sesion compartida, pero todavia a traves de helpers exportados desde `apps/holded`

Se queda:

- shell principal del producto
- experiencia de chat
- historial y memoria de cara al usuario
- configuracion ligera

Debe ganar:

- session helpers propios o compartidos
- acceso a conexiones Holded desde capa comun
- ownership completo del chat

### `apps/holded`

Estado:

- ya contiene el flujo de alta, verificacion y conexion Holded
- hoy arrastra parte del chat y del dashboard heredado

Se queda:

- landing Holded
- auth Holded-first
- onboarding de conexion Holded
- handoff a Isaak

Debe perder:

- dashboard final
- ownership del chat
- dependencia de largo plazo sobre UI del producto principal

### `apps/app`

Estado:

- es el core mas completo de datos y negocio
- Prisma schema ya contiene `Tenant`, `User`, `Membership`, `Subscription`, `TenantProfile`, `IsaakConversation`
- ya tiene configuracion, onboarding, facturacion, permisos y flows avanzados

Se queda:

- core canonico
- panel avanzado
- VeriFactu
- configuracion fiscal y contable
- billing y settings avanzados
- APIs internas canonicas

Debe convertirse explicitamente en:

- fuente de verdad de modelos
- fuente de verdad de reglas de acceso
- fuente de verdad de datos persistidos de Isaak

### `apps/admin`

Estado:

- ya es backoffice real
- soporte, auditoria y operaciones ya viven ahi
- usa NextAuth en vez del stack de sesion del resto

Se queda:

- backoffice
- soporte
- auditoria
- operaciones internas

Debe hacer:

- converger gradualmente con el modelo comun de sesion

### `apps/landing`

Estado:

- web publica general de `verifactu.business`
- tambien contiene auth y piezas de marketing que se solapan con Holded

Se queda:

- marketing general
- entrada corporativa

Debe evitar:

- competir con `isaak` como producto principal
- duplicar onboarding Holded

### `apps/client`

Estado:

- parece una superficie legacy o paralela a `apps/app`

Decision:

- congelar
- no construir producto nuevo aqui
- auditar dependencias y planificar archivo cuando deje de ser necesario

### `apps/mobile`

Estado:

- existe como Flutter independiente

Decision:

- congelar hasta estabilizar el core y la experiencia Isaak web

### `apps/api`

Estado:

- backend tecnico satelite

Decision:

- mantener como servicio interno
- no convertirlo en superficie de producto

## Arquitectura objetivo

### Core comun

Debe centralizar:

- auth
- session
- users
- tenants
- memberships
- roles
- billing
- holded connection
- chat persistence
- memory
- events
- audit

### Superficie 1: Holded

Dominio:

- `holded.verifactu.business`

Responsabilidad:

- captar
- activar
- conectar Holded
- explicar el valor
- enviar a Isaak

### Superficie 2: Isaak

Dominio:

- `isaak.verifactu.business`

Responsabilidad:

- producto principal
- chat
- historial
- memoria
- soporte guiado
- configuraciones ligeras

### Superficie 3: Verifactu

Dominio:

- `verifactu.business`
- y panel avanzado en `app.verifactu.business`

Responsabilidad:

- gestion avanzada
- VeriFactu
- configuracion compleja
- facturacion y administracion completas

## Riesgos actuales

### 1. Triple mantenimiento

Si `holded`, `isaak` y `app` siguen creciendo como dashboards paralelos, el coste de mantenimiento se dispara.

### 2. Dos stacks de auth

Hoy conviven:

- sesion custom con Firebase y cookies firmadas
- NextAuth en admin

Eso dificulta consolidar identidad unica.

### 3. Acoplamiento cruzado

Ahora mismo `isaak` reutiliza piezas de `holded`.

Eso sirve para ir rapido, pero no debe quedarse asi.

### 4. Lenguaje de producto incoherente

Si el usuario entra por Holded y luego aterriza en Isaak sin una narrativa consistente, siente que ha cambiado de producto.

## Principios de migracion

### Principio 1

No rehacer todo. Reordenar responsabilidades.

### Principio 2

No mover UX final a `holded`.

### Principio 3

El modelo canonico debe vivir en `apps/app` y en paquetes compartidos.

### Principio 4

`isaak` debe dejar de depender de imports desde `holded`.

### Principio 5

`holded` debe quedarse lo mas fino posible.

## Roadmap por fases

## Fase 1. Consolidar la experiencia principal

Objetivo:

- terminar `isaak /chat` como experiencia principal del usuario

Tareas:

- [ ] terminar la shell conversacional de `apps/isaak`
- [ ] estabilizar saludo, historial, onboarding ligero y CTA de resumen
- [ ] dejar claro el plan actual en UI
- [ ] mover cualquier acceso principal desde `holded` hacia `isaak /chat`
- [ ] eliminar lenguaje de dashboard tecnico en `holded`

Criterio de done:

- un usuario registrado en Holded llega a Isaak como destino principal sin confusion

## Fase 2. Desacoplar `isaak` de `holded`

Objetivo:

- que `isaak` no dependa de helpers internos de `holded`

Tareas:

- [ ] extraer helper de sesion comun a `packages/auth` o `packages/utils`
- [ ] extraer navegacion cross-domain comun
- [ ] extraer lectura de estado Holded
- [ ] extraer conectores y tipos de conexion Holded
- [ ] sustituir reexports desde `apps/holded` en `apps/isaak`

Criterio de done:

- `apps/isaak` no importa logica de `apps/holded`

## Fase 3. Declarar el core canonico

Objetivo:

- consolidar `apps/app` como fuente de verdad

Tareas:

- [ ] documentar oficialmente `apps/app/prisma/schema.prisma` como schema canonico
- [ ] alinear modelos usados por `holded` con `Tenant`, `TenantProfile`, `Membership`, `Subscription`
- [ ] revisar tablas legacy usadas por `holded`
- [ ] definir donde vive la conexion Holded canonicamente
- [ ] definir donde vive la memoria de Isaak canonicamente

Criterio de done:

- los modelos de negocio no dependen de interpretaciones distintas segun la app

## Fase 4. Unificar sesion e identidad

Objetivo:

- reducir la fragmentacion de auth

Tareas:

- [ ] inventariar usos de Firebase session custom
- [ ] inventariar usos de NextAuth en admin
- [ ] definir payload comun de sesion
- [ ] centralizar sign/verify de cookie
- [ ] mantener `SESSION_COOKIE_DOMAIN=.verifactu.business`
- [ ] definir estrategia de transicion para admin

Criterio de done:

- todas las superficies publicas pueden compartir sesion de forma predecible

## Fase 5. Reubicar settings y complejidad

Objetivo:

- que cada dominio muestre solo el nivel de complejidad que le corresponde

Tareas:

- [ ] dejar en `isaak` solo settings ligeros
- [ ] mover configuraciones complejas a `apps/app`
- [ ] dejar en `admin` auditoria, soporte y operaciones
- [ ] revisar CTAs entre `isaak` y `app`
- [ ] evitar que `holded` muestre settings avanzados

Criterio de done:

- el usuario no ve settings tecnicos en `isaak` ni producto final en `holded`

## Fase 6. Congelar legacy

Objetivo:

- detener el crecimiento de superficies redundantes

Tareas:

- [ ] marcar `apps/client` como congelado en documentacion
- [ ] revisar si `apps/client` sigue recibiendo trafico o dependencias
- [ ] preparar plan de archivo o migracion
- [ ] congelar `apps/mobile` hasta estabilizar el core web

Criterio de done:

- no se construyen features nuevas en apps legacy

## Backlog operativo por fases

Esta seccion convierte el plan en trabajo ejecutable.

Convenciones:

- `P1`, `P2`, `P3`... = fase
- `T1.1`, `T1.2`... = tarea dentro de la fase
- `bloquea` = no deberia empezar la siguiente tarea sin cerrar esta
- `puede ir en paralelo` = trabajo desacoplado

### Fase 1. Isaak como experiencia principal

Objetivo operativo:

- que la experiencia principal del usuario viva en `apps/isaak`
- que `apps/holded` solo conduzca a esa experiencia

#### Tareas

| ID   | Tarea                                                                              | Archivos/modulos a tocar                                                                                                                                                                            | Resultado esperado                                          | Dependencia |
| ---- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------- |
| T1.1 | Terminar la shell conversacional de `isaak /chat`                                  | `apps/isaak/app/chat/page.tsx`, `apps/isaak/app/chat/IsaakWorkspaceClient.tsx`, `apps/isaak/app/globals.css`                                                                                        | Chat principal estable, onboarding ligero y saludo final    | ninguna     |
| T1.2 | Mantener el historial y el arranque del chat dentro de `isaak`                     | `apps/isaak/app/api/holded/chat/route.ts`, `apps/isaak/app/api/holded/conversations/route.ts`, `apps/isaak/app/api/holded/conversations/[id]/route.ts`, `apps/isaak/app/api/holded/status/route.ts` | `isaak` funciona como workspace real, no como wrapper vacio | T1.1        |
| T1.3 | Reducir `holded` a handoff y onboarding                                            | `apps/holded/app/dashboard/page.tsx`, `apps/holded/app/lib/holded-navigation.ts`, `apps/holded/app/onboarding/**`, `apps/holded/app/auth/holded/page.tsx`                                           | `holded` deja de actuar como dashboard final                | T1.1        |
| T1.4 | Limpiar lenguaje y CTA para que el usuario entienda que Isaak es el producto final | `apps/holded/app/**/*`, `apps/isaak/app/**/*`                                                                                                                                                       | No hay copy contradictorio entre Holded e Isaak             | T1.3        |

#### Dependencias de fase

- T1.1 bloquea T1.2 y T1.3
- T1.4 depende de que T1.3 haya dejado claro el handoff

#### Done de fase

- `holded` registra, conecta y transfiere
- `isaak` conversa, recuerda y muestra valor
- no hay ningun CTA principal en `holded` que prometa un dashboard propio

### Fase 2. Desacoplar `isaak` de `holded`

Objetivo operativo:

- que `apps/isaak` deje de importar helpers internos desde `apps/holded`

#### Tareas

| ID   | Tarea                                     | Archivos origen                                                                                                                                                                                                                     | Destino recomendado                                                      | Dependencia               |
| ---- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| T2.1 | Extraer helper de sesion compartida       | `apps/holded/app/lib/session.ts`, `apps/holded/app/lib/serverSession.ts`, `apps/holded/app/lib/holded-session.ts`, `apps/isaak/app/lib/session.ts`, `apps/isaak/app/lib/holded-session.ts`, `apps/landing/app/lib/serverSession.ts` | `packages/auth/session-cookie.ts` o `packages/utils/session.ts` ampliado | T1 completa               |
| T2.2 | Extraer helper de navegacion cross-domain | `apps/holded/app/lib/holded-navigation.ts`                                                                                                                                                                                          | `packages/utils/navigation.ts` o `packages/auth/navigation.ts`           | T2.1 puede ir en paralelo |
| T2.3 | Extraer lectura de conexion Holded        | `apps/holded/app/lib/holded-integration.ts`, `apps/isaak/app/api/holded/status/route.ts`, `apps/isaak/app/api/holded/connect/route.ts`                                                                                              | `packages/integrations/holded/connection.ts`                             | T2.1                      |
| T2.4 | Extraer tipos de sesion y conexion        | `apps/holded/app/lib/session.ts`, `apps/holded/app/lib/holded-integration.ts`, `apps/isaak/app/chat/IsaakWorkspaceClient.tsx`                                                                                                       | `packages/auth/types.ts`, `packages/integrations/holded/types.ts`        | T2.1                      |
| T2.5 | Sustituir imports cruzados en `isaak`     | `apps/isaak/app/lib/holded-session.ts`, `apps/isaak/app/lib/session.ts`, `apps/isaak/app/api/holded/**`, `apps/isaak/app/chat/page.tsx`                                                                                             | imports solo desde `packages/*` o `apps/app`                             | T2.1, T2.3, T2.4          |

#### Dependencias de fase

- T2.1 es la base
- T2.3 y T2.4 dependen del shape de sesion de T2.1
- T2.5 no debe hacerse antes de cerrar T2.1 a T2.4

#### Done de fase

- `rg "from '../../../holded|from '@/app/lib/holded-session'" apps/isaak` no devuelve dependencias ilegales
- `isaak` puede compilarse sin necesitar codigo interno de `holded`

### Fase 3. Declarar el core canonico

Objetivo operativo:

- fijar donde viven los datos y las reglas canonicas

#### Tareas

| ID   | Tarea                                                                          | Archivos/modulos a revisar                                                                                                    | Resultado esperado                                                  | Dependencia |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------- |
| T3.1 | Declarar `apps/app/prisma/schema.prisma` como schema canonico                  | `apps/app/prisma/schema.prisma`, `README.md`, `docs/README.md`, `docs/product/*`                                              | Un solo schema de referencia                                        | T2 completa |
| T3.2 | Revisar modelo actual de conversaciones Isaak                                  | `apps/app/app/api/isaak/conversations/**`, `apps/app/prisma/schema.prisma`, `apps/isaak/app/api/holded/conversations/**`      | Decidir si `isaak` debe consumir directamente el core de `apps/app` | T3.1        |
| T3.3 | Revisar modelo de conexion Holded                                              | `apps/holded/app/lib/holded-integration.ts`, `apps/holded/HOLDED_CONNECTION_ARCHITECTURE.md`, `apps/app/prisma/schema.prisma` | Elegir entidad canonica para la conexion                            | T3.1        |
| T3.4 | Revisar si el snapshot/memory de Isaak vive en core o en modulo de integracion | `apps/holded/app/lib/holded-chat.ts`, `apps/isaak/app/api/holded/chat/route.ts`, `apps/app/app/api/mcp/holded/route.ts`       | Ownership claro de memoria y retrieval                              | T3.2, T3.3  |

#### Dependencias de fase

- T3.1 bloquea el resto
- T3.2 y T3.3 pueden ejecutarse en paralelo
- T3.4 depende de resolver T3.2 y T3.3

#### Done de fase

- existe una sola fuente de verdad para schema y ownership de datos
- conversaciones, conexiones y memoria no tienen ownership ambiguo

### Fase 4. Unificar sesion e identidad

Objetivo operativo:

- reducir fragmentacion entre auth custom y NextAuth

#### Tareas

| ID   | Tarea                                        | Archivos/modulos a revisar                                                                                                                                                  | Resultado esperado                                  | Dependencia |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------- |
| T4.1 | Inventario real de auth y sesion             | `apps/holded/app/lib/auth.ts`, `apps/landing/app/lib/auth.ts`, `apps/admin/lib/auth-options.ts`, `packages/auth/**`, `packages/utils/session.ts`, `apps/app/lib/session.ts` | Documento de flujos reales                          | T3 completa |
| T4.2 | Definir payload comun de sesion              | `packages/utils/session.ts`, `apps/holded/app/lib/session.ts`, `apps/app/lib/session.ts`                                                                                    | Contrato unico de sesion                            | T4.1        |
| T4.3 | Centralizar sign/verify de cookie compartida | `packages/utils/session.ts`, `packages/auth/**`, `apps/holded/app/lib/serverSession.ts`, `apps/landing/app/lib/serverSession.ts`                                            | Una implementacion comun de cookie                  | T4.2        |
| T4.4 | Diseñar la transicion de `admin`             | `apps/admin/lib/auth-options.ts`, `packages/auth/**`, `docs/ops/setup/*`                                                                                                    | Estrategia concreta para que admin no quede aislado | T4.1        |

#### Dependencias de fase

- T4.1 es obligatoria
- T4.2 bloquea T4.3
- T4.4 puede arrancar tras T4.1

#### Done de fase

- hay un payload comun de sesion documentado
- la cookie compartida no depende de implementaciones duplicadas
- existe una estrategia aprobada para admin

### Fase 5. Reubicar complejidad y settings

Objetivo operativo:

- que cada superficie tenga solo el nivel correcto de complejidad

#### Tareas

| ID   | Tarea                                                          | Archivos/modulos a revisar                                                                 | Resultado esperado                         | Dependencia               |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------- |
| T5.1 | Definir settings ligeros de Isaak                              | `apps/isaak/app/chat/IsaakWorkspaceClient.tsx`, futuras rutas `apps/isaak/app/settings/**` | Perfil, conexiones, plan y soporte basicos | T4 completa               |
| T5.2 | Confirmar settings avanzados en `app`                          | `apps/app/app/dashboard/settings/page.tsx`, `apps/app/app/dashboard/onboarding/page.tsx`   | `app` queda como panel avanzado            | T5.1 puede ir en paralelo |
| T5.3 | Limpiar `holded` de settings y paneles residuales              | `apps/holded/app/dashboard/**`, `apps/holded/app/onboarding/**`                            | Holded sin complejidad extra               | T5.1                      |
| T5.4 | Revisar rutas publicas de `landing` para no competir con Isaak | `apps/landing/app/**`, `apps/landing/README.md`                                            | Marketing general sin invadir producto     | T5.2                      |

#### Dependencias de fase

- T5.1 y T5.2 abren la fase
- T5.3 depende de tener claro T5.1
- T5.4 depende del mapa final de superficies

#### Done de fase

- `isaak` solo expone settings ligeros
- `app` es claramente el panel avanzado
- `holded` no contiene configuraciones complejas

### Fase 6. Congelar legacy

Objetivo operativo:

- evitar que crezcan superficies redundantes

#### Tareas

| ID   | Tarea                                                     | Archivos/modulos a revisar                             | Resultado esperado                         | Dependencia               |
| ---- | --------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | ------------------------- |
| T6.1 | Marcar `apps/client` como legacy en docs                  | `apps/client/README.md`, `README.md`, `docs/README.md` | Nadie construye features nuevas ahi        | T5 completa               |
| T6.2 | Inventariar dependencias reales de `apps/client`          | `apps/client/**`, pipelines de deploy, envs, dominios  | Saber si puede archivarse o reducirse      | T6.1                      |
| T6.3 | Congelar `apps/mobile` para roadmap posterior             | `apps/mobile/README.md`, `docs/README.md`              | Scope protegido                            | T6.1                      |
| T6.4 | Revisar si `apps/api` queda estable como backend satelite | `apps/api/**`, `docs/ops/deployment/*`                 | Confirmar que no es superficie de producto | T6.2 puede ir en paralelo |

#### Dependencias de fase

- T6.1 debe hacerse primero
- T6.2 define si el archivo de `client` es viable
- T6.4 puede ir en paralelo con T6.2

#### Done de fase

- `client` y `mobile` quedan explicitamente fuera del roadmap inmediato
- no entran nuevas features en superficies legacy

## Archivos y modulos a mover

Esta tabla resume el movimiento recomendado de ownership, no necesariamente un movimiento fisico inmediato.

| Modulo actual                        | Ubicacion actual                                                                                                  | Destino recomendado                                               | Motivo                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| Sesion cookie compartida             | `apps/holded/app/lib/session.ts`, `apps/holded/app/lib/serverSession.ts`, `apps/landing/app/lib/serverSession.ts` | `packages/auth` o `packages/utils/session.ts`                     | Evitar duplicacion y acoplamiento                  |
| Resolucion de sesion Holded          | `apps/holded/app/lib/holded-session.ts`                                                                           | `packages/auth/tenant-session.ts`                                 | `isaak` no debe depender de `holded`               |
| Navegacion cross-domain              | `apps/holded/app/lib/holded-navigation.ts`                                                                        | `packages/utils/navigation.ts`                                    | Compartir handoff y redirects                      |
| Conexion Holded                      | `apps/holded/app/lib/holded-integration.ts`                                                                       | `packages/integrations/holded/connection.ts`                      | Reutilizacion desde `holded`, `isaak` y `app`      |
| Chat Holded MVP                      | `apps/holded/app/lib/holded-chat.ts`                                                                              | dividir entre `packages/integrations/holded` y core de `apps/app` | Separar integracion de persistencia conversacional |
| API conversacional principal         | `apps/isaak/app/api/holded/chat/route.ts`                                                                         | mantenerse en `apps/isaak`, pero consumiendo core compartido      | `isaak` es el producto                             |
| Persistencia de conversaciones Isaak | `apps/app/app/api/isaak/conversations/**` y schema Prisma                                                         | `apps/app` como core canonico                                     | Ya existe ahi el modelo estructural correcto       |
| Auth admin                           | `apps/admin/lib/auth-options.ts`                                                                                  | mantener temporalmente, convergiendo luego a `packages/auth`      | Transicion controlada                              |

## Dependencias entre tareas

### Grafo simplificado

- Fase 1 debe quedar estable antes de extraer capas compartidas.
- Fase 2 es prerequisito tecnico de Fase 3 para evitar consolidar imports cruzados.
- Fase 3 define ownership de datos antes de tocar auth en serio.
- Fase 4 define la base de identidad comun.
- Fase 5 solo deberia completarse cuando ya exista una capa comun fiable.
- Fase 6 cierra el perimetro y evita deuda nueva.

### Dependencias criticas

| Tarea | Bloquea          | Motivo                                                           |
| ----- | ---------------- | ---------------------------------------------------------------- |
| T1.1  | T1.2, T1.3       | Sin experiencia principal estable no tiene sentido extraer capas |
| T2.1  | T2.3, T2.4, T2.5 | El contrato de sesion es la base                                 |
| T2.5  | T3 completa      | No se debe definir ownership final con imports cruzados vivos    |
| T3.1  | T3.2, T3.3, T3.4 | Hace falta una fuente de verdad declarada                        |
| T3.4  | T4               | La identidad comun debe saber que recursos protege               |
| T4.2  | T4.3             | No se centraliza cookie sin payload comun                        |
| T5.1  | T5.3             | No se limpia Holded hasta saber que queda en Isaak               |
| T6.1  | T6.2, T6.3       | Primero se congela, luego se racionaliza                         |

## Criterios de done por fase

### Done Fase 1

- el usuario sale de `holded` hacia `isaak` como flujo normal
- `isaak /chat` ya soporta saludo, historial y primer valor
- `holded` no comunica un dashboard final propio

### Done Fase 2

- no hay imports de `apps/isaak` hacia internals de `apps/holded`
- la sesion y navegacion compartidas viven en capa comun
- la conexion Holded puede leerse sin pasar por helpers privados de `holded`

### Done Fase 3

- el schema canonico esta declarado y documentado
- conversaciones, memoria y conexiones tienen ownership claro
- no hay modelos duplicados que compitan conceptualmente

### Done Fase 4

- existe un contrato de sesion comun
- la cookie compartida se firma y verifica desde una unica implementacion o una capa coordinada
- admin tiene plan de convergencia aprobado

### Done Fase 5

- `isaak` muestra solo settings ligeros
- `app` absorbe la complejidad avanzada
- `holded` queda enfocado en adquisicion y onboarding

### Done Fase 6

- `apps/client` queda oficialmente congelado
- `apps/mobile` sale del roadmap inmediato
- la deuda de superficies redundantes deja de crecer

## Backlog priorizado

### Sprint 1

- [ ] terminar `isaak /chat` como workspace principal
- [ ] garantizar handoff estable desde `holded`
- [ ] quitar a `holded` cualquier rol de dashboard final
- [ ] documentar `apps/client` como legacy

### Sprint 2

- [ ] extraer `session` comun
- [ ] extraer `holded connection status` comun
- [ ] mover helpers de navegacion a capa compartida
- [ ] eliminar imports cruzados `isaak <- holded`

### Sprint 3

- [ ] consolidar modelo canonico de integraciones Holded
- [ ] decidir si el chat persiste desde `apps/app` o desde paquete compartido
- [ ] unificar ownership de conversaciones y memoria

### Sprint 4

- [ ] disenar settings ligeros de `isaak`
- [ ] definir que settings avanzados quedan en `app`
- [ ] revisar rutas y entrypoints de `verifactu.business`

## Checklist tecnico

- [ ] `isaak` no importa codigo de `holded`
- [ ] `holded` no mantiene dashboard final
- [ ] `apps/app` se declara fuente de verdad del modelo
- [ ] existe helper comun de sesion
- [ ] existe helper comun de conexion Holded
- [ ] el historial de Isaak tiene ownership claro
- [ ] `apps/client` esta congelado
- [ ] `apps/mobile` queda fuera del roadmap inmediato
- [ ] `admin` mantiene backoffice y no compite con `isaak`

## Resultado esperado

Cuando este plan este bien ejecutado:

- el usuario entra por `holded.verifactu.business`
- se registra
- conecta Holded
- aterriza en `isaak.verifactu.business`
- usa Isaak como producto principal diario
- solo entra en `verifactu.business` o `app.verifactu.business` cuando necesita configuracion o operativa avanzada

## Siguiente paso recomendado

La siguiente implementacion de mayor retorno es:

- extraer `session`
- extraer `holded connection`
- seguir construyendo `isaak /chat`

Antes de mover mas UI, hay que fijar esas dos bases.
