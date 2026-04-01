# ✅ Checklist Configuración Vercel - Ambos Proyectos

## 🎯 CRITICAL: Framework Detection

Para que Vercel detecte **Next.js automáticamente**, cada proyecto DEBE tener en Vercel Dashboard:

### **PROYECTO 1: verifactu-landing**

URL: `https://vercel.com/kisenias-projects/verifactu-landing/settings`

#### Build & Development Settings:

- [ ] **Framework**: `Next.js` (debe estar autodetectado)
- [ ] **Root Directory**: `apps/landing` ← **CRÍTICO**
- [ ] **Build Command**: `pnpm run build` (heredado de vercel.json)
- [ ] **Install Command**: `pnpm install --frozen-lockfile`
- [ ] **Development Command**: `pnpm run dev`
- [ ] **Output Directory**: (dejar en blanco - Next.js lo auto-detecta)

#### Environment Variables (Settings → Environment Variables):

ℹ️ **Obtener valores de:** `apps/landing/.env.local` (no incluidos aquí por seguridad)

```
NEXT_PUBLIC_FIREBASE_API_KEY=<from .env.local>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=verifactu-business.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=536174799167
NEXT_PUBLIC_FIREBASE_APP_ID=<from .env.local>
NEXT_PUBLIC_USE_AUTH_EMULATOR=false

ISAAK_OPENAI_SERVICE_ACCOUNT=<from .env.local>
ISAAK_OPENAI_MODEL=gpt-4.1-mini

RESEND_API_KEY=<from .env.local>
RESEND_FROM=Verifactu Business <no-reply@verifactu.business>

STRIPE_SECRET_KEY=<from .env.local>

ORGANIZATION_CIF=B44991776
ORGANIZATION_NAME=Expert Estudios Profesionales, SLU
ORGANIZATION_ADDRESS=C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)

NEXT_PUBLIC_SITE_URL=https://verifactu.business
NEXT_PUBLIC_SUPPORT_EMAIL=soporte@verifactu.business
```

---

### **PROYECTO 2: verifactu-app**

URL: `https://vercel.com/kisenias-projects/verifactu-app/settings`

#### Build & Development Settings:

- [ ] **Framework**: `Next.js` (debe estar autodetectado)
- [ ] **Root Directory**: `apps/app` ← **CRÍTICO**
- [ ] **Build Command**: `pnpm run build` (heredado de vercel.json)
- [ ] **Install Command**: `pnpm install --frozen-lockfile`
- [ ] **Development Command**: `pnpm run dev`
- [ ] **Output Directory**: (dejar en blanco - Next.js lo auto-detecta)

#### Environment Variables (Settings → Environment Variables):

Usa las mismas que verifactu-landing (obtén valores de `apps/landing/.env.local`)

---

## 🔧 Si Vercel NO detecta Next.js:

### Opción A: Force Framework in vercel.json (YA HECHO ✅)

Los `vercel.json` ya tienen `"framework": "nextjs"` definido.

### Opción B: Manual Override en Dashboard

Si aún no detecta:

1. Ve a Project Settings
2. En "Build & Development":
   - Busca "Framework"
   - Selecciona manualmente "Next.js"
   - Guarda

---

## 🚀 Test Deploy

Después de configurar:

1. Ve a **Deployments** en cada proyecto
2. Click en el botón **"Deploy"** (redeploy manual)
3. Monitorea los logs para ver si detecta Next.js

**Debes ver en logs:**

```
▲ Next.js 14.2.35
Creating an optimized production build...
```

---

## ❌ Common Issues & Solutions

| Issue                                 | Solución                                                              |
| ------------------------------------- | --------------------------------------------------------------------- |
| "No se detectó la versión de Next.js" | Asegurar que **Root Directory** = `apps/landing` o `apps/app`         |
| Build falla con `pnpm not found`      | Verificar que installCommand = `pnpm install --frozen-lockfile`       |
| Tipo error con `@verifactu/ui`        | Verificar que `transpilePackages: ['@verifactu/ui']` en next.config   |
| 404 en producción                     | Verificar que `outputDirectory` está en blanco (auto-detecta `.next`) |

---

## ✅ Validation Checklist

- [ ] Root Directory configurado correctamente (apps/landing, apps/app)
- [ ] Framework = Next.js (autodetectado o manual)
- [ ] buildCommand = `pnpm run build`
- [ ] installCommand = `pnpm install --frozen-lockfile`
- [ ] Todas las env vars agregadas
- [ ] Deploy manual trigger exitoso
- [ ] Logs muestran "Next.js 14.2.35"
- [ ] URL principal no retorna 404
