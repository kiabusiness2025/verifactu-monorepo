# 🚀 Plan de Acción: Siguiente Paso para Vercel Deployment

## Estado Actual ✅

He corregido los problemas principales que impedían que Vercel detectara Next.js:

### Cambios Realizados:

1. **✅ vercel.json (ambos proyectos)** - Estandarizado a pnpm
   - apps/landing: Cambiado de `npm run build` → `pnpm run build`
   - apps/app: Agregado `devCommand`
   - Ambos con: `installCommand: "pnpm install --frozen-lockfile"`

2. **✅ next.config.js/mjs (ambos proyectos)**
   - Configurado: `transpilePackages: ['@verifactu/ui']`
   - Configurado: `eslint: { ignoreDuringBuilds: true }`

3. **✅ Documentación**
   - VERCEL_CHECKLIST.md - Detalles técnicos
   - VERCEL_SETUP_VISUAL_GUIDE.md - Pasos visuales
   - scripts/verify-config.ps1 - Script de verificación

4. **✅ .env.local**
   - apps/landing/.env.local configurado con todas las variables

5. **✅ Git**
   - Commits 8b1edaf0, 8f0b70f8, 4afda2a2 pusheados

---

## 🎯 Próximos Pasos Inmediatos (TÚ aquí)

### PASO 1: Verifica Root Directory en Vercel Dashboard

**Esto es CRÍTICO** - Sin esto, Vercel no detectará Next.js

#### Para verifactu-landing:

1. Ve a: https://vercel.com/kisenias-projects/verifactu-landing/settings/general
2. Busca en "Build & Development Settings"
3. Verifica que **Root Directory** = `apps/landing`
4. Si está vacío o es `/`, actualízalo y guarda

#### Para verifactu-app:

1. Ve a: https://vercel.com/kisenias-projects/verifactu-app/settings/general
2. Verifica que **Root Directory** = `apps/app`
3. Si está diferente, actualízalo y guarda

---

### PASO 2: Fuerza un Redeploy

Después de actualizar Root Directory, Vercel debe redetectar el framework:

#### Para cada proyecto:

1. Ve a **Deployments** en el dashboard
2. Click en el último deployment
3. Selecciona **"Redeploy"** (o usa el botón "Deploy" del menú)
4. Monitorea los Build Logs

**Debes ver en los logs:**

```
▲ Next.js 14.2.35
Creating an optimized production build...
```

Si ves esto → Éxito ✅
Si NO ves esto → Continúa leyendo "Troubleshooting"

---

### PASO 3: Agrega Environment Variables (si build fue exitoso)

Una vez que la detección de framework funcione:

#### Para ambos proyectos:

**verifactu-landing**: Ir a Settings → Environment Variables
**verifactu-app**: Ir a Settings → Environment Variables

Copia los valores de `apps/landing/.env.local` e ingresa en Vercel:

```
NEXT_PUBLIC_FIREBASE_API_KEY=<valor>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=verifactu-business.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=536174799167
NEXT_PUBLIC_FIREBASE_APP_ID=<valor>
NEXT_PUBLIC_USE_AUTH_EMULATOR=false

ISAAK_API_KEY=<valor>
ISAAK_ASSISTANT_ID=<valor>
NEXT_PUBLIC_ISAAK_API_KEY=<valor>
NEXT_PUBLIC_ISAAK_ASSISTANT_ID=<valor>

RESEND_API_KEY=<valor>
RESEND_FROM=Verifactu Business <no-reply@verifactu.business>

STRIPE_SECRET_KEY=<valor>

ORGANIZATION_CIF=B44991776
ORGANIZATION_NAME=Expert Estudios Profesionales, SLU
ORGANIZATION_ADDRESS=C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)

NEXT_PUBLIC_SITE_URL=https://verifactu.business
NEXT_PUBLIC_SUPPORT_EMAIL=soporte@verifactu.business
```

Después de agregar las variables, redeploy nuevamente.

---

## ❌ Troubleshooting

### Problema: Aún no detecta Next.js

**Checklist de diagnóstico:**

