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
