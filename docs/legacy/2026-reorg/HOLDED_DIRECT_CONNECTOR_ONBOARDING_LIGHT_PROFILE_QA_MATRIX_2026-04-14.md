# Holded Direct Connector - Onboarding Light Profile QA Matrix (2026-04-14)

## Objetivo

Validar que el onboarding publico mantiene alta conversion, conexion estable y control operativo cuando domicilio/sector se dejan para despues.

## Alcance de esta matriz

- flujo directo `ChatGPT -> OAuth -> /onboarding/holded -> callback`
- pasos de identidad, perfil persona, perfil empresa y API key
- estado de "perfil fiscal pendiente" tras conexion

## Entornos

- staging
- produccion controlada (smoke)

## Dispositivos

- desktop (Chrome)
- mobile (Safari/Chrome webview)

## Casos E2E prioritarios

### E2E-01 - Google + conexion minima completa

- Precondiciones:
  - usuario sin conexion activa
- Datos:
  - identidad Google valida
  - empresa: razon social + CIF/NIF + correo avisos
  - domicilio/sector vacios
  - API key valida
- Pasos:
  1. iniciar conexion desde ChatGPT
  2. confirmar identidad con Google
  3. completar perfil persona
  4. completar perfil empresa minimo
  5. conectar API key
- Esperado:
  - conexion completada
  - callback OAuth correcto
  - aparece estado de perfil fiscal pendiente en pantalla final cuando aplique
  - no hay bucles de login

### E2E-02 - Correo verificado + conexion minima completa

- Precondiciones:
  - usuario sin conexion activa
- Datos:
  - correo manual verificable
  - empresa minima
  - API key valida
- Pasos:
  1. iniciar flujo
  2. pedir enlace de verificacion
  3. verificar correo
  4. completar persona y empresa minima
  5. conectar
- Esperado:
  - paso identidad desbloquea solo tras verificacion
  - conexion completada sin popup
  - callback OAuth correcto

### E2E-03 - Validacion de empresa minima (bloqueos correctos)

- Precondiciones:
  - paso empresa abierto
- Datos por subcaso:
  1. sin razon social
  2. sin CIF/NIF
  3. sin correo avisos
- Esperado:
  - bloquea avance con mensaje claro
  - no exige domicilio/sector para avanzar

### E2E-04 - API key invalida

- Precondiciones:
  - pasos previos validos
- Datos:
  - API key invalida
- Esperado:
  - error accionable
  - usuario puede corregir sin perder datos de pasos previos

### E2E-05 - Reentrada con identidad ya verificada

- Precondiciones:
  - identidad ya recordada en sesion temporal
- Esperado:
  - no repite friccion innecesaria
  - copy neutral (sin atribuir Google si no corresponde)

## Casos de UX/copy

### UX-01 - Titulo de pasos

- Esperado:
  - "Paso 1: completa tu perfil"
  - "Paso 2: completa tu perfil de empresa"
  - paso API con copy de ultimo paso

### UX-02 - Campos opcionales visibles

- Esperado:
  - domicilio/codigo postal/ciudad/provincia/pais/sector marcados como opcional ahora

### UX-03 - Mensaje post-conexion

- Esperado:
  - si faltan datos fiscales, se muestra "perfil fiscal pendiente"
  - CTA secundario disponible en canal no-chatgpt para completar despues

## Casos de regresion tecnica

### REG-01 - Sin popup windows

- Esperado:
  - no aparece orquestacion popup

### REG-02 - OAuth callback estable

- Esperado:
  - `authorize -> onboarding -> callback` sin loops

### REG-03 - Compatibilidad mobile

- Esperado:
  - no se pierde token/estado al volver desde verificacion o al confirmar conexion

## Evidencias a guardar

- capturas por paso
- request id (`x-verifactu-request-id`) de `authorize/status/validate/connect`
- URL final de callback (sin publicar tokens sensibles)
- timestamp y entorno

## Criterio de aprobacion

1. 100% de E2E-01 y E2E-02 en verde.
2. 100% de bloqueos correctos en E2E-03.
3. Sin regressions en REG-01/REG-02.
4. UX-01/UX-02/UX-03 confirmados en desktop y mobile.

## Checklist rapido de smoke en produccion

1. Conexion nueva por Google con empresa minima.
2. Conexion nueva por correo verificado con empresa minima.
3. API key invalida y correccion posterior.
4. Verificacion de copy y estado "perfil fiscal pendiente".
5. Confirmacion de callback OAuth final en ChatGPT.
