# Holded Direct Connector - Fase 1 Implementation Plan 2026

## Objetivo

Convertir el flujo publico actual en un conector directo `ChatGPT <-> Holded` sin marca Isaak visible y sin login clasico visible, manteniendo intacto el backend compartido.

Documento complementario a:

- `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md`

## Principios

- no se abre otro backend
- no se duplica OAuth
- no se cambia el modelo de datos base
- no se rompe el dashboard ni el producto Isaak existente
- la separacion es publica, no de plataforma

## Alcance

Incluido en Fase 1:

- naming publico del conector
- copy y UX del onboarding `channel=chatgpt`
- sesion temporal propia del conector
- formulario minimo sin login visible
- persistencia de conexion Holded en el backend existente
- retorno correcto al flujo OAuth de ChatGPT

No incluido:

- producto `Isaak Universal`
- acceso web abierto
- nuevas familias grandes de tools
- split de backend
- migracion profunda de branding interno

## Backlog priorizado

### P0.1 - Canonizar el contrato publico

Resultado:

- un unico documento de referencia para Fase 1
- desambiguacion entre conector directo e Isaak

Entregables:

- `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md`
- enlaces desde `docs/README.md`, `docs/INDEX.md` y `apps/app/README.md`

Estado:

- listo

### P0.2 - Separar branding publico de Isaak

Resultado:

- el flujo `channel=chatgpt` habla solo de Holded, ChatGPT y Verifactu

Cambios previstos:

- renombrar descriptor MCP publico
- eliminar copy visible de Isaak en onboarding/loading
- eliminar descripciones de tools que presenten Isaak como interfaz publica del conector
- quitar fallbacks visuales a `/dashboard/isaak`

Archivos candidatos:

- `apps/app/app/api/mcp/holded/route.ts`
- `apps/app/app/onboarding/holded/HoldedOnboardingClient.tsx`
- `apps/app/app/onboarding/holded/loading.tsx`
- `apps/app/app/onboarding/holded/page.tsx`
- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/sharedConnections.ts`

Aceptacion:

- no aparece `Isaak` en ninguna pantalla publica del conector
- el descriptor MCP y el onboarding usan naming directo

Estado:

- listo

### P0.3 - Introducir sesion temporal del conector

Resultado:

- el flujo deja de depender de login web clasico visible

Cambios previstos:

- crear una `connector onboarding session`
- guardar contexto minimo del flujo OAuth original
- permitir completar onboarding directo sin mostrar `/login` ni `/signup`

Archivos candidatos:

- nuevas rutas/helpers en `apps/app/app/api/...`
- `apps/app/app/oauth/authorize/route.ts`
- `apps/app/app/onboarding/holded/page.tsx`
- `apps/app/app/onboarding/holded/HoldedOnboardingClient.tsx`

Aceptacion:

- el usuario completa el flujo sin pantalla de login visible
- ChatGPT vuelve al OAuth original al terminar

Estado:

- listo

### P0.4 - Formulario minimo del conector

Resultado:

- el usuario se identifica con formulario directo en lugar de cuenta web clasica

Campos propuestos:

- nombre
- email
- empresa
- API key de Holded
- terminos
- privacidad

Aceptacion:

- el backend crea o resuelve identidad interna sin exponer registro clasico

Estado:

- listo

### P1.1 - Mantener persistencia y tenant invisibles al usuario

Resultado:

- la plataforma sigue usando `users`, `tenants`, `memberships`, `channel_identities` y `external_connections`
- la UI publica no expone `tenant-switch` ni conceptos de dashboard

Cambios previstos:

- ajustar resolucion interna al nuevo flujo de sesion temporal
- ocultar conceptos de tenancy en la UI

Aceptacion:

- la conexion queda persistida y trazable
- el usuario no ve pasos de tenancy

Estado:

- listo

### P1.2 - Endurecer retorno OAuth

Resultado:

- el flujo `authorize -> onboarding -> return` queda estable en movil y escritorio

Cambios previstos:

- preservar `client_id`, `redirect_uri`, `state`, `code_challenge` y contexto de scopes
- cerrar el onboarding devolviendo al flujo exacto original

Aceptacion:

- ChatGPT completa la conexion despues del onboarding sin pasos extra

Estado:

- listo

### P1.3 - Observabilidad del flujo

Resultado:

- soporte puede diagnosticar fallos reales en movil

Cambios previstos:

- loggear `request_id`, `channel`, `tenant_id`, `stage`
- distinguir fallos de sesion temporal, validacion Holded y retorno OAuth

Aceptacion:

- cada intento deja un rastro util en logs

Estado:

- listo

## Estado actual del backlog

Implementado en esta ola:

- `P0.2`
- `P0.3`
- `P0.4`
- `P1.1`
- `P1.2`
- `P1.3`

Pendiente para una siguiente ola:

- endurecimiento adicional de OAuth si se decide cambiar el contrato tecnico del `authorization_code`
- limpieza documental mas amplia de materiales historicos que siguen usando el naming `Isaak for Holded`
- posible mecanismo de recuperacion/gestion por email para la conexion directa

## Orden recomendado de ejecucion

1. `P0.2` separacion de branding/copy
2. `P0.3` sesion temporal del conector
3. `P0.4` formulario minimo directo
4. `P1.1` persistencia invisible
5. `P1.2` retorno OAuth estable
6. `P1.3` observabilidad

## Riesgos

- mezclar branding publico y branding interno en el mismo componente
- depender otra vez de cookies de sesion web clasicas en movil
- romper el flujo actual de dashboard por reutilizar demasiado codigo sin frontera de canal
- dejar el onboarding directo sin mecanismo de recuperacion por email

## Criterio de exito de Fase 1

- el reviewer de OpenAI ve un conector directo Holded para ChatGPT
- el usuario no ve Isaak, login Google ni dashboard
- el backend sigue resolviendo identidad, tenant y conexion con el stack actual
- el flujo funciona en movil y escritorio con el mismo contrato publico
