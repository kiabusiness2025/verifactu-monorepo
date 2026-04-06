# Holded Direct Connector - Fase 1 Contrato Publico 2026

## Objetivo

Definir el contrato publico canonico de la Fase 1 del conector directo `ChatGPT <-> Holded`.

Regla principal:

- la separacion es solo a nivel publico
- el backend compartido actual se mantiene
- no se abre otro runtime, otro modelo de datos ni otro OAuth server
- no se presenta Isaak como marca, paso o destino dentro del flujo publico de esta fase

Este documento sustituye el criterio disperso que hoy mezclaba:

- conector directo Holded para ChatGPT
- onboarding Holded-first historico
- branding `Isaak for Holded`
- roadmap futuro de `Isaak Universal`

## Estado de implementacion a 2026-04-06

Lo ya implementado en `apps/app` para esta fase:

- branding publico del conector separado de Isaak en MCP y onboarding `channel=chatgpt`
- flujo publico sin login visible mediante `connector onboarding session`
- formulario minimo directo con validacion de API key, creacion/resolucion interna de empresa y retorno a OAuth
- retorno OAuth estable para movil y escritorio sin exponer `tenant_id` como paso visible
- observabilidad del flujo con `x-verifactu-request-id` en `authorize`, `status`, `validate` y `connect`

Lo que se mantiene interno:

- mismo backend compartido
- mismo servidor OAuth
- mismo runtime MCP
- mismo modelo de datos y persistencia

## Decision de producto

La Fase 1 publica se presenta como:

- un conector directo de Holded para ChatGPT
- una conexion guiada por formulario y API key de Holded
- una experiencia sin login visible, sin Google OAuth visible y sin registro clasico visible

No se presenta como:

- onboarding de Isaak
- acceso al chat de Isaak
- handoff a dashboard o a `isaak.verifactu.business`
- alta comercial de un producto mayor

## Lo que se mantiene intacto

No se cambia en esta fase:

- `apps/app` como runtime real de MCP y OAuth
- `external_connections`, `channel_identities`, `memberships`, `tenants`, `users`
- cifrado server-side de la API key
- resolucion interna de tenant
- persistencia legal y trazabilidad
- descriptor MCP, tools y resolver de conexion como backend compartido

Regla tecnica:

- la identidad interna sigue existiendo
- simplemente deja de exponerse como login publico obligatorio del conector

## Contrato publico de Fase 1

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

### Flujo visible

Flujo publico objetivo:

1. ChatGPT inicia OAuth contra `app.verifactu.business`
2. si no existe conexion valida para el tenant/canal, Verifactu redirige a un onboarding directo de Holded
3. el usuario completa un formulario minimo
4. el usuario pega la API key de Holded
5. Verifactu valida y guarda la conexion server-side
6. Verifactu crea o resuelve internamente identidad, tenant y vinculacion
7. el navegador vuelve al flujo OAuth original
8. ChatGPT completa la conexion

### Credenciales visibles

En Fase 1 el usuario no debe ver como paso publico obligatorio:

- `Continuar con Google`
- `/login`
- `/signup`
- formulario de registro clasico
- selector de tenant
- `tenant-switch`

### Credenciales internas

Internamente si puede ocurrir:

- crear o resolver `User`
- crear o resolver `Tenant`
- crear `Membership`
- registrar `channel_identity`
- emitir sesion temporal del conector

Eso forma parte del backend y no del contrato visible.

## Modelo recomendado de autenticacion publica

### Recomendacion

La Fase 1 debe usar una `connector onboarding session` propia del flujo directo.

Eso implica:

- el usuario se identifica con un formulario minimo
- la identidad interna se materializa server-side
- la sesion que permite terminar onboarding no es una cuenta web clasica visible

### Campos minimos propuestos

Formulario publico:

- nombre
- email
- empresa
- API key de Holded
- aceptacion de terminos
- aceptacion de privacidad

Opcionales solo si hacen falta para persistencia de tenant:

- razon social
- NIF/CIF
- telefono

### Recuperacion y gestion

Como no hay login visible, debe existir un mecanismo ligero de recuperacion:

- enlace magico por email para gestionar la conexion
  o
- email de confirmacion con acceso de soporte/gestion

Esto evita que la Fase 1 quede como una sesion anonima sin control operativo.

## Exclusiones explicitas de Fase 1

No entra en esta fase:

- branding Isaak en pantallas publicas del conector
- Google OAuth visible
- registro clasico visible
- handoff a `isaak.verifactu.business`
- handoff a `/dashboard/isaak`
- CTAs de compra o upgrade
- acceso web abierto
- asesor universal
- Fase 2 de escritura estructurada ampliada

## Frontera entre Fase 1 y productos futuros

### Fase 1

Conector directo Holded para ChatGPT.

### Fase 2

Ampliacion estructurada del mismo conector dentro del dominio Holded:

- cuentas contables
- asientos
- otras escrituras por familias

### Producto separado futuro

`Isaak Universal` o equivalente:

- producto distinto
- OAuth y contrato publico propios
- acceso a fuentes oficiales
- propuesta comercial propia

Regla:

- no usar la submission del conector directo como caballo de Troya para el producto universal

## Cambios a implementar

### Bloque A - Contrato publico y branding

Cambios:

- sustituir referencias publicas a `Isaak for Holded` por el nombre del conector directo
- eliminar referencias a Isaak en onboarding `channel=chatgpt`
- separar copy de ChatGPT del copy heredado de `@/lib/isaak/persona`
- revisar descripciones MCP publicas para que hablen del conector directo y no de Isaak

Resultados esperados:

