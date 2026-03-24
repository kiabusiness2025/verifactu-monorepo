# holded.verifactu.business

Aplicacion publica dedicada a la compatibilidad de Isaak con Holded.

## Objetivo

- Presentar una experiencia separada de la marca principal.
- Llevar al usuario por un flujo simple: login, conexion de Holded y chat.
- Mantener backend, usuarios, tenant y contexto compartidos con la app principal.

## Dominio y despliegue

- Dominio publico: https://holded.verifactu.business
- Proyecto Vercel independiente dentro del monorepo
- App package: verifactu-holded

## Flujo funcional

1. El usuario entra en la landing de Holded.
2. Los CTA usan `buildOnboardingUrl()` en [app/lib/holded-navigation.ts](./app/lib/holded-navigation.ts).
3. El flujo redirige dentro del subdominio `https://holded.verifactu.business`.
4. El usuario completa la conexion y vuelve al flujo de planes/chat en Holded.

Nota: el chat de Isaak requiere sesion iniciada y cuenta conectada. No debe ofrecerse como experiencia anonima.

## Estructura relevante

- `app/layout.tsx`: layout global del proyecto Holded.
- `app/components/HoldedSiteChrome.tsx`: header, navegacion y footer legal compartidos.
- `app/lib/holded-navigation.ts`: URLs canonicas de login, onboarding y chat.
- `app/page.tsx`: landing principal.
- `app/planes/page.tsx`: planes y checkout.
- `app/support/page.tsx`: soporte comercial y operativo.
- `app/privacy/page.tsx`: politica de privacidad.
- `app/terms/page.tsx`: condiciones.
- `app/demo-recording/page.tsx`: material publico para demo.
- `app/api/checkout/route.ts`: creacion de checkout y redireccion compatible con auth.

## Criterios de UX

- El header y footer se gestionan solo desde `HoldedSiteChrome`.
- Las paginas internas no deben duplicar navegacion ni enlaces legales.
- El onboarding debe sentirse como una ventana enfocada, con salida clara.
- La pantalla de carga debe mantenerse blanca, limpia y centrada en la conexion ChatGPT + Holded.
- El lenguaje debe ser claro y no tecnico para usuario final.

## Variables de entorno

Revisar tambien [vercel.json](./vercel.json) y el ejemplo de importacion del repositorio en [../../holded-vercel-import.env.example](../../holded-vercel-import.env.example).

Variables habituales:

- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_HOLDED_PRICE_ID`
- `STRIPE_HOLDED_FISCAL_PRICE_ID`
- `STRIPE_HOLDED_FISCAL_YEARLY_PRICE_ID`
- `STRIPE_HOLDED_MIGRACIONES_PRICE_ID`
- `STRIPE_HOLDED_MIGRACIONES_YEARLY_PRICE_ID`

## Desarrollo local

Desde la raiz del monorepo:

```bash
pnpm --filter verifactu-holded dev
```

Por defecto arranca en `http://localhost:3011`.

## Validacion

Build del proyecto Holded:

```bash
pnpm --filter verifactu-holded build
```

Si se toca onboarding o login en la app principal, validar tambien:

```bash
pnpm --filter verifactu-app build
```
