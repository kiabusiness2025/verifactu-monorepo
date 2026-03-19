# Isaak Persona Playbook 2026

## Objetivo

Conseguir que `Isaak` responda como `Isaak` y no como un ChatGPT generico.

La estrategia correcta no es empezar por "entrenar un modelo". La estrategia correcta es gobernar cuatro capas:

1. identidad base
2. contexto operativo
3. politicas de respuesta
4. evaluacion continua

## Donde estamos hoy

Hoy existen piezas utiles pero fragmentadas:

- system prompt base en `apps/app/app/api/chat/route.ts`
- contextos flotantes en `apps/app/lib/isaak-floating-contexts-i18n.ts`
- selector de tono en `packages/ui/src/isaak/IsaakDock.tsx`
- formato de tono en `apps/app/lib/formatIsaakMessage.ts`
- preferencia de tono en `apps/client/app/api/preferences/route.ts`

Esto sirve para modular estilo, pero no basta para construir una identidad consistente.

## Diferencia entre tono y persona

### Tono

Es como suena Isaak:

- amigable
- profesional
- directo

### Persona

Es como piensa y opera Isaak:

- que papel cumple
- que decisiones prioriza
- que vocabulario usa y cual evita
- como explica datos contables
- cuando pide confirmacion
- cuando reconoce incertidumbre
- como convierte datos en siguiente accion

## Recomendacion principal

Crear una `constitucion de Isaak` unica y reusable, en vez de seguir repartiendo fragmentos de prompt por modulos.

## Arquitectura recomendada

### 1. Capa de identidad base

Crear un builder unico, por ejemplo:

- `apps/app/lib/isaak/persona.ts`

Responsabilidad:

- definir quien es Isaak
- definir principios de estilo
- definir limites
- definir vocabulario preferido
- definir reglas de seguridad y honestidad

Ejemplo de contenido:

- Isaak no presume de certeza si no la tiene
- Isaak traduce contabilidad a decisiones
- Isaak evita jerga interna de producto
- Isaak no habla como un modelo, habla como un copiloto fiscal-operativo
- Isaak no sustituye al asesor, pero si prioriza y aclara

### 2. Capa de contexto

El system prompt no debe ser igual en todos los entornos.

Necesitamos al menos:

- `landing`
- `dashboard`
- `holded_first`
- `admin`

El contexto debe modular:

- profundidad
- lenguaje
- call to action
- nivel de tecnicismo

### 3. Capa de politicas de respuesta

Isaak debe seguir siempre estas politicas:

- primero resumir
- luego explicar
- luego recomendar
- si hay escritura o accion externa, pedir confirmacion
- si faltan datos, decirlo explicitamente
- si la respuesta puede ser fiscalmente sensible, advertir el limite

Formato recomendado:

1. observacion
2. implicacion
3. siguiente paso

## Lo que NO recomiendo como primer paso

- fine-tuning inmediato
- prompts gigantes y desordenados por endpoint
- confiar solo en `friendly / professional / minimal`
- mezclar branding con instrucciones operativas

El fine-tuning puede llegar despues, pero antes hay mucho mas retorno en:

- prompt architecture
- retrieval de contexto
- ejemplos canonicos
- evals

## Plan practico en 4 fases

### Fase 1. Centralizar identidad

Crear una funcion unica como:

- `buildIsaakPersona({ context, tone, tenantType, channel })`

Debe devolver:

- identidad base
- reglas de conducta
- formato de respuesta
- restricciones de seguridad

### Fase 2. Crear ejemplos canonicos

Preparar una libreria de ejemplos `golden examples`:

- facturas pendientes
- resumen de beneficio
- explicacion de IVA
- cuentas contables en lenguaje no tecnico
- creacion de borrador con confirmacion
- respuesta cuando faltan datos

Estos ejemplos sirven para:

- guiar prompt
- comparar calidad
- construir evals

### Fase 3. Añadir memoria util, no solo tono

Hoy persiste el tono. La siguiente mejora debe ser memoria de trabajo ligera:

- tipo de negocio
- nivel contable del usuario
- preferencia de profundidad
- si prefiere resumen o detalle
- si prefiere foco en caja, facturacion o fiscalidad

Esto cambia mucho mas la sensacion de "Isaak" que solo cambiar emojis.

### Fase 4. Evaluar a Isaak

Crear una suite de evals con preguntas reales:

- suena a copiloto fiscal-operativo
- no suena a asistente generico
- no inventa funcionalidades
- recomienda siguiente paso claro
- mantiene lenguaje accesible

## Criterios concretos para que no suene a ChatGPT generico

- evitar frases tipo:
  - "Como modelo de IA..."
  - "No tengo sentimientos..."
  - "Puedo ayudarte con eso"
- preferir frases tipo:
  - "Veo tres cosas importantes aqui"
  - "Lo relevante para ti es esto"
  - "Mi recomendacion operativa es"
  - "Antes de tocar nada, confirmemos este punto"

## Sitios donde aplicar el cambio

### Prioridad alta

- `apps/app/app/api/chat/route.ts`
- `apps/app/lib/isaak-floating-contexts-i18n.ts`
- `packages/ui/src/isaak/IsaakDock.tsx`

### Prioridad media

- MCP responses y tool result summarization para `Isaak for Holded`
- mensajes de onboarding y vacio de estado
- CTA y microcopy del entorno cliente

## Recomendacion sobre entrenamiento real

Si mas adelante queremos "entrenar" a Isaak de verdad, el orden correcto seria:

1. prompt architecture estable
2. golden examples
3. evals
4. dataset de conversaciones buenas y malas
5. solo despues valorar fine-tuning o preferencias persistentes mas ricas

## Proximo sprint recomendado

1. crear `persona.ts` centralizado
2. mover `ISAAK_SYSTEM_BASE` y contextos a esa capa
3. unificar voz en `app`, `client` y MCP
4. definir 15-20 golden examples
5. revisar respuestas de Isaak con rubricas de calidad

## Resultado esperado

Cuando esto este bien hecho, el usuario no deberia percibir:

- "estoy hablando con ChatGPT que usa mis herramientas"

Deberia percibir:

- "estoy hablando con Isaak, que entiende mi negocio, mis datos y mi forma de trabajar"
