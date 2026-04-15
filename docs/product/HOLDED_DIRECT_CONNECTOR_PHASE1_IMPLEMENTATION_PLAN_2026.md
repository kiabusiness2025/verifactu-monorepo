# Holded Direct Connector - Fase 1 Implementation Plan 2026

## Objetivo

Evolucionar la Fase 1 ya entregada hacia un onboarding mas simple y mas robusto para el conector directo `ChatGPT <-> Holded`, manteniendo intacto el backend compartido.

Documento complementario a:

- `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md`

## Principios

- no se abre otro backend
- no se duplica OAuth
- no se cambia el modelo de datos base
- no se rompe el dashboard ni el producto Isaak existente
- la separacion sigue siendo publica, no de plataforma
- Google visible pasa a ser una opcion de identidad, no un login clasico de producto

## Alcance de esta nueva ola

Incluido ahora:

- actualizar el contrato documental de Fase 1
- introducir estado de identidad verificada en la `connector onboarding session`
- preparar Google opcional y correo verificado como punto de entrada
- rediseñar el onboarding como secuencia de pantallas cortas
- mover el correo final de bienvenida al momento de conexion completa

No incluido:

- producto `Isaak Universal`
- acceso web abierto
- ampliaciones grandes de tools MCP
- split de backend
- migracion profunda de branding interno fuera del conector directo

## Fundacion ya entregada antes de esta ola

### F0.1 - Contrato publico directo separado de Isaak

Estado:

- listo

### F0.2 - `connector onboarding session`

Estado:

- listo

### F0.3 - Persistencia channel-aware y retorno OAuth estable

Estado:

- listo

### F0.4 - Observabilidad del flujo

Estado:

- listo

## Backlog priorizado de la nueva ola

### P0.1 - Actualizar documentacion canonica de Fase 1

Resultado:

- contrato, plan, README y guias operativas alineadas con el nuevo flujo objetivo

Entregables:

- `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md`
- `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_IMPLEMENTATION_PLAN_2026.md`
- `docs/product/HOLDED_DIRECT_CONNECTOR_EXECUTION_PROGRESS_2026.md`
- referencias desde `docs/README.md`, `docs/INDEX.md`, `apps/app/README.md`
- ajuste de guias tecnicas y runbooks del conector directo

Estado:

- completado (2026-04-15)

### P0.2 - Extender la sesion temporal del conector con estado de identidad

Resultado:

- el token de onboarding ya puede transportar metodo de identidad y verificacion sin perderse entre pasos

Campos objetivo:

- `authMethod`
- `emailVerified`
- `verifiedAt`
- `firstName`
- `lastName`
- `email`
- `tenantId`

Archivos candidatos:

- `apps/app/lib/oauth/mcp.ts`
- `apps/app/lib/integrations/holdedOnboardingSession.ts`
- `apps/app/app/api/onboarding/tenant/route.ts`

Aceptacion:

- el token refrescado tras crear o reusar tenant conserva el estado de identidad
- el resto del flujo puede leer ese estado sin depender de login clasico

Estado:

- completado (2026-04-14)

### P0.3 - Pantalla de entrada de identidad del conector

Resultado:

- primera decision visible: `Google` o `Correo`

Reglas:

- Google es opcional
- no hay selector de tenant ni dashboard
- el flujo sigue siendo del conector, no del producto principal

Estado:

- completado (2026-04-14)

### P0.4 - Verificacion obligatoria del correo manual

Resultado:

- la via manual no deja continuar a empresa/API key sin correo verificado

Decision operativa:

- preferir magic link o codigo ligero
- evitar convertir esta fase en un alta clasica con contrasena como centro del flujo

Estado:

- completado (2026-04-15)

### P0.5 - Onboarding por pasos conversacionales

Resultado:

- una pantalla por tarea, con menos friccion y menos copia repetitiva

Secuencia objetivo:

1. identidad
2. nombre y apellidos
3. empresa y CIF/NIF
4. API key de Holded
5. exito y celebracion

Estado:

- completado (2026-04-15)

### P0.6 - Politica final de correos del conector directo

Resultado:

- paridad entre via Google y via manual
- sin duplicados de welcome
- correo final de bienvenida tras conexion completada

Cambios previstos:

- verificacion solo para la via manual
- welcome final con nombre + empresa + primeros pasos
- admin notification deduplicada y etiquetada por origen

Estado:

- completado (2026-04-15)

### P1.1 - Reordenar `HoldedOnboardingClient` como flujo por estados claros

Resultado:

- menos riesgo de regresiones por estados mezclados
- mas facil introducir nuevos pasos sin loops ni stale state

Estado:

- completado (2026-04-15)

### P1.2 - Mantener retorno OAuth exacto durante la nueva UX

Resultado:

- el nuevo onboarding no rompe `authorize -> onboarding -> return`

Estado:

- completado (2026-04-15)

### P1.3 - Matriz de QA de la nueva ola

Casos minimos:

- Google nuevo usuario
- Google usuario ya existente
- correo manual verificado
- correo manual sin verificar
- desktop y mobile/webview
- no duplicado de correos

Estado:

- pendiente de pruebas manuales en entorno real

## Orden recomendado de ejecucion

1. `P0.1` documentacion canonica y runbooks
2. `P0.2` sesion temporal con estado de identidad
3. `P0.3` pantalla de entrada `Google` o `Correo`
4. `P0.4` verificacion de correo manual
5. `P0.5` onboarding por pasos
6. `P0.6` welcome final y paridad de correos
7. `P1.1` limpieza estructural del cliente
8. `P1.2` revalidacion exhaustiva del retorno OAuth
9. `P1.3` QA multi-camino

## Riesgos

- mezclar login de producto con onboarding del conector
- reintroducir dependencias de sesion web clasica en movil
- duplicar correos entre creacion de tenant y conexion final
- perder el estado de identidad al refrescar el onboarding token
- degradar el retorno OAuth al introducir pasos extra

## Criterio de exito de esta nueva ola

- el usuario entiende el flujo en 3 a 5 pantallas como maximo
- Google es opcional, no obligatorio
- la via manual exige correo verificado antes de seguir
- el backend sigue resolviendo identidad, tenant y conexion con el stack actual
- el correo final sale despues de la conexion completa y nombra a la empresa conectada
