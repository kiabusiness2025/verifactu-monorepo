# QA rapida - Holded + ChatGPT (login primero)

Fecha: 2026-04-15
Objetivo: validar en 5-10 minutos que el flujo publico del conector cumple `OAuth + API key` como unico bloqueo obligatorio y que el login aparece al iniciar desde ChatGPT.

## Alcance

- Flujo de entrada desde ChatGPT.
- Redireccion a login en Holded antes del onboarding.
- Conexion por API key.
- Mensajes de error mas claros (borde rojo + foco al primer error en campos invalidos).

## Precondiciones

- Entorno desplegado con cambios de hoy.
- Cuenta de prueba con acceso a Holded y API key valida.
- Navegador limpio (modo incognito recomendado).

## Caso 1 - Arranque desde ChatGPT sin sesion

1. Iniciar conexion del conector desde ChatGPT.
2. Verificar redireccion a `https://holded.verifactu.business/auth/holded`.
3. Verificar que en URL existe `source=holded_chat_requires_session`.
4. Completar acceso en login (correo o Google).
5. Confirmar que continua hacia `/onboarding/holded` (no al dashboard directamente).

Resultado esperado:

- El panel de login se abre siempre en entrada sin sesion.
- Usuario queda identificado antes del formulario de conexion.

## Caso 2 - Onboarding ChatGPT en modo minimo obligatorio

1. Abrir `/onboarding/holded?channel=chatgpt&reset=1` con sesion activa.
2. Confirmar que la pantalla arranca en paso de API key.
3. Confirmar que no fuerza pasos de nombre/apellidos/empresa para activar.

Resultado esperado:

- Paso visible principal: conexion por API key.
- Bloqueo obligatorio: OAuth ya validado + API key.

## Caso 3 - Validacion visual de errores en datos de empresa

1. Abrir flujo con `channel=dashboard` y `reset=1`.
2. Ir al paso de empresa.
3. Introducir NIF/CIF invalido (ejemplo: `??`) y razon social demasiado corta (ejemplo: `A`).
4. Pulsar continuar.

Resultado esperado:

- Mensajes de error explicitos debajo de cada campo invalido.
- Campos invalidos con borde rojo.
- Foco automatico en el primer campo con error.

## Caso 4 - Conexion correcta y retorno OAuth

1. En onboarding, pegar API key valida.
2. Aceptar terminos y conectar.
3. Esperar pantalla de exito y redireccion.
4. Verificar retorno al flujo OAuth de ChatGPT y finalizacion de conexion.

Resultado esperado:

- Validacion y guardado correctos de conexion.
- Redireccion final sin bucles de login/onboarding.

## Criterio de aprobacion

- 4/4 casos en verde sin bloqueos.
- Sin regresion en entrada ChatGPT.
- Sin mensajes ambiguos en validaciones del formulario.