- el reviewer solo ve Holded, ChatGPT y Verifactu
- no hay contaminacion de marca Isaak en el flujo del conector

### Bloque B - Flujo sin login visible

Cambios:

- dejar de enviar al usuario a `/login` como paso publico del conector
- introducir una sesion temporal del onboarding del conector
- mover la captura de identidad minima al formulario del onboarding directo
- dejar la resolucion de `user/tenant/membership` en backend tras la validacion

Resultados esperados:

- el flujo parece directo
- el backend sigue manteniendo ownership y auditoria

### Bloque C - Onboarding directo

Cambios:

- crear una variante canonica `holded-direct` del onboarding
- quitar fallbacks visuales a `/dashboard/isaak`
- quitar mensajes de “activar Isaak”
- mantener solo copy de conexion Holded y vuelta a ChatGPT

Resultados esperados:

- misma logica backend
- experiencia publica limpia y coherente

### Bloque D - OAuth del conector

Cambios:

- mantener OAuth de Verifactu como esta
- no implementar OAuth contra Holded
- hacer que `authorize` y el retorno al flujo original dependan de la sesion temporal del conector o de la identidad interna ya resuelta

Resultados esperados:

- ChatGPT sigue hablando con el mismo OAuth server
- desaparece el paso publico de autenticacion clasica

### Bloque E - Persistencia y tenant

Cambios:

- mantener `external_connections` como fuente de verdad del canal `chatgpt`
- mantener `channel_identities`
- mantener resolucion interna de tenant
- evitar exponer `tenant-switch` o conceptos de dashboard en UI publica

Resultados esperados:

- cero cambio de arquitectura de backend
- separacion solo de superficie publica

### Bloque F - Emails y soporte

Cambios:

- revisar emails al usuario para que no prometan Isaak dentro del flujo del conector
- mantener notificaciones internas a soporte
- introducir email de recuperacion/gestion si se adopta el modelo sin login visible

### Bloque G - Documentacion

Cambios:

- marcar como legacy parcial la documentacion que use `Isaak for Holded` como contrato publico de Fase 1
- mantenerla como referencia historica o de backend compartido
- crear una sola fuente de verdad para el contrato visible del conector directo

## Cambios concretos por capa

### `apps/app` - publico

Tocar:

- onboarding `/onboarding/holded`
- loading del onboarding
- descriptor MCP publico
- nombre visible del conector
- descripciones publicas de tools donde aparezca Isaak
- redirects y fallbacks visuales

No tocar de inicio:

- modelo de datos
- core OAuth
- resolvers y stores salvo lo minimo para soportar la sesion temporal del conector

### `apps/app` - backend interno

Mantener:

- `external_connections`
- `channel_identities`
- OAuth server
- `api/mcp/holded`
- resolucion de tenant
- cifrado de credenciales

### `apps/holded`

Revisar solo si sigue actuando como fuente documental o de captacion.

Regla:

- si la Fase 1 visible ya no es `Isaak for Holded`, la documentacion de `apps/holded` no puede seguir siendo la referencia canonica del conector directo publico

## Archivos que probablemente cambiaremos

### Contrato y copy publico

- `apps/app/app/onboarding/holded/HoldedOnboardingClient.tsx`
- `apps/app/app/onboarding/holded/loading.tsx`
- `apps/app/app/onboarding/holded/page.tsx`
- `apps/app/app/api/mcp/holded/route.ts`
- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/sharedConnections.ts`

### Flujo de identidad y sesion temporal

- `apps/app/app/oauth/authorize/route.ts`
- `apps/app/lib/api/tenantAuth.ts`
- nuevas rutas/helpers de sesion temporal del conector

### Emails

- `apps/app/lib/email/holdedConnectionEmails.ts`

### Documentacion

- `docs/README.md`
- `docs/INDEX.md`
- `apps/app/README.md`
- documentos legacy de `Isaak for Holded` solo para aclarar que ya no mandan sobre la Fase 1 publica

## Cambios que no haremos al principio

Para no romper el backend compartido, no haremos de inicio:

- rename masivo de claves internas `isaak`
- migraciones grandes de esquema
- extraer otro proyecto MCP
- separar otra base de datos
- reescribir `external_connections`
- cambiar el transporte MCP

## Orden de implementacion

### Paso 1

Congelar el contrato publico en documentacion.

### Paso 2

Limpiar branding y copy del flujo `channel=chatgpt`.

### Paso 3

Introducir sesion temporal del conector y quitar login visible.

### Paso 4

Adaptar `authorize` para el nuevo onboarding directo.

### Paso 5

Revisar emails, soporte y QA.

### Paso 6

Actualizar docs legacy y checklist de review.

## Criterios de aceptacion

La Fase 1 queda bien separada cuando:

1. el usuario puede completar la conexion desde ChatGPT sin ver login clasico
2. ninguna pantalla publica del flujo menciona Isaak
3. el backend sigue guardando conexion, tenant e identidad igual que antes
4. ChatGPT completa OAuth contra `app.verifactu.business`
5. la API key de Holded nunca sale al cliente ChatGPT
6. el descriptor MCP y el material de review describen el conector directo, no a Isaak

## Estado documental desde este momento

Este documento pasa a ser la referencia canonica para:

- el contrato publico de Fase 1
- el plan de separacion visible del conector
- el orden de implementacion

Los documentos antiguos de `Isaak for Holded` pueden seguir siendo utiles para:

- backend compartido
- historia de decisiones
- MCP y OAuth como infraestructura

Pero no deben volver a usarse como fuente de verdad del contrato visible de Fase 1 si contradicen este documento.
