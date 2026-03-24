# holded.verifactu.business

Aplicación pública dedicada a la compatibilidad de Isaak con Holded.

## Posicion dentro del monorepo

Este proyecto es el proyecto publico 2 de 3:

- `verifactu.business` -> `apps/landing`
- `holded.verifactu.business` -> `apps/holded`
- `isaak.verifactu.business` -> `apps/isaak`

Comparte backend, sesión y datos con el resto, pero su identidad pública es propia.

## Objetivo

- Presentar una experiencia separada de la marca principal.
- Llevar al usuario por un flujo simple: landing, acceso, conexión y onboarding.
- Mantener backend, usuarios, tenant y sesión compartidos con la app principal.

## Dominio y despliegue

- Dominio público: https://holded.verifactu.business
- Proyecto Vercel independiente dentro del monorepo
- App package: verifactu-holded

## Flujo funcional real

1. El usuario entra en la landing de Holded.
2. Los CTA usan `buildOnboardingUrl()` en [app/lib/holded-navigation.ts](./app/lib/holded-navigation.ts).
3. El CTA entra en [app/auth/holded/page.tsx](./app/auth/holded/page.tsx), que ya renderiza el login compacto dentro del propio subdominio Holded.
4. El login usa Firebase cliente desde [app/lib/firebase.ts](./app/lib/firebase.ts) y crea la cookie compartida desde [app/api/auth/session/route.ts](./app/api/auth/session/route.ts).
5. Con la sesión activa, el usuario continúa al onboarding de la app principal en `https://app.verifactu.business/onboarding/holded`.

Nota: la UI de acceso de Holded ya no debe depender visualmente de `apps/landing`. `landing` puede enlazar a Holded, pero el login de este flujo vive en `apps/holded`.

## Estructura relevante

- `app/layout.tsx`: layout global del proyecto Holded.
- `app/components/HoldedSiteChrome.tsx`: header, navegación y footer legal compartidos. Se ocultan en rutas `/auth/*`.
- `app/lib/holded-navigation.ts`: URLs canónicas de acceso y onboarding.
- `app/lib/firebase.ts`: inicialización de Firebase cliente para login.
- `app/lib/auth.ts`: login por email, Google y Microsoft para Holded.
- `app/lib/serverSession.ts`: creación de la cookie de sesión compartida desde Holded.
- `app/auth/holded/page.tsx`: pantalla de login compacta con marca Holded.
- `app/api/auth/session/route.ts`: verificación del `idToken`, sincronización de usuario/tenant y emisión de cookie `__session`.
- `app/api/checkout/route.ts`: creación de checkout y validación de sesión.
- `app/page.tsx`: landing principal.
- `app/planes/page.tsx`: planes y checkout.
- `app/support/page.tsx`: soporte comercial y operativo.
- `app/privacy/page.tsx`: política de privacidad.
- `app/terms/page.tsx`: condiciones.
- `app/demo-recording/page.tsx`: material público para demo.

## Criterios de UX

- El header y footer se gestionan solo desde `HoldedSiteChrome`.
- Las páginas internas no deben duplicar navegación ni enlaces legales.
- El acceso en `/auth/holded` debe sentirse compacto, claro y enfocado.
- El lenguaje debe ser claro y no técnico para usuario final.
- Si el usuario ya tenía sesión de Firebase en el navegador, el acceso debe rehidratarse y continuar sin pasos extra.

## Variables de entorno

Revisar también [vercel.json](./vercel.json) y el ejemplo de importación del repositorio en [../../holded-vercel-import.env.example](../../holded-vercel-import.env.example).

Variables mínimas relevantes:

- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `HOLDED_PUBLIC_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `SESSION_SECRET`
- `SESSION_COOKIE_DOMAIN`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAMESITE`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_HOLDED_FISCAL_MONTHLY`
- `STRIPE_PRICE_HOLDED_FISCAL_YEARLY`
- `STRIPE_PRICE_HOLDED_MIGRACIONES_MONTHLY`
- `STRIPE_PRICE_HOLDED_MIGRACIONES_YEARLY`

Seguridad de claves AI:

- No usar nunca `NEXT_PUBLIC_ISAAK_API_KEY` ni ninguna clave AI con prefijo `NEXT_PUBLIC_`.
- Las claves AI deben ser solo servidor (`OPENAI_API_KEY` o `CLAVE_API_DE_PROYECTO_EXPERTO`).

## Desarrollo local

Desde la raíz del monorepo:

```bash
pnpm install
pnpm --filter verifactu-holded dev
```

Por defecto arranca en `http://localhost:3011`.

## Validación

Build del proyecto Holded:

```bash
pnpm --filter verifactu-holded build
```

Comprobaciones funcionales recomendadas:

- abrir `/`
- abrir `/auth/holded?source=holded_nav_global`
- verificar login con Google/Microsoft o email
- confirmar redirección a onboarding Holded tras crear la cookie de sesión
- probar `/planes` y el inicio de checkout con sesión válida
