# holded.verifactu.business

Aplicacion publica dedicada al onboarding y uso gratuito de Isaak con Holded.

## Posicion dentro del monorepo

Este proyecto es el dominio publico de Holded:

- `verifactu.business` -> `apps/landing`
- `holded.verifactu.business` -> `apps/holded`
- `isaak.verifactu.business` -> `apps/isaak`

Comparte base de datos, sesion y modelos con el resto, pero su experiencia publica es propia.

## Regla de aislamiento

- `apps/holded` solo sirve `holded.verifactu.business`
- no resolver aqui rutas de `verifactu.business` ni `isaak.verifactu.business`
- los emails de Holded deben salir desde `@holded.verifactu.business`
- no reutilizar configuracion publica de landing para auth o branding de Holded

## Objetivo del producto

- llevar al usuario por un flujo simple y sin friccion
- centrar la experiencia en la version gratuita
- conectar Holded por API key, no por OAuth
- dejar la persistencia preparada para premium y futuras integraciones

## Flujo funcional actual

1. Landing en `/`
2. Alta o login en `/auth/holded`
3. Gracias en `/gracias`
4. Verificacion en `/verificar`
5. Onboarding en `/onboarding`
6. Conexion Holded en `/onboarding/holded`
7. Exito en `/onboarding/success`
8. Dashboard en `/dashboard`
9. Primer chat via `/api/holded/chat`

## Alta y acceso

### Registro actual

En `/auth/holded?mode=register` pedimos:

- nombre completo
- correo electronico
- telefono opcional
- contrasena

Reglas UX actuales:

- el correo debe coincidir con el que el usuario tiene en Holded para facilitar OAuth y unificacion futura
- el aviso visible en login se mantiene corto: `Usa el mismo correo que tienes registrado en Holded`
- el usuario puede decidir si quiere recordar la sesion en este dispositivo
- el nombre de empresa no se pide en el alta
- la empresa se detecta despues al conectar la API key de Holded

### Perfil minimo antes del chat

El dashboard intenta saludar al usuario por su nombre real.

Si el nombre guardado parece un valor automatico derivado del email:

- se muestra un paso corto para completar perfil antes de abrir el chat
- al guardar el nombre, el saludo pasa a usarlo directamente

## Dashboard y chat

Direccion UX actual:

- layout minimalista tipo chat-first
- sidebar pequena con historial
- estado de conexion Holded discreto
- gestion de conexion plegada
- chat centrado como pantalla principal
- saludo segun hora de `Europe/Madrid`

Regla de acceso actual:

- si el login llega sin parametro `next`, la entrada por defecto va a `/dashboard`
- onboarding solo se abre cuando el flujo lo pide explicitamente

Reglas de contenido:

- no mostrar mensajes contradictorios de “conectado” si no hay API key activa
- la empresa visible en la experiencia principal debe venir de Holded
- datos como telefono o preferencias deben vivir en configuracion de perfil, no en el lienzo principal del chat

## Persistencia e integracion Holded

El diseño persistente actual reutiliza modelos existentes del monorepo:

- `User`: identidad autenticada
- `Tenant`: organizacion real del usuario
- `Membership`: relacion usuario-organizacion
- `ExternalConnection`: conexion canónica por proveedor
- `TenantIntegration`: capa de compatibilidad con el resto del producto
- `UserOnboarding`: marca de onboarding completado

La conexion Holded se guarda por `tenantId + provider=holded` en `external_connections`, con:

- `credentialType=api_key`
- `apiKeyEnc` cifrada en AES-256-GCM
- `providerAccountId` como fingerprint no reversible de la API key
- `scopesGranted` como lista de modulos validados
- `connectionStatus`, `connectedAt`, `lastValidatedAt`, `lastSyncAt`

En paralelo se mantiene `tenant_integrations` con `provider=accounting_api` para compatibilidad.

Tambien se actualiza:

