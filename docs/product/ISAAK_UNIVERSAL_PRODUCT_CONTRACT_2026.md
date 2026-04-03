# Isaak Universal - Contrato de producto 2026

## Objetivo

Este documento fija el contrato de producto de `Isaak Universal`, la futura oferta separada de pago que arrancara despues de la aprobacion de `Isaak for Holded` en OpenAI.

No sustituye al conector actual de Holded ni debe mezclarse con su submission publica.

## Decision marco

- `Isaak for Holded` sigue siendo la experiencia estrecha, gratuita dentro del flujo revisado y centrada en datos de Holded.
- `Isaak Universal` sera una experiencia separada, con contrato comercial propio y alcance mas amplio.
- `Isaak Universal` debe vivir como otra app o conector, con su propio OAuth, su propia API publica y su propia superficie funcional.

## Promesa de producto

`Isaak Universal` debe ayudar a autonomos y pequenas empresas en Espana a entender obligaciones fiscales, laborales y administrativas con calma, claridad y fuentes verificables.

La promesa no es "buscar por internet" sin control.

La promesa es:

- consultar fuentes oficiales relevantes
- explicarlas en lenguaje simple
- dejar clara la procedencia de la respuesta
- separar hechos, interpretacion y recomendacion operativa

## Fuentes permitidas en v1

La primera version de pago debe centrarse en fuentes oficiales o documentacion oficial aprobada:

- Holded Academy y documentacion oficial de Holded
- AEAT y su sede electronica
- Seguridad Social y su sede
- TGSS
- SEPE
- BOE
- Administracion.gob.es y otros dominios oficiales espanoles aprobados por allowlist

## Fuentes fuera de alcance inicial

En la primera version no se debe abrir web no controlada como base del producto:

- blogs de terceros
- foros
- redes sociales
- agregadores SEO
- articulos sin autoria oficial
- resultados abiertos sin allowlist ni trazabilidad

## Que es y que no es

`Isaak Universal` si es:

- un asesor conversacional con fuentes oficiales verificables
- una capa de traduccion a lenguaje comprensible
- una experiencia separada del conector Holded revisado por OpenAI

`Isaak Universal` no es:

- un clon de las webs oficiales
- una promesa de asesoramiento juridico vinculante
- una expansion informal del conector `Isaak for Holded`
- un upsell escondido dentro del flujo de review actual de ChatGPT

## Contrato de experiencia

Cada respuesta de `Isaak Universal` debe intentar cumplir estas reglas:

- explicar primero la conclusion practica
- citar la fuente oficial usada cuando proceda
- distinguir lo confirmado de lo incierto
- evitar lenguaje tecnico innecesario
- pedir contexto adicional cuando la respuesta dependa del caso concreto
- no afirmar tramites o plazos si no se han podido verificar con fuente oficial apta

## Contrato de confianza

- la fuente debe poder rastrearse
- la fecha de consulta debe quedar visible o registrable
- si una fuente oficial es ambigua, Isaak debe decirlo
- si falta base suficiente, Isaak debe recomendar validar con asesor humano o con el organismo competente

## Contrato comercial

- `Isaak Universal` sera una oferta de pago
- su pricing no debe mezclarse con la review publica de `Isaak for Holded`
- el acceso debe gobernarse por entitlement propio
- el soporte, terminos y privacidad deben poder describirse como producto separado

## Relacion con Isaak for Holded

Despues de la aprobacion de OpenAI, los dos carriles deben convivir sin mezclarse:

- `Isaak for Holded`: conector especifico de Holded, con roadmap propio de Fase 2 para escritura estructurada sobre datos de Holded
- `Isaak Universal`: asesor universal con acceso a fuentes oficiales y contrato comercial separado

## Criterios de salida para v1

La primera version de `Isaak Universal` no deberia salir hasta cumplir al menos esto:

- allowlist oficial definida
- citas y trazabilidad visibles
- OAuth y API propios separados del conector Holded
- entitlement de pago operativo
- politica de soporte y copy comercial diferenciados

## Referencias de implementacion

- `docs/engineering/ai/ISAAK_UNIVERSAL_TECHNICAL_ROADMAP_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_SPRINT_PLAN_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TICKETS_2026.md`
- `docs/product/ISAAK_HOLDED_PHASE2_MATRIX_2026.md`
- `docs/product/ISAAK_HOLDED_PHASE2_BACKLOG_2026.md`
