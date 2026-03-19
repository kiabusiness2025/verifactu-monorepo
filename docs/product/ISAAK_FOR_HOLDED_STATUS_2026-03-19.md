# Isaak for Holded - Estado Operativo 2026-03-19

## Resumen ejecutivo

`Isaak for Holded` ya completa el flujo publico principal:

1. descubrimiento desde `holded.verifactu.business`
2. apertura en ChatGPT
3. onboarding `holded-first`
4. pegado de API key de Holded
5. validacion server-side
6. persistencia de la conexion
7. vuelta al flujo de ChatGPT

La app ya ha sido enviada a revision publica en OpenAI Platform.

## Arquitectura viva

- `holded.verifactu.business`
  - landing publica y materiales de campaña
- `app.verifactu.business`
  - OAuth propio, onboarding Holded, MCP y persistencia
- `client.verifactu.business`
  - nuevo entorno cliente para la experiencia avanzada

## Decisiones clave cerradas

- Holded se integra por `API key`, no por OAuth de Holded.
- El flujo publico para usuarios externos es `holded-first`.
- El login visible ya no es el primer paso para usuarios externos.
- La cuenta de Holded la determina la `API key`, no el email de ChatGPT.
- `Isaak for Holded` es la entrada gratuita.
- `verifactu.business` es la experiencia completa con CTA permanente.

## Incidente principal resuelto

### Sintoma visible

- el usuario veia `No se pudo guardar la conexion de Holded`

### Causa real final

- el error ocurria en `persist`
- la app llegaba a validar bien la API key de Holded
- el fallo real estaba en conectividad desde `app.verifactu.business` a Postgres
- el error final observado fue `ETIMEDOUT`

### Aprendizaje operativo

- cuando el onboarding llega a `persist`, Holded ya no es el problema principal
- a partir de ahi, el foco debe moverse a:
  - `DATABASE_URL`
  - SSL / `sslmode=require`
  - firewall / allowlist / conectividad externa
  - proveedor Postgres y cadena pooled vs direct

## Cambios de producto y UX ya incorporados

- onboarding publico dedicado en `/onboarding/holded`
- flujo sin login visible para usuarios externos
- branding Holded en onboarding y loading
- CTA permanente a `verifactu.business`
- landing publica en `holded.verifactu.business`
- paginas publicas de soporte, privacidad y terminos
- screenshots y materiales de app directory preparados

## Cambios tecnicos relevantes ya incorporados

- resolver compartido de conexion Holded
- modelos `external_connections` y `channel_identities`
- compatibilidad temporal con `tenant_integrations`
- soporte de `onboarding_token` para flujo `holded-first`
- mejora de performance en primer render del onboarding
- diagnosticos de error mas utiles en el endpoint de `connect`

## Riesgos que siguen abiertos

- cerrar bien las migraciones definitivas en todos los entornos
- dejar consistente el proyecto `app` con Postgres productivo estable
- pasar de URL beta de ChatGPT a URL publica final cuando OpenAI apruebe
- reforzar la identidad conversacional de Isaak para que no suene a asistente generico

## Siguiente bloque recomendado

1. QA E2E completo desde cuenta limpia en ChatGPT web y mobile
2. grabacion de demo real
3. swap de URL beta por URL publica final de OpenAI
4. evolucion de la voz de Isaak con una capa de persona centralizada

## Referencias

- `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`
- `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`
- `docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md`
- `docs/ops/runbooks/ISAAK_FOR_HOLDED_PUBLIC_DEPLOY.md`
