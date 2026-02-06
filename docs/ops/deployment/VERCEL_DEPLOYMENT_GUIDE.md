# 🚀 Guía de Despliegue en Vercel

## Proyectos Configurados

Ambos proyectos están configurados en Vercel:

- **verifactu-landing**: `apps/landing`
- **verifactu-app**: `apps/app`

---

## 📋 Variables de Entorno a Configurar

### En Dashboard de Vercel → Project Settings → Environment Variables

Agrega estas variables en **AMBOS PROYECTOS**:

#### Firebase Configuration

```
NEXT_PUBLIC_FIREBASE_API_KEY=<your-firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=verifactu-business.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=536174799167
NEXT_PUBLIC_FIREBASE_APP_ID=1:536174799167:web:cecdc93b701e133869cb8a
NEXT_PUBLIC_USE_AUTH_EMULATOR=false
```

#### Isaak / OpenAI Configuration

```
ISAAK_API_KEY=<your-openai-api-key>
ISAAK_ASSISTANT_ID=<your-assistant-id>
NEXT_PUBLIC_ISAAK_API_KEY=<your-openai-api-key>
NEXT_PUBLIC_ISAAK_ASSISTANT_ID=<your-assistant-id>
```

#### Email Service (Resend)

```
RESEND_API_KEY=<your-resend-api-key>
RESEND_FROM=Verifactu Business <no-reply@verifactu.business>
```

#### Payment Processing (Stripe)

```
STRIPE_SECRET_KEY=<your-stripe-secret-key>
```

#### Organization Data

```
ORGANIZATION_CIF=B44991776
ORGANIZATION_NAME=Expert Estudios Profesionales, SLU
ORGANIZATION_ADDRESS=C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)
```

#### URLs

```
NEXT_PUBLIC_SITE_URL=https://verifactu.business
NEXT_PUBLIC_SUPPORT_EMAIL=soporte@verifactu.business
```

---

## 🔧 Pasos para Desplegar

### 1. Para **verifactu-landing**:

1. Ve a: `https://vercel.com/kisenias-projects/verifactu-landing/settings/environment-variables`
2. Agrega todas las variables de arriba
3. Despliega: Push a `main` o triggerear manualmente desde Vercel UI

### 2. Para **verifactu-app**:

1. Ve a: `https://vercel.com/kisenias-projects/verifactu-app/settings/environment-variables`
2. Agrega todas las variables de arriba
3. Despliega: Push a `main` o triggerear manualmente desde Vercel UI

---

## ✅ Build Settings (Ya Configurados)

**verifactu-landing:**

- Framework: Next.js
- Build Command: `npm run build`
- Install Command: Default
- Output Directory: `.next`
- Root Directory: `apps/landing`

**verifactu-app:**

- Framework: Next.js
- Build Command: `pnpm run build`
- Install Command: `pnpm install --frozen-lockfile`
- Output Directory: `.next`
- Root Directory: `apps/app`

---

## 🚀 Trigger Deploys

Opción 1: **Push a main** (automático)

```bash
git push origin main
```

Opción 2: **Manual en Vercel Dashboard**

- Click en "Deployments" → "Deploy" button

---

## 📝 Checklist de Verificación

- [ ] Variables de entorno en **verifactu-landing**
- [ ] Variables de entorno en **verifactu-app**
- [ ] Ambos proyectos ejecutan builds sin errores
- [ ] Landing es accesible en su URL
- [ ] App es accesible en su URL
- [ ] Firebase conecta correctamente
- [ ] Isaak/OpenAI funciona
