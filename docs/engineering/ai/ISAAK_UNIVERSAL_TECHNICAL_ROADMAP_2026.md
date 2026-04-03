# Isaak Universal - Roadmap tecnico 2026

## Objetivo

Definir la secuencia tecnica para construir `Isaak Universal` como producto separado del conector `Isaak for Holded`.

Este roadmap parte de una regla previa: no tocar el contrato publico estrecho del conector Holded mientras la review de OpenAI siga abierta, salvo fixes criticos.

## Principios tecnicos

- producto separado del conector Holded revisado
- OAuth separado
- API publica separada
- allowlist estricta de fuentes oficiales
- trazabilidad de citas y respuestas
- seguridad por defecto antes que amplitud de crawling

## No objetivos iniciales

- no abrir web arbitraria sin control
- no reutilizar sin mas la submission MCP de Holded como si fuera el asesor universal
- no depender de fuentes no oficiales en la primera version
- no mezclar pricing, entitlement ni soporte con el producto de Holded revisado

## Arquitectura minima esperada

`Isaak Universal` deberia nacer con estos bloques:

1. superficie propia de producto
2. OAuth y registro de cliente propios
3. runtime conversacional propio
4. capa de acceso web oficial con allowlist
5. extraccion y normalizacion de contenido
6. capa de citas, caché y auditoria
7. entitlement de pago y limites de uso

## Fase 0 - Gate de aprobacion

Antes de arrancar desarrollo comercial real:

- esperar la aprobacion de OpenAI de `Isaak for Holded`
- mantener el conector Holded en `openai_review_v2` salvo fixes criticos
- congelar cualquier mezcla accidental entre roadmap universal y roadmap Holded review

## Fase 1 - Separacion de contrato y acceso

Objetivo:

- crear la base separada del producto universal

Trabajo tecnico:

- definir nuevo identificador de producto
- definir nuevas rutas publicas y privadas
- separar OAuth, callbacks y metadata publica
- definir entitlement o plan de pago
- separar configuracion legal, soporte y branding operativo

Salida esperada:

- `Isaak Universal` ya no depende del contrato publico del conector Holded

## Fase 2 - Capa de fuentes oficiales

Objetivo:

- permitir acceso controlado a fuentes oficiales relevantes

Trabajo tecnico:

- allowlist de dominios oficiales aprobados
- fetch seguro con timeout, tamano maximo y validacion de content-type
- parser de HTML y texto para contenido oficial
- normalizacion de metadatos de fuente
- cache con expiracion y auditoria minima
- modelo de cita para devolver fuente y trazabilidad al usuario

Salida esperada:

- Isaak puede consultar contenido oficial sin convertirse en navegador abierto

## Fase 3 - Orquestacion del asesor universal

Objetivo:

- convertir la lectura de fuentes oficiales en respuestas utiles y citables

Trabajo tecnico:

- planificador de consulta por dominio
- seleccion de fuente segun intencion del usuario
- sintesis con citas y niveles de confianza
- separacion entre hechos verificados y recomendacion operativa
- comportamiento seguro ante falta de fuente valida

Salida esperada:

- respuestas claras, trazables y con origen visible

## Fase 4 - Packs de dominio oficial

Objetivo:

- especializar el asesor por familias de trabajo

Packs iniciales sugeridos:

- fiscal: AEAT, sede AEAT, modelos y libros
- laboral: Seguridad Social, TGSS, SEPE
- normativa: BOE y administracion oficial
- software oficial conectado: Holded Academy y documentacion oficial permitida

Salida esperada:

- mejor precision sin abrir toda la web

## Fase 5 - Monetizacion y operacion

Objetivo:

- dejar el producto listo para explotacion comercial real

Trabajo tecnico:

- limites por plan o uso
- auditoria y trazas de consulta
- metrica de calidad y fuentes
- soporte y observabilidad
- control de abuso y rate limiting

## Reglas de seguridad obligatorias

- solo dominios aprobados por allowlist en v1
- no ejecutar contenido remoto
- no seguir enlaces libremente sin politica de dominio
- limitar tamano, tiempo y profundidad de lectura
- guardar trazabilidad minima de fuente y fecha
- proteger PII y datos de tenant cuando se mezclen con respuestas externas

## Relacion con el conector Holded

Este roadmap no invalida la Fase 2 del conector directo ChatGPT con Holded.

Despues de la aprobacion de OpenAI deben convivir dos lineas distintas:

- linea A: ampliar el conector Holded con escritura estructurada dentro del propio dominio Holded
- linea B: construir `Isaak Universal` como producto separado con acceso a fuentes oficiales

## Referencias relacionadas

- `docs/product/ISAAK_UNIVERSAL_PRODUCT_CONTRACT_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_SPRINT_PLAN_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TICKETS_2026.md`
- `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`
- `docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md`
- `docs/product/ISAAK_HOLDED_PHASE2_MATRIX_2026.md`
- `docs/product/ISAAK_HOLDED_PHASE2_BACKLOG_2026.md`
