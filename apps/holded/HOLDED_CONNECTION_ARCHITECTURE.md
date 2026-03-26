# Holded Connection Architecture

## Objetivo

Persistir la conexion Holded por API key de forma segura y reutilizable para:

- onboarding gratuito
- dashboard actual
- premium futuro
- nuevas integraciones SaaS

## Modelo de datos final

### User

Representa a la persona autenticada.

Campos clave usados:

- `User.id`
- `User.email`
- `User.authSubject`

### Tenant

Es la organizacion real del usuario. En este flujo equivale a la empresa o espacio de trabajo.

Campos clave usados:

- `Tenant.id`
- `Tenant.name`
- `Tenant.legalName`
- `Tenant.nif`

### Membership

Tabla de union entre usuario y organizacion.

Regla minima:

- un usuario autenticado debe tener una membresia activa
- si no existe, `app/api/auth/session/route.ts` crea tenant + membership + preference
- en el alta por email, `app/api/auth/register/route.ts` ya intenta dejar creado ese tenant inicial para que el acceso posterior sea mas estable

### ExternalConnection

Tabla canonica de conexiones por proveedor.

Para Holded:

- `provider = "holded"`
- `credentialType = "api_key"`
- `apiKeyEnc` cifrada
- `providerAccountId` = fingerprint tecnico de la API key
- `scopesGranted` = modulos validados
- `connectionStatus` = `connected` o `disconnected`
- `connectedByUserId`
- `connectedAt`
- `lastValidatedAt`
- `lastSyncAt`

### TenantIntegration

Capa de compatibilidad con la app principal.

Para Holded:

- `provider = "accounting_api"`
- `apiKeyEnc`
- `status`
- `lastSyncAt`
- `lastError`

### UserOnboarding

Marca el onboarding como completado.

Regla actual:

- al guardar la conexion correctamente se hace `upsert` con `completedAt = now()`

### TenantProfile

Se actualiza cuando se pueden inferir datos utiles del tenant.

Campos usados:

- `source = "holded"`
- `sourceId = providerAccountId`
- `tradeName`
- `legalName`
- `taxId`
- `representative`
- `email`
- `phone`

Regla actual:

- en el registro guardamos nombre completo y telefono si el usuario los facilita
- el nombre de empresa no se pide manualmente
- la empresa visible para el producto debe venir de Holded cuando se conecta la API key

### ExternalConnectionAuditLog

Auditoria segura para eventos de conexion.

Acciones actuales:

- `connect`
- `disconnect`

No se guarda nunca la API key en claro.

## Flujo backend

1. El usuario se autentica.
2. `app/api/auth/session/route.ts` asegura `User`, `Tenant`, `Membership` y `UserPreference`.
3. El usuario pega la API key en `/onboarding/holded`.
4. `POST /api/holded/validate` prueba varios endpoints de Holded sin persistir.
5. `POST /api/holded/connect`:
   - revalida la API key
   - cifra la clave
   - calcula fingerprint
   - guarda `ExternalConnection`
   - guarda `TenantIntegration`
   - intenta inferir metadatos utiles
   - actualiza `Tenant` y `TenantProfile`
   - marca `UserOnboarding.completedAt`
   - escribe audit log seguro
6. `GET /api/holded/status` devuelve el estado reutilizable para dashboard y futuras UIs.
7. `DELETE /api/holded/connect` deja preparada la desconexion futura.

## UX operativa actual

- el login avisa de que el correo debe coincidir con el registrado en Holded para futuros flujos OAuth
- el dashboard usa una experiencia chat-first minimalista
- si el nombre del usuario parece autogenerado desde el email, se pide completar perfil antes de abrir el chat
- el saludo principal usa la hora de `Europe/Madrid`

## Cifrado y proteccion

- algoritmo: `AES-256-GCM`
- clave derivada de `INTEGRATIONS_SECRET_KEY` o fallback de `SESSION_SECRET`
- fingerprint tecnico: SHA-256 truncado, no reversible
- respuestas API siempre devuelven `keyMasked`

## Metadatos guardados

Si Holded responde, se intentan inferir:

- nombre comercial
- nombre legal
- NIF o codigo
- modulos disponibles
- conteos basicos de muestras

Limitacion:

- Holded no expone aqui un `tenant id` claro y estable en este flujo, asi que `providerAccountId` es un fingerprint interno de la credencial, no un identificador remoto oficial.

## Endpoints

### `POST /api/holded/validate`

Valida la API key sin guardar nada.

### `GET /api/holded/status`

Devuelve:

- `connected`
- `status`
- `keyMasked`
- `connectedAt`
- `lastValidatedAt`
- `lastSyncAt`
- `supportedModules`
- `validationSummary`
- `providerAccountId`
- `tenantName`
- `legalName`
- `taxId`

### `POST /api/holded/connect`

Conecta o reconecta.

### `DELETE /api/holded/connect`

Desconecta y limpia la credencial guardada.

## Riesgos conocidos

- la inferencia de metadatos del tenant depende de endpoints de negocio y puede no devolver nombre fiscal perfecto
- el fingerprint no sustituye a un identificador remoto nativo de Holded
- aun no existe UI publica de desconexion, solo endpoint backend
- no hay sync historico ni refresh jobs, solo conexion inicial y chat

## Chat y memoria MVP

El MVP de `apps/holded` reutiliza modelos canonicos ya existentes:

- `IsaakConversation`
- `IsaakConversationMsg`
- `IsaakMemoryFact`

### Reglas de pertenencia

- cada chat pertenece a un `tenantId`
- cada chat pertenece a un `userId`
- `context = "holded_free_dashboard"` delimita este flujo
- la memoria simple se guarda con `scope = "user_private"`

Esto garantiza que:

- cada usuario tiene sus propios chats
- cada chat pertenece a una organizacion concreta
- la memoria no se mezcla entre usuarios del mismo tenant
- cada consulta usa la conexion Holded del `tenantId` activo

### Memoria MVP

Mientras no exista memoria avanzada completa, se guarda solo:

- `chat_preference:last_user_topic`
- `holded_snapshot:latest_snapshot_counts`

Caracteristicas:

- persistente
- acotada por `tenantId + userId`
- sin documentos
- sin embeddings
- sin resumen automatico avanzado

### Endpoints MVP

- `POST /api/holded/chat`
- `GET /api/holded/conversations`
- `POST /api/holded/conversations`
- `GET /api/holded/conversations/[id]`

### Marcadores de evolucion

La estructura ya permite ampliar despues a:

- memoria avanzada por categorias y confirmacion
- documentos por tenant y por chat
- nuevas integraciones por `ExternalConnection.provider`
- multiusuario real con memoria compartida por organizacion o por workspace
