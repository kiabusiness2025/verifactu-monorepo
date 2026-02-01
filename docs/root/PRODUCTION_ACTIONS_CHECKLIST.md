# 🔧 ACCIONES REQUERIDAS PARA PRODUCCIÓN

## ⚠️ CRÍTICO - Hacer ahora mismo

### 1️⃣ Actualizar `apps/app/vercel.json` con variables de sesión

**Por qué:** Sin esto, la app no puede leer las cookies de sesión en producción.

**Acción:**
```bash
# Reemplazar apps/app/vercel.json con:
```

```json
{
  "framework": "nextjs",
  "env": {
    "SESSION_COOKIE_DOMAIN": ".verifactu.business",
    "SESSION_COOKIE_SAMESITE": "none",
    "SESSION_COOKIE_SECURE": "true"
  }
}
```

**Después:** Commit y push para que Vercel lo detecte.

---

### 2️⃣ Verificar SESSION_SECRET en Vercel Dashboard

**URL:** https://vercel.com/kseniasprojects/app/settings/environment-variables

**Qué verificar:**
- [ ] Variable `SESSION_SECRET` existe
- [ ] Valor es: `792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e`
- [ ] Está configurada en AMBAS apps (landing y app)

**Si falta:** Agregarlo manualmente en Vercel dashboard.

---

### 3️⃣ Verificar SESSION_SECRET en landing también

**URL:** https://vercel.com/kseniasprojects/verifactu-landing/settings/environment-variables

**Qué verificar:**
- [ ] Variable `SESSION_SECRET` existe
- [ ] Valor es el **MISMO** que en app: `792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e`

**CRÍTICO:** Deben ser idénticos o los JWTs no se verificarán correctamente.

---

## 🧪 TESTING POST-ACTUALIZACIÓN

### Local (Verificar primero)
```bash
cd c:\dev\verifactu-monorepo

# 1. Asegurar que los cambios están en .env.local
cat .env.local | grep SESSION_SECRET
# Debe mostrar:
# SESSION_SECRET=792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e

# 2. Ejecutar ambas apps
npm run dev  # o los task runners individuales

# 3. Test en navegador
# - Ir a http://localhost:3001
# - Click "Dashboard" (no autenticado) → debe ir a /auth/login
# - Login con Gmail → debe redirigir a http://localhost:3000/dashboard
# - Verificar que está autenticado (aparece menu usuario)
```

---

### Production (Después de Vercel deploy)

```bash
# 1. Esperar a que Vercel deploy termine (check dashboard)

# 2. En navegador ir a https://verifactu.business

# 3. Test de Login:
#    - Click "Dashboard" → /auth/login
#    - Login con Gmail
#    - Debe redirigir a https://app.verifactu.business/dashboard
#    - Debe ver dashboard (no error 401)

# 4. Verificar cookies en DevTools:
#    - Application → Cookies → https://verifactu.business
#    - Debe existir __session
#    - Domain debe ser: .verifactu.business
#    - Secure: sí
#    - HttpOnly: sí

# 5. Si algo falla:
#    - Verificar Console para errores
#    - Verificar que ambas Vercel projects tienen SESSION_SECRET
#    - Verificar que apps/app/vercel.json está deployado
```

---

## 📋 VERIFICACIÓN RÁPIDA

```bash
# Script para verificar todo desde terminal:

cd c:\dev\verifactu-monorepo

# 1. Verificar que getAppUrl está presente
grep -r "export function getAppUrl" apps/landing/app/lib/

# 2. Verificar que DashboardLink lo importa
grep "import.*getAppUrl" apps/landing/app/components/

# 3. Verificar que login page lo importa
grep "import.*getAppUrl" apps/landing/app/auth/login/

# 4. Verificar SESSION_SECRET es idéntico
echo "Landing .env.local:"
grep "^SESSION_SECRET" apps/landing/.env.local
echo "App .env.local:"
grep "^SESSION_SECRET" apps/app/.env.local
echo "Root .env.local:"
grep "^SESSION_SECRET" .env.local
```

---

## 🎯 STATUS FINAL

| Tarea | Status | Responsable | Deadline |
|-------|--------|-------------|----------|
| Crear getAppUrl() | ✅ DONE | Isaak | 2026-01-14 |
| Actualizar DashboardLink | ✅ DONE | Isaak | 2026-01-14 |
| Actualizar login/page.tsx | ✅ DONE | Isaak | 2026-01-14 |
| Commit & Push | ✅ DONE | Isaak | 2026-01-14 |
| **Actualizar apps/app/vercel.json** | ⏳ PENDIENTE | **AHORA** | Inmediato |
| **Verificar SESSION_SECRET Vercel** | ⏳ PENDIENTE | **AHORA** | Inmediato |
| Test local | ⏳ PENDIENTE | Manual | Después cambios |
| Test producción | ⏳ PENDIENTE | Manual | Después deploy |

---

## 🚨 PROBLEMAS CONOCIDOS Y SOLUCIONES

### "Dashboard button abre /auth/login en lugar de app.verifactu.business"
- **Causa:** NEXT_PUBLIC_APP_URL no configurado en prod
- **Solución:** ✅ RESUELTO con getAppUrl()
- **Status:** FIXED en commit c8007ffe

### "Usuario logueado en landing pero app dice unauthorized"
- **Causa:** SESSION_SECRET diferente entre apps
- **Solución:** Verificar que son idénticos en .env y Vercel
- **Check:** `grep SESSION_SECRET .env.local apps/landing/.env.local apps/app/.env.local`

### "Cookie __session no se comparte entre landing y app"
- **Causa:** SESSION_COOKIE_DOMAIN no está en app/vercel.json
- **Solución:** Agregar vercel.json con domain=.verifactu.business
- **Status:** PENDIENTE

---

**Documento creado:** 14 Enero 2026  
**Para:** Producción Vercel  
**Por:** Isaak (con K)