- `tenants.name`, `tenants.legal_name`, `tenants.nif` si se pueden inferir
- `tenant_profiles` con `source=holded`
- `tenant_profiles.representative`, `tenant_profiles.email`, `tenant_profiles.phone` desde el alta cuando el usuario los facilita
- `user_onboarding.completed_at` cuando la conexion se guarda correctamente
- `external_connection_audit_logs` con acciones `connect` y `disconnect` sin exponer secretos

Documentacion tecnica detallada:

- [HOLDED_CONNECTION_ARCHITECTURE.md](./HOLDED_CONNECTION_ARCHITECTURE.md)

## Estructura relevante

- `app/page.tsx`: landing gratuita
- `app/auth/holded/page.tsx`: acceso y alta
- `app/gracias/page.tsx`: gracias canonica
- `app/verificar/page.tsx`: continuidad tras verificaciòn
- `app/onboarding/page.tsx`: entrada al onboarding
- `app/onboarding/holded/page.tsx`: pantalla de pegar API key
- `app/onboarding/success/page.tsx`: exito y acceso al dashboard
- `app/dashboard/page.tsx`: dashboard privado
- `app/api/auth/session/route.ts`: sincronizacion de usuario, tenant y cookie
- `app/api/auth/register/route.ts`: alta y correo de verificacion
- `app/api/holded/validate/route.ts`: validacion de API key
- `app/api/holded/connect/route.ts`: conectar, reconectar y desconectar
- `app/api/holded/status/route.ts`: estado actual de la conexion
- `app/api/holded/chat/route.ts`: primer chat sobre datos Holded
- `app/api/holded/conversations/route.ts`: listado y creacion de chats del usuario
- `app/api/holded/conversations/[id]/route.ts`: detalle de un chat concreto del usuario
- `app/lib/holded-integration.ts`: cifrado, validacion, persistencia y auditoria
- `app/lib/holded-chat.ts`: conversaciones, mensajes y memoria MVP
- `app/lib/holded-session.ts`: resolucion de sesion Holded
- `middleware.ts`: guard de onboarding y dashboard

## Variables de entorno clave

- `DATABASE_URL`
- `SESSION_SECRET`
- `SESSION_COOKIE_DOMAIN`
- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `HOLDED_PUBLIC_URL`
- `HOLDED_API_BASE_URL` opcional
- `HOLDED_TIMEOUT_MS` opcional
- `INTEGRATIONS_SECRET_KEY` o `INTEGRATION_SECRET_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY` o `NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` o `NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` o `NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` o `NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` o `NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID` o `NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID`
- `RESEND_API_KEY`
- `RESEND_FROM`

## Seguridad

- no exponer nunca la API key en logs, respuestas ni audit payloads
- almacenar la API key solo cifrada
- mostrar al usuario solo mensajes seguros y cortos
- usar `providerAccountId` como fingerprint tecnico, no como secreto reutilizable

## Desarrollo local

Desde la raiz:

```bash
pnpm install
pnpm --filter verifactu-holded dev
```

Build:

```bash
pnpm --filter verifactu-holded build
```

## Validacion funcional recomendada

- abrir `/`
- crear acceso en `/auth/holded?mode=register`
- revisar `/gracias`
- confirmar `/verificar`
- entrar en `/onboarding`
- pegar API key valida en `/onboarding/holded`
- confirmar `/onboarding/success`
- entrar en `/dashboard`
- revisar `GET /api/holded/status`

## OAuth de Google

Aunque Holded se conecta por API key, el acceso del usuario sigue usando Firebase Auth.

Checklist minimo:

1. Firebase Authentication -> Google enabled
2. Authorized domains:
   - `holded.verifactu.business`
   - `localhost`
   - `verifactu-business.firebaseapp.com`
3. Redirect URI:
   - `https://verifactu-business.firebaseapp.com/__/auth/handler`

Endpoint de diagnostico:

- `GET /api/auth/google/diagnostics`
