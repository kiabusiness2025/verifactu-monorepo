# 🚀 Guía Visual: Configurar Vercel para Next.js Detection

## Paso 1: Verificar Root Directory en Vercel Dashboard

### **verifactu-landing**
1. Ve a: https://vercel.com/kisenias-projects/verifactu-landing/settings/general
2. Busca **"Root Directory"** (debería estar en los "Build & Development Settings")
3. ❌ Si está vacío o muestra `/` → **PROBLEMA** (Vercel no sabe dónde está el código Next.js)
4. ✅ Debe ser: `apps/landing`
5. Si no es así, cámbialo y guarda

### **verifactu-app**
1. Ve a: https://vercel.com/kisenias-projects/verifactu-app/settings/general
2. Busca **"Root Directory"**
3. ✅ Debe ser: `apps/app`
4. Si no es así, cámbialo y guarda

---

## Paso 2: Forzar Redeploy después de cambios

Después de cambiar Root Directory:

### **verifactu-landing**
1. Ve a: https://vercel.com/kisenias-projects/verifactu-landing/deployments
2. Click en el último deployment (o usa el botón "Deploy" del dropdown)
3. Selecciona "Redeploy"
4. Monitorea los logs

### **verifactu-app**
1. Ve a: https://vercel.com/kisenias-projects/verifactu-app/deployments
2. Click "Redeploy" en el último deployment
3. Monitorea los logs

---

## Paso 3: Verificar Framework Detection en Logs

Durante el redeploy, en los **Build Logs** debes ver:

```
▲ Next.js 14.2.35
Creating an optimized production build...
```

Si ves esto:
- ✅ Framework fue detectado correctamente
- ✅ Build debería continuar exitosamente

Si NO ves esto y ves "no se detectó":
- ⚠️ Root Directory está mal configurado
- ⚠️ O vercel.json tiene problemas
- Verifica paso 1 de nuevo

---

## Paso 4: Agregar Environment Variables

### **Para ambos proyectos:**

1. **verifactu-landing**: Ve a Settings → Environment Variables
   - https://vercel.com/kisenias-projects/verifactu-landing/settings/environment-variables

2. **verifactu-app**: Ve a Settings → Environment Variables
   - https://vercel.com/kisenias-projects/verifactu-app/settings/environment-variables

3. **Para CADA proyecto, agrega TODAS estas variables:**

| Variable | Valor | Desde Archivo |
|----------|-------|---------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | - | apps/landing/.env.local |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `verifactu-business.firebaseapp.com` | - |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `verifactu-business` | - |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `verifactu-business.firebasestorage.app` | - |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `536174799167` | - |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | - | apps/landing/.env.local |
| `NEXT_PUBLIC_USE_AUTH_EMULATOR` | `false` | - |
| `ISAAK_API_KEY` | - | apps/landing/.env.local |
| `ISAAK_ASSISTANT_ID` | - | apps/landing/.env.local |
| `NEXT_PUBLIC_ISAAK_API_KEY` | - | apps/landing/.env.local |
| `NEXT_PUBLIC_ISAAK_ASSISTANT_ID` | - | apps/landing/.env.local |
| `RESEND_API_KEY` | - | apps/landing/.env.local |
| `RESEND_FROM` | `Verifactu Business <no-reply@verifactu.business>` | - |
| `STRIPE_SECRET_KEY` | - | apps/landing/.env.local |
| `ORGANIZATION_CIF` | `B44991776` | - |
| `ORGANIZATION_NAME` | `Expert Estudios Profesionales, SLU` | - |
| `ORGANIZATION_ADDRESS` | `C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)` | - |
| `NEXT_PUBLIC_SITE_URL` | `https://verifactu.business` | - |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `soporte@verifactu.business` | - |

---

## Paso 5: Redeploy con Environment Variables

Después de agregar todas las variables:

1. **verifactu-landing**: Ve a Deployments y redeploy
2. **verifactu-app**: Ve a Deployments y redeploy
3. Espera a que los builds terminen

---

## ✅ Validation Final

### Debería ver en logs:
```
▲ Next.js 14.2.35
Creating an optimized production build...
[...]
✓ Ready in 42s
✓ Deployed to Production
```

### Debería poder acceder:
- Landing: https://verifactu.business (o tu dominio)
- App: https://app.verifactu.business (o tu dominio)

---

## ❌ Si algo sigue fallando...

### Error: "no se detectó la versión de Next.js"
**Checklist:**
- [ ] Root Directory = `apps/landing` (landing) o `apps/app` (app)
- [ ] vercel.json tiene `"framework": "nextjs"`
- [ ] Existe un `next.config.js` o `next.config.mjs` en `apps/landing` o `apps/app`
- [ ] Package.json tiene `next` en dependencies

### Error: "@verifactu/ui not found"
**Checklist:**
- [ ] `next.config.js` tiene `transpilePackages: ['@verifactu/ui']`
- [ ] pnpm install fue ejecutado (vercel.json tiene `installCommand: "pnpm install --frozen-lockfile"`)

### Error: "pnpm: command not found"
**Checklist:**
- [ ] vercel.json tiene `"installCommand": "pnpm install --frozen-lockfile"`
- [ ] Borra el build cache y redeploy (Settings → Git)

---

## 📞 Soporte Rápido

Si necesitas contactar Vercel Support:
- Incluye el Project ID de cada proyecto
- Link a deployment que falló
- Logs completos del error
- Menciona que es un monorepo con pnpm + Turbo
