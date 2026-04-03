# Isaak Universal - Sprint plan 2026

## Objetivo

Convertir el roadmap tecnico de `Isaak Universal` en un plan de ejecucion cercano, con entregables, gates y criterios de salida por sprint.

## Regla previa

Este plan no se empieza a ejecutar de forma comercial hasta que `Isaak for Holded` quede aprobado o, como minimo, desbloqueado para no poner en riesgo la review actual.

## Sprint 0 - Freeze y preparacion

Objetivo:

- dejar claro que se construira un producto separado

Entregables:

- nombre interno definitivo de producto
- decision de separacion de OAuth y API
- inventario de dominios oficiales candidatos
- criterio de allowlist inicial
- decision de entitlement de pago

Criterio de salida:

- contrato de producto cerrado
- roadmap tecnico validado
- no hay dependencias ambiguas con el conector Holded en review

## Sprint 1 - Esqueleto de producto separado

Objetivo:

- crear la base tecnica separada

Entregables:

- rutas publicas y privadas nuevas
- metadata publica separada
- OAuth propio o namespace separado
- configuracion legal, soporte y branding operativo propios
- feature flag o entitlement base

Criterio de salida:

- `Isaak Universal` ya no depende del contrato ni metadata de `Isaak for Holded`

## Sprint 2 - Gateway oficial con allowlist

Objetivo:

- poder leer solo fuentes oficiales aprobadas

Entregables:

- allowlist de dominios oficiales v1
- fetch seguro con timeout y limites
- parser HTML/texto
- cache de consulta
- estructura de metadatos de fuente

Criterio de salida:

- Isaak puede recuperar contenido oficial con dominio controlado y trazabilidad tecnica minima

## Sprint 3 - Respuesta con citas y confianza

Objetivo:

- convertir consultas oficiales en respuestas verificables

Entregables:

- modelo de cita
- serializacion de fuente, fecha y url canónica
- prompts y runtime para separar hecho, interpretacion y recomendacion
- fallback seguro cuando falte fuente valida

Criterio de salida:

- las respuestas ya pueden enseñar conclusion y origen verificable

## Sprint 4 - Pack fiscal oficial

Objetivo:

- abrir el primer pack con mas valor inmediato para usuarios en Espana

Fuentes foco:

- AEAT
- sede AEAT
- BOE cuando aplique a normativa fiscal

Entregables:

- intents fiscales base
- plantillas de respuesta con cita
- pruebas sobre preguntas frecuentes fiscales

Criterio de salida:

- beta interna fiscal funcional con citas oficiales

## Sprint 5 - Pack laboral y administrativo

Objetivo:

- ampliar cobertura a relaciones laborales y tramites frecuentes

Fuentes foco:

- Seguridad Social
- TGSS
- SEPE
- administracion oficial aprobada

Entregables:

- intents laborales y administrativos base
- QA de consultas mixtas
- manejo de ambigüedad y redireccion a fuente oficial

Criterio de salida:

- beta interna multifuente controlada

## Sprint 6 - Pack Holded Academy y software oficial conectado

Objetivo:

- cerrar el bucle con la documentacion oficial de software relevante

Fuentes foco:

- Holded Academy
- documentacion oficial de Holded aprobada

Entregables:

- intents de uso y ayuda funcional de Holded
- citas y extractos consistentes
- politica clara de convivencia con el conector Holded

Criterio de salida:

- el producto universal ya cubre normativa oficial y ayuda oficial de software sin mezclar canales

## Sprint 7 - Monetizacion y operacion

Objetivo:

- preparar lanzamiento controlado de pago

Entregables:

- entitlement por plan o uso
- rate limiting
- observabilidad y soporte
- auditoria de consultas y fuentes
- politicas de errores y degradacion

Criterio de salida:

- producto operable y monetizable sin depender del flujo gratuito revisado en OpenAI

## Backlog transversal para todos los sprints

- no abrir dominios fuera de allowlist sin decision explicita
- no reusar la app de Holded como si fuera el producto universal
- medir calidad de fuentes y respuesta
- mantener documentacion y criterios de seguridad actualizados

## Ready checklist para que Codex implemente

Antes de pedir implementacion, deberia estar claro esto:

- que rutas nuevas existen
- que dominios entran en allowlist v1
- como se guarda la cita
- que plan comercial habilita acceso
- como se separa de `Isaak for Holded`
- cual es el pack de dominio objetivo del sprint actual

## Referencias

- `docs/product/ISAAK_UNIVERSAL_PRODUCT_CONTRACT_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TECHNICAL_ROADMAP_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TICKETS_2026.md`
- `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`
