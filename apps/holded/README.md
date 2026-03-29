# holded.verifactu.business

Aplicacion publica de captacion, acceso, conexion Holded por API key y onboarding corto antes del handoff a Isaak.

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

## Objetivo del producto

- reducir friccion desde la landing hasta el primer valor en Isaak
- autenticar al usuario
- conectar Holded por API key
- recopilar el contexto inicial minimo para Isaak
- redirigir al producto principal en `isaak.verifactu.business`

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
- `NEXT_PUBLIC_HOLDED_ENABLE_GOOGLE_LOGIN`
- `RESEND_API_KEY`
- `RESEND_FROM`

## Checklist operativo

Antes de probar el flujo publico:

1. Firebase Email/Password habilitado.
2. Si se usa Google, provider Google habilitado en Firebase.
3. `holded.verifactu.business` dado de alta como authorized domain en Firebase.
4. `SESSION_SECRET` compartido con `isaak` si se quiere handoff sin login repetido.
5. Holded conectado desde el flujo de onboarding.

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
