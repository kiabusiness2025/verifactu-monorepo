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

**Variables de entorno (recomendadas)**
- `NEXT_PUBLIC_APP_URL=https://app.verifactu.business` (para que `/demo` apunte a la app real)

**Stripe (si se usa checkout)**
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_YEARLY`

**Email leads (si se usa el formulario)**
- `RESEND_API_KEY`
- Opcional: `LEAD_EMAIL`, `FROM_EMAIL`

**Firebase (si se usa auth en landing)**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Dominio**
- `verifactu.business`

---

## Archivo `.vercelignore`

- Ver [/.vercelignore](.vercelignore)
- Se mantiene solo para ignorar `package-lock.json`.
