# Isaak Universal - Tickets ejecutables 2026

## Objetivo

Traducir el sprint plan de `Isaak Universal` en tickets ejecutables, con dependencias, riesgos, Definition of Done y puntos claros para que Codex implemente sin tener que reconstruir el planteamiento desde cero.

## Archivos actuales que sirven de anclaje

Archivos existentes del runtime actual que probablemente marcaran la separacion futura:

- `apps/app/app/api/chat/route.ts`
- `apps/app/lib/ai-gateway.ts`
- `apps/isaak/app/api/holded/chat/route.ts`
- `packages/utils/openai-responses.ts`

## Sprint 0 - Freeze y preparacion

### U0-001 - Cerrar contrato operativo de separacion

Objetivo:

- que no haya dudas entre `Isaak for Holded` y `Isaak Universal`

Entregables:

- naming interno definitivo
- decision de OAuth separado
- decision de API separada
- allowlist oficial candidata v1
- modelo de entitlement de pago a nivel de producto

Definition of Done:

- documentos de producto y roadmap cerrados
- no queda ninguna decision abierta que bloquee Sprint 1

### U0-002 - Preparar inventario de fuentes oficiales

Objetivo:

- convertir la idea de "fuentes oficiales" en un inventario gobernable

Entregables:

- lista base de dominios aprobables
- criterio para incluir o excluir dominios
- criterio para subdominios y sedes electronicas

Riesgo principal:

- mezclar fuentes oficiales con contenido ambiguo no gobernado

## Sprint 1 - Esqueleto separado

### U1-001 - Definir superficie publica separada

Objetivo:

- que `Isaak Universal` no dependa de la metadata del conector Holded

Archivos ancla actuales:

- `apps/app/app/api/chat/route.ts`
- `apps/app/lib/ai-gateway.ts`

Trabajo esperado:

- definir nueva ruta o namespace de producto
- separar metadata publica y naming
- evitar reutilizar la metadata MCP del conector Holded

Definition of Done:

- existe un punto de entrada claro y separado para el producto universal

### U1-002 - Separar OAuth y acceso

Objetivo:

- evitar que el producto universal herede el contrato OAuth del conector Holded por accidente

Trabajo esperado:

- definir issuer/metadata/registration propios o namespace separado
- dejar clara la compatibilidad con pricing y entitlement

Riesgo principal:

- mezclar sesiones o metadata de discovery con Holded review

### U1-003 - Entitlement base

Objetivo:

- dejar preparado el gate de pago desde el inicio

Definition of Done:

- el runtime puede distinguir acceso gratuito de acceso de pago aunque aun no haya pack comercial final

## Sprint 2 - Gateway oficial con allowlist

### U2-001 - Crear modulo de allowlist oficial

Objetivo:

- que toda consulta externa pase por una politica de dominio clara

Trabajo esperado:

- modulo de allowlist versionado
- estructura para dominio, subdominios, categoria y estado

Archivos ancla actuales:

- `apps/app/app/api/chat/route.ts`
- `packages/utils/openai-responses.ts`

Definition of Done:

- no hay consultas a fuentes externas sin pasar por allowlist

### U2-002 - Crear fetch seguro de fuentes oficiales

Objetivo:

- poder leer contenido oficial sin crear un navegador abierto

Trabajo esperado:

- timeouts
- max body size
- validacion de content-type
- politicas de redireccion
- errores trazables

Definition of Done:

- el sistema puede recuperar HTML o texto oficial de un dominio permitido de forma segura

### U2-003 - Crear parser y metadatos de fuente

Objetivo:

- normalizar el contenido antes de que el LLM lo consuma

Entregables:

- extractor de texto
- metadatos de titulo, url, fecha y dominio
- cache basica

Riesgo principal:

- ruido excesivo o parsing inconsistente segun dominio

## Sprint 3 - Citas y respuesta verificable

### U3-001 - Modelo de cita

Objetivo:

- que el usuario vea de donde sale la respuesta

Trabajo esperado:

- estructura de cita
- serializacion de fuente y fecha
- compatibilidad con respuestas de chat

Definition of Done:

- una respuesta puede incluir conclusion y cita verificable

### U3-002 - Orquestador de respuesta oficial

Objetivo:

- separar hecho, interpretacion y recomendacion operativa

Archivos ancla actuales:

- `apps/app/app/api/chat/route.ts`
- `apps/app/lib/ai-gateway.ts`
- `packages/utils/openai-responses.ts`

Definition of Done:

- fallback seguro cuando no hay fuente apta
- la respuesta no finge certeza donde no la hay

## Sprint 4 - Pack fiscal oficial

### U4-001 - Intents fiscales prioritarios

Fuentes foco:

- AEAT
- sede AEAT
- BOE cuando aplique

Entregables:

- intents fiscales v1
- tests de preguntas frecuentes
- plantillas con cita

Definition of Done:

- beta interna fiscal util con origen verificable

## Sprint 5 - Pack laboral y administrativo

### U5-001 - Intents laborales prioritarios

Fuentes foco:

- Seguridad Social
- TGSS
- SEPE

Definition of Done:

- beta interna laboral/administrativa sin salir de fuentes oficiales

## Sprint 6 - Pack Holded Academy

### U6-001 - Ayuda oficial de software conectado

Objetivo:

- responder mejor sobre uso de Holded sin mezclarlo con el conector MCP

Archivos ancla actuales:

- `apps/isaak/app/api/holded/chat/route.ts`
- `packages/utils/openai-responses.ts`

Definition of Done:

- convivencia clara entre ayuda oficial de Holded y el conector directo Holded

## Sprint 7 - Monetizacion y operacion

### U7-001 - Entitlement final y limites

Objetivo:

- preparar lanzamiento comercial controlado

Entregables:

- gating por plan o uso
- rate limiting
- observabilidad
- errores y degradacion controlada

### U7-002 - Soporte y auditoria

Objetivo:

- poder operar el producto sin perder trazabilidad

Definition of Done:

- metricas de calidad, trazas de fuentes y soporte minimo operables

## Riesgos transversales que Codex no debe olvidar

- no reutilizar el conector Holded como atajo para el producto universal
- no abrir dominios fuera de allowlist por conveniencia puntual
- no mezclar planes de pago con el flujo gratuito de review actual
- no devolver respuestas sin cita cuando la pregunta dependa de fuente oficial

## Ready checklist previo a implementacion

- sprint objetivo confirmado
- dominios aprobados confirmados
- decision de OAuth separada confirmada
- decision de entitlement confirmada
- puntos de entrada del runtime confirmados
- Definition of Done cerrada para el ticket actual

## Referencias

- `docs/product/ISAAK_POST_APPROVAL_WEEK1_PLAN_2026.md`
- `docs/product/ISAAK_UNIVERSAL_PRODUCT_CONTRACT_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TECHNICAL_ROADMAP_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_SPRINT_PLAN_2026.md`
