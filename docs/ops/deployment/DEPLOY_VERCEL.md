---

## Sincronización de productos y precios en Stripe

Para actualizar productos/precios de los planes:

1. Elige la clave de Stripe (`sk_test_...` para pruebas, `sk_live_...` para producción).
2. Ejecuta en PowerShell (Windows):

   $env:STRIPE_SECRET_KEY="sk_live_xxx"; node scripts/stripe/sync-products.mjs

   (Sustituye por tu clave real. El script imprime los STRIPE_PRICE_* que debes copiar a Vercel.)

3. Copia los STRIPE_PRICE_* resultantes a las variables de entorno del proyecto “landing” en Vercel.

---

## Ajustes de navegación y protección (app/landing)

**Rutas y enlaces:**

- Header.tsx: el botón “Dashboard” apunta a `/dashboard` en app.verifactu.business.
- page.tsx (landing): la demo abre `/demo` en la app.
- Tras login/signup (incluido Google), redirige a `/dashboard`; si ya hay sesión, también va a `/dashboard`.

**Helpers de URLs:**

- Nuevo `urls.ts` con `getLandingUrl()` (default https://www.verifactu.business) y `getAppUrl()` (default https://app.verifactu.business), sin barras finales.

**Topbar:**

- Topbar.tsx: saludo de Isaak, link a la landing, selector de empresa y botón Isaak.

**Nav preparado para RBAC futuro:**

- nav.ts: items incluyen `roles?: string[]` (placeholder para RBAC) y rutas base `/dashboard/...`.

**Middleware de protección:**

- `middleware.ts` protege `/dashboard` y `/dashboard/*`.
  - Si no hay sesión (cookies estándar), redirige a `https://www.verifactu.business/auth/login?next=<url-actual>`.
  - Si hay sesión y accede a `/`, redirige a `/dashboard`.
  - Si hay sesión en `/dashboard`, deja pasar.
- `/demo` y `/demo/*` son públicos (sin login).
- `/api/admin/check` mantiene compatibilidad y responde `200` con `isAdmin: false`.
- `/api/admin/*` responde `410` (legacy admin API removed).
- Config matcher: `/`, `/dashboard/:path*`, `/onboarding`, `/demo/:path*`, `/api/admin/:path*`.

**Notas:**

- El guard comprueba cookies estándar; ajusta `hasSession` si usas otro nombre de cookie/token.
- En Topbar se usa `getLandingUrl()`; en la landing usa `NEXT_PUBLIC_APP_URL` (debe ser https://app.verifactu.business en Vercel).

# Deploy en Vercel (monorepo)

Este repo tiene **dos proyectos separados** en Vercel:

- **Landing**: `verifactu.business` (proyecto Vercel apuntando a `apps/landing`)
- **App (dashboard)**: `app.verifactu.business` (proyecto Vercel apuntando a `apps/app`)

> Nota: en Vercel pueden aparecer también dominios `.vercel.app` (automáticos). No hace falta tocarlos.

---

## Reglas clave (para no volver a romper el deploy)

- No ignores `pnpm-lock.yaml` en `.vercelignore`.
  - Si falta el lockfile, `pnpm install --frozen-lockfile` falla en CI.
- Cada proyecto en Vercel debe usar su **Root Directory** correcto.
- Node recomendado: **20.x**.

---

## Proyecto 1 — App (apps/app)

**Root Directory**

- `apps/app`

**Config en repo**

- [apps/app/vercel.json](apps/app/vercel.json)

**Comandos (si Vercel los pide)**

- Install: `cd ../.. && npx -y pnpm@10.27.0 install --frozen-lockfile`
- Build: `cd ../.. && npx -y pnpm@10.27.0 --filter verifactu-app build`

**Postbuild importante (fix Vercel)**

- Se ejecuta `postbuild` para evitar el error de Vercel:
  - `ENOENT ... page_client-reference-manifest.js`
- Script:
  - [apps/app/scripts/fix-client-reference-manifests.mjs](apps/app/scripts/fix-client-reference-manifests.mjs)

**Variables de entorno (mínimas)**

- Opcional: `NEXT_PUBLIC_API_BASE` (si no se quiere usar el default `https://api.verifactu.business`).

**Dominio**

- `app.verifactu.business`

---

## Proyecto 2 — Landing (apps/landing)

**Root Directory**

- `apps/landing`

**Config en repo**

- [apps/landing/vercel.json](apps/landing/vercel.json)

**Comandos (si Vercel los pide)**

- Install: `cd ../.. && npx -y pnpm@10.27.0 install --frozen-lockfile`
- Build: `cd ../.. && npx -y pnpm@10.27.0 turbo run build --filter=verifactu-landing`

**Variables de entorno recomendadas (landing)**

**URLs y organización**

- `NEXT_PUBLIC_APP_URL=https://app.verifactu.business`  
  (para que `/demo` apunte a la app real)
- `NEXT_PUBLIC_SITE_URL=https://verifactu.business`
- `NEXT_PUBLIC_SUPPORT_EMAIL=soporte@verifactu.business`
- `ORGANIZATION_CIF=B44991776`
- `ORGANIZATION_NAME="Expert Estudios Profesionales, SLU"`
- `ORGANIZATION_ADDRESS="C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)"`

**Stripe (checkout con calculadora de precios)**

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (para recibir eventos en `/api/stripe/webhook`)
- `STRIPE_PRICE_BASE_MONTHLY`
- `STRIPE_PRICE_COMPANY_UNIT_MONTHLY`
- `STRIPE_PRICE_INVOICES_51_200_MONTHLY`
- `STRIPE_PRICE_INVOICES_201_500_MONTHLY`
- `STRIPE_PRICE_INVOICES_501_1000_MONTHLY`
- `STRIPE_PRICE_INVOICES_1001_2000_MONTHLY`
- `STRIPE_PRICE_MOV_1_200_MONTHLY`
- `STRIPE_PRICE_MOV_201_800_MONTHLY`
- `STRIPE_PRICE_MOV_801_2000_MONTHLY`
- `STRIPE_PRICE_MOV_2001_5000_MONTHLY`

**Firebase (autenticación en landing)**

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_USE_AUTH_EMULATOR` (opcional, solo local)
- `FIREBASE_SERVICE_ACCOUNT` ⚠️ **REQUERIDO** - Service Account JSON para validar tokens  
  Ver [FIREBASE_ADMIN_CONFIG.md](apps/landing/FIREBASE_ADMIN_CONFIG.md) para instrucciones

**Google AI (Genkit con Gemini)**

- `GOOGLE_AI_API_KEY` ⚠️ **REQUERIDO** - API Key de Google AI para Isaak chat  
  Obtener en [Google AI Studio](https://makersuite.google.com/app/apikey)

**Isaak Chat / OpenAI (Legacy, deprecado)**

- `ISAAK_API_KEY` (ya no se usa, reemplazado por Genkit)
- `ISAAK_ASSISTANT_ID` (ya no se usa)
- `NEXT_PUBLIC_ISAAK_API_KEY` (compatibilidad)
- `NEXT_PUBLIC_ISAAK_ASSISTANT_ID` (compatibilidad)

**Resend Email Service (leads)**

- `RESEND_API_KEY`
- `RESEND_FROM`

**Notas**

- Si usas el formulario de contacto/leads, puedes añadir `LEAD_EMAIL` y `FROM_EMAIL`.
- Para sincronizar productos/precios en Stripe, ejecuta: `$env:STRIPE_SECRET_KEY="sk_xxx"; node scripts/stripe/sync-products.mjs`
- Copia los `STRIPE_PRICE_*` que imprime el script a las variables de entorno en Vercel.
- Para configurar el webhook de Stripe:
  1. Ve a Stripe Dashboard → Webhooks
  2. Añade endpoint: `https://verifactu.business/api/stripe/webhook`
  3. Eventos recomendados: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
  4. Copia el "Signing secret" y configúralo como `STRIPE_WEBHOOK_SECRET`

**Dominio**

- `verifactu.business`

---

## Archivo `.vercelignore`

- Ver [/.vercelignore](.vercelignore)
- Se mantiene solo para ignorar `package-lock.json`.
