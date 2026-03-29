# Holded Connection Architecture

## Objetivo

Persistir la conexion Holded por API key de forma segura, reutilizable y compatible con:

- onboarding publico en `holded.verifactu.business`
- personalizacion inicial de Isaak
- chat principal en `isaak.verifactu.business`
- conector MCP remoto servido desde `app.verifactu.business`

## Frontera de ownership

`apps/holded` se ocupa de:

- captacion y acceso
- recogida de la API key
- validacion inicial
- persistencia de la conexion
- onboarding corto antes del chat

`apps/holded` no sirve:

- el chat principal
- el conector MCP de ChatGPT
- el OAuth server del conector

El conector ChatGPT usa la conexion ya persistida, pero el runtime MCP vive en `apps/app`.

## Modelo de datos reutilizado

La conexion Holded no crea un modelo aislado solo para `holded`. Reutiliza el schema operativo del monorepo.

Entidades clave:

- `User`
- `Tenant`
- `Membership`
- `TenantProfile`
- `ExternalConnection`
- `TenantIntegration`
- `IsaakOnboardingProfile`
- `UsageEvent`

## ExternalConnection

Tabla canonica de conexion por proveedor.

Para Holded:

- `provider = "holded"`
- `credentialType = "api_key"`
- `apiKeyEnc` cifrada
- `providerAccountId` como fingerprint tecnico
- `scopesGranted` con modulos o capacidades detectadas
- `connectionStatus`
- `connectedByUserId`
- `connectedAt`
- `lastValidatedAt`
- `lastSyncAt`

## TenantIntegration

Se mantiene como capa de compatibilidad con superficies del producto que todavia leen integraciones desde ahi.

Para Holded:

- `provider = "accounting_api"`
- `apiKeyEnc`
- `status`
- `lastSyncAt`
- `lastError`

## TenantProfile

Se usa para guardar datos de empresa cuando se pueden inferir de Holded o cuando el usuario los completa.

Campos habituales:

- `tradeName`
- `legalName`
- `taxId`
- `representative`
- `email`
- `phone`
- `website`
- `sector`

## IsaakOnboardingProfile

Se usa para el contexto del asistente, no para datos canonicos de empresa.

Campos habituales:

- `preferredName`
- `companyName`
- `roleInCompany`
- `businessSector`
- `teamSize`
- `mainGoals`
- `communicationStyle`
- `likelyKnowledgeLevel`
- `holdedContextSnapshot`

## Flujo backend real

1. El usuario se autentica en `apps/holded`.
2. `POST /api/auth/session` asegura `User`, `Tenant` y `Membership`.
3. El usuario pega la API key en `/onboarding/holded`.
4. `POST /api/holded/validate` prueba la API key sin persistir.
5. `POST /api/holded/connect`:
   - revalida
   - cifra la API key
   - calcula fingerprint
   - guarda o actualiza `ExternalConnection`
   - sincroniza `TenantIntegration`
   - intenta inferir metadatos utiles
   - actualiza `TenantProfile`
   - registra `UsageEvent`
6. El onboarding conversacional escribe `IsaakOnboardingProfile`.
7. El usuario pasa a `isaak.verifactu.business/chat`.
8. El chat y el MCP consumen la conexion Holded ya persistida a nivel tenant.

## Cifrado y seguridad

- cifrado: `AES-256-GCM`
- clave derivada de `INTEGRATIONS_SECRET_KEY` o fallback `SESSION_SECRET`
- fingerprint tecnico: SHA-256 truncado
- nunca se expone la API key en logs, respuestas o audit payloads
- las respuestas publicas solo devuelven `keyMasked`

## Endpoints de apps/holded

### `POST /api/holded/validate`

Valida la API key sin persistir.

### `POST /api/holded/connect`

Conecta o reconecta Holded.

### `DELETE /api/holded/connect`

Desconecta Holded y limpia la credencial persistida.

### `GET /api/holded/status`

Devuelve el estado reutilizable por onboarding, settings y handoff.

### `POST /api/onboarding/profile`

Guarda el contexto inicial de Isaak tras la conexion Holded.

## Metadatos que intentamos inferir

Segun lo que responda Holded, se intenta inferir:

- nombre comercial
- nombre legal
- NIF o codigo similar
- modulos disponibles
- conteos iniciales de muestra

Limitacion importante:

- Holded no nos da aqui un identificador remoto canonico tan claro como querriamos, asi que `providerAccountId` se trata como fingerprint tecnico interno

## Lo que debe consultar el conector MCP

El conector remoto no pide la API key al usuario final. Reutiliza:

- el usuario autenticado en Verifactu
- el tenant activo
- la conexion Holded ya cifrada y persistida

Esto mantiene a Verifactu como frontera de seguridad entre ChatGPT y Holded.

## Ayuda oficial para generar la API key

Fuente oficial recomendada para producto y soporte:

- https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded

## Riesgos conocidos

- la inferencia de datos de empresa depende de endpoints de negocio, no de un endpoint publico de configuracion de compania
- `TenantIntegration` sigue existiendo por compatibilidad y no conviene romperla todavia
- hay artefactos locales sensibles en `apps/holded` que no deberian considerarse parte del runtime

## Referencias internas

- [README.md](./README.md)
- [HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md](./HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md)
