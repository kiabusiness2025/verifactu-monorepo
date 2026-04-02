# holded.verifactu.business

Aplicacion publica de captacion, acceso, conexion Holded por API key y onboarding corto antes del handoff a Isaak.

Este proyecto existe para reducir friccion antes del primer valor: no es el chat principal, no es el runtime del conector MCP y no es el backoffice. Es la puerta de entrada Holded-first.

## Posicion real dentro del monorepo

Dominios y ownership:

- `verifactu.business` -> `apps/landing`
- `holded.verifactu.business` -> `apps/holded`
- `isaak.verifactu.business` -> `apps/isaak`
- `app.verifactu.business` -> `apps/app`
- `admin.verifactu.business` -> `apps/admin`

Lo importante:

- `apps/holded` no es el runtime del conector MCP de ChatGPT
- el servidor MCP y el OAuth del conector viven en `apps/app`
- `apps/holded` prepara al usuario, conecta Holded y entrega el contexto inicial a Isaak

## Que problema resuelve

`apps/holded` debe hacer muy bien solo esta parte del recorrido:

- captar al usuario adecuado
- explicarle con claridad que necesita para conectar Holded
- validar la API key sin generar miedo ni ruido tecnico
- guardar la conexion de forma segura
- recopilar el minimo contexto inicial para arrancar con sentido
- entregar al usuario a Isaak con continuidad

## Objetivo del producto

- reducir friccion desde la landing hasta el primer valor en Isaak
- autenticar al usuario
- conectar Holded por API key
- recopilar el contexto inicial minimo para Isaak
- redirigir al producto principal en `isaak.verifactu.business`

## Como encaja con el conector y con Isaak

La secuencia real es esta:

1. El usuario llega aqui y entiende la propuesta Holded-first.
2. Se autentica y conecta Holded con API key.
3. La conexion se guarda server-side y se asocia al tenant.
4. Esa misma conexion puede reutilizarse despues desde `apps/isaak`.
5. El runtime MCP de `apps/app` puede reutilizarla tambien cuando el acceso es por OAuth o por flujo compartido.

En otras palabras:

- `apps/holded` conecta
- `apps/isaak` conversa y acompana
- `apps/app` expone el conector remoto y el core operativo

## Flujo funcional actual

1. Landing en `/`
2. Alta o acceso en `/auth/holded`
3. Continuidad de verificacion en `/gracias` y `/verificar`
4. Entrada al flujo en `/onboarding`
5. Conexion Holded en `/onboarding/holded`
6. Transicion en `/onboarding/success`
7. Onboarding conversacional en `/onboarding/profile`
8. Handoff privado en `/dashboard`
9. Chat principal en `https://isaak.verifactu.business/chat`

## Cuando debes tocar `apps/holded`

Toca esta app cuando cambias:

- copy publico Holded-first
- formularios de acceso o alta
- ayuda para generar la API key de Holded
- onboarding corto antes de Isaak
- validacion inicial y handoff de la conexion
- correos del flujo Holded

No la toques si el cambio real es:

- scopes, tools o schemas del conector MCP
- endpoints OAuth o `/.well-known/*`
- chat principal, historial o memoria de Isaak

En esos casos, el ownership suele estar en `apps/app` o `apps/isaak`.

## Lo que si vive en apps/holded

- landing especifica de Holded
- acceso y alta con Firebase Auth
- correos del flujo Holded
- validacion y guardado de la API key de Holded
- onboarding conversacional inicial
- handoff a Isaak
- ayuda publica para conseguir la API key

## Lo que no debe vivir aqui

- el chat principal de Isaak
- el backoffice operativo definitivo
- el servidor MCP remoto para ChatGPT
- el OAuth server del conector MCP
- la metadata `/.well-known/*` del conector

Esos ownerships viven en:

- `apps/isaak` para producto conversacional
- `apps/admin` para operaciones
- `apps/app` para el conector MCP, OAuth y el core compartido

## Persistencia e integracion Holded

`apps/holded` reutiliza el modelo operativo del monorepo y no define un modelo aislado propio.

Modelos clave reutilizados:

- `User`
- `Tenant`
- `Membership`
- `TenantProfile`
- `ExternalConnection`
- `TenantIntegration`
- `IsaakOnboardingProfile`
- `UsageEvent`

La API key de Holded:

- se valida primero sin persistir
- se guarda cifrada
- se asocia al `tenantId`
- se reutiliza despues desde `isaak` y desde el MCP del core

Documentacion tecnica:

- [Arquitectura de conexion Holded](./HOLDED_CONNECTION_ARCHITECTURE.md)
- [Configuracion del conector ChatGPT / MCP](./HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md)

## Lectura recomendada segun necesidad

- Quiero tocar el runtime del conector -> [../app/README.md](../app/README.md)
- Quiero entender la conexion compartida -> [HOLDED_CONNECTION_ARCHITECTURE.md](./HOLDED_CONNECTION_ARCHITECTURE.md)
- Quiero registrar el conector en OpenAI -> [HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md](./HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md)
- Quiero entender la app principal Isaak -> [../isaak/README.md](../isaak/README.md)
- Quiero ver el alcance de API que queremos cubrir -> [../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md](../../docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md)