- [ ] Root Directory está configurado a `apps/landing` o `apps/app`
- [ ] Existe `next.config.js` en apps/landing
- [ ] Existe `next.config.mjs` en apps/app
- [ ] Ambos tienen `transpilePackages: ['@verifactu/ui']`
- [ ] Los archivos están commiteados en GitHub
- [ ] Ejecutaste Redeploy (no solo Push a GitHub)

**Solución manual:**

1. En Vercel Dashboard, va a Settings
2. Busca "Framework" en Build & Development
3. Selecciona manualmente **"Next.js"**
4. Guarda y redeploy

---

### Problema: Error "pnpm not found"

**Causa:** Vercel no está ejecutando con pnpm

**Verificar:**

1. Ve a Settings → General
2. En "Build & Development Settings"
3. Revisa que `installCommand` = `pnpm install --frozen-lockfile`

**Si no está:**

1. Abre vercel.json en local
2. Verifica que tenga:

```json
"installCommand": "pnpm install --frozen-lockfile"
```

3. Commit y push
4. Redeploy

---

### Problema: "@verifactu/ui not found"

**Causa:** El transpiling de packages no está funcionando

**Verificar:**

1. Abre next.config.js en apps/landing
2. Busca:

```javascript
transpilePackages: ['@verifactu/ui'];
```

3. Si no existe o está comentado, descomenta o agrega
4. Commit, push, redeploy

---

### Problema: "Cannot find module '@verifactu/ui'"

Este error indica que:

1. pnpm install no ejecutó correctamente
2. O el workspace linking está roto

**Solución local primero:**

```bash
cd c:\dev\verifactu-monorepo
pnpm install
pnpm build
```

Si funciona localmente pero no en Vercel:

1. Borra el cache de build en Vercel
2. Ve a Settings → Git
3. Click en "Clear Build Cache"
4. Redeploy

---

## 📊 Script de Verificación Local

Para verificar que todo está configurado correctamente localmente:

```powershell
cd c:\dev\verifactu-monorepo
powershell -ExecutionPolicy Bypass -File scripts/verify-config.ps1
```

Debe mostrar 12+ `[OK]` y 0 `[ERROR]`

---

## 📋 Checklist Final

- [ ] Root Directory configurado en ambos proyectos
- [ ] Redeploy ejecutado exitosamente
- [ ] Build logs muestran "Next.js 14.2.35"
- [ ] Environment variables agregadas
- [ ] Segunda redeploy ejecutada
- [ ] URLs accesibles sin 404
- [ ] Landing page funciona
- [ ] Admin app funciona

---

## 🔗 Links Útiles

- [Vercel Landing](https://vercel.com/kisenias-projects/verifactu-landing)
- [Vercel App](https://vercel.com/kisenias-projects/verifactu-app)
- [GitHub Repo](https://github.com/kiabusiness2025/verifactu-monorepo)
- [Documentación Técnica](VERCEL_CHECKLIST.md)
- [Guía Visual](VERCEL_SETUP_VISUAL_GUIDE.md)

---

## 💡 Notas Importantes

1. **Monorepo con pnpm**: Es más complejo que un proyecto simple
   - Vercel NECESITA Root Directory correcto
   - pnpm workspace linking es sensible

2. **Cambios en vercel.json**: Automáticamente disparan redeploy vía webhook
   - No necesitas hacer nada extra
   - GitHub → Vercel lo detecta

3. **Cambios en .env.local local**: NO se syncan a Vercel
   - Debes agregar manualmente en Settings → Environment Variables
   - O usar Vercel CLI: `vercel env pull`

4. **Si todo falla**: Contacta a Vercel Support con:
   - ID del proyecto
   - Link al deployment que falla
   - Logs completos del build
   - Mención que es monorepo pnpm + Turbo

---

## ✅ Validación de Éxito

Cuando todo esté funcionando:

- ✅ Vercel Dashboard muestra "Next.js" como framework
- ✅ Build logs muestran "Creating optimized production build"
- ✅ Deployment completa exitosamente
- ✅ Puedes acceder a URLs sin 404
- ✅ Las features funcionan (Firebase auth, Isaak, etc.)

**Cuando alcances esto, el deployment está completo!**