## Estructura relevante

- [app/page.tsx](c:\dev\verifactu-monorepo\apps\holded\app\page.tsx)
- [app/auth/holded/page.tsx](c:\dev\verifactu-monorepo\apps\holded\app\auth\holded\page.tsx)
- [app/onboarding/holded/page.tsx](c:\dev\verifactu-monorepo\apps\holded\app\onboarding\holded\page.tsx)
- [app/onboarding/profile/page.tsx](c:\dev\verifactu-monorepo\apps\holded\app\onboarding\profile\page.tsx)
- [app/dashboard/page.tsx](c:\dev\verifactu-monorepo\apps\holded\app\dashboard\page.tsx)
- [app/api/holded/validate/route.ts](c:\dev\verifactu-monorepo\apps\holded\app\api\holded\validate\route.ts)
- [app/api/holded/connect/route.ts](c:\dev\verifactu-monorepo\apps\holded\app\api\holded\connect\route.ts)
- [app/api/holded/status/route.ts](c:\dev\verifactu-monorepo\apps\holded\app\api\holded\status\route.ts)
- [app/api/onboarding/profile/route.ts](c:\dev\verifactu-monorepo\apps\holded\app\api\onboarding\profile\route.ts)
- [app/lib/holded-integration.ts](c:\dev\verifactu-monorepo\apps\holded\app\lib\holded-integration.ts)
- [app/lib/auth.ts](c:\dev\verifactu-monorepo\apps\holded\app\lib\auth.ts)

## Variables de entorno clave

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `SESSION_SECRET`
- `SESSION_COOKIE_DOMAIN`
- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `HOLDED_PUBLIC_URL`
- `INTEGRATIONS_SECRET_KEY` o `INTEGRATION_SECRET_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY`
- `NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID`
- `NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY`
- `NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN`
- `NEXT_PUBLIC_HOLDED_ENABLE_GOOGLE_LOGIN`
- `RESEND_API_KEY`
- `RESEND_FROM`

### Bloque exacto para Vercel o local

```env
NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID=your-firebase-app-id
NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY=your-recaptcha-v3-site-key
NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN=your-app-check-debug-token
NEXT_PUBLIC_HOLDED_SITE_URL=https://holded.verifactu.business
NEXT_PUBLIC_HOLDED_ENABLE_GOOGLE_LOGIN=true
```

Notas:

- `NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY` es obligatoria si App Check esta activado en Firebase para la app web de Holded.
- `NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN` solo debe usarse en local o en una fase temporal de diagnostico.
- no guardes API keys reales ni debug tokens en el repo.

### Firebase App Check

Estado real del proyecto:

- `apps/holded` ya inicializa App Check en frontend si existe `NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY`
- tambien soporta debug token mediante `NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN`
- el endpoint de diagnostico es:
  - `/api/auth/google/diagnostics`

Pasos recomendados en Firebase:

1. Firebase Console -> App Check -> selecciona la app web de Holded.
2. Crea o reutiliza una `reCAPTCHA v3 site key`.
3. Publica la site key en Vercel como `NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY`.
4. Para pruebas locales, registra un debug token en App Check y publicalo solo en tu entorno local como `NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN`.
5. Solo despues de comprobar login con email y Google, activa enforcement.

Si ves este error:

- `auth/firebase-app-check-token-is-invalid`

revisa primero:

- site key incorrecta
- debug token no registrado en Firebase App Check
- enforcement activado antes de tener App Check inicializado correctamente en la web
- mezcla de proyecto Firebase y claves de otro proyecto

## Checklist operativo

Antes de probar el flujo publico:

1. Firebase Email/Password habilitado.
2. Si se usa Google, provider Google habilitado en Firebase.
3. `holded.verifactu.business` dado de alta como authorized domain en Firebase.
4. Si App Check esta activo, `NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY` configurada y valida.
5. Si pruebas en local con debug token, registrarlo en Firebase App Check y usar `NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN`.
6. `SESSION_SECRET` compartido con `isaak` si se quiere handoff sin login repetido.
7. Holded conectado desde el flujo de onboarding.

## Ayuda oficial de Holded

Para explicar al usuario como generar la API key, usar como fuente principal:

- https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded

Resumen operativo:

- requiere plan de pago de Holded
- normalmente necesita rol `Owner` o `Administrador`
- se genera desde configuracion de desarrolladores

## Hallazgos de auditoria de este proyecto

Puntos a vigilar:

- hay artefactos locales sensibles en la raiz de `apps/holded` que no deberian permanecer ahi a largo plazo
- `apps/holded` contiene archivos de trabajo local como `.next`, `.vercel` y `node_modules`
- habia documentacion mezclando `apps/holded` con el runtime MCP de ChatGPT; esto ya debe considerarse incorrecto
- la documentacion historica con referencias al dashboard/chat final dentro de `holded` ya no refleja el ownership actual

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

## Resumen corto para el equipo

- `apps/holded` vende, autentica, conecta y entrega
- no publica el MCP ni el OAuth del conector
- si el usuario ve mal el onboarding o no entiende como sacar la API key, el cambio va aqui
- si ChatGPT no ve scopes o tools, el cambio no va aqui sino en `apps/app`
