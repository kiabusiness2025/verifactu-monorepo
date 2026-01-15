# 🔧 CONFIGURACIÓN DE VARIABLES DE ENTORNO EN VERCEL

## ❌ Por qué funciona en local pero no en producción

### Local (✅ Funciona)
- Cookie domain: `.localhost`
- SESSION_SECRET: Definido en `.env.local`
- Ambas apps leen del mismo archivo

### Producción (❌ No funciona)
- Cookie domain: `.verifactu.business` 
- SESSION_SECRET: **Debe estar en Vercel dashboard**
- **Cada proyecto de Vercel necesita las variables configuradas**

---

## ✅ SOLUCIÓN: Configurar Variables en Vercel Dashboard

### 1. Landing (verifactu.business)

**URL:** https://vercel.com/ksenias-projects-16d8d1fb/landing/settings/environment-variables

**Variables requeridas:**

```
SESSION_SECRET = [tu-secret-de-64-caracteres]
SESSION_COOKIE_DOMAIN = .verifactu.business
SESSION_COOKIE_SECURE = true
SESSION_COOKIE_SAMESITE = none

NEXT_PUBLIC_APP_URL = https://app.verifactu.business
NEXT_PUBLIC_LANDING_URL = https://verifactu.business

# Firebase variables (todas las NEXT_PUBLIC_FIREBASE_*)
NEXT_PUBLIC_FIREBASE_API_KEY = [tu-api-key]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = [tu-auth-domain]
NEXT_PUBLIC_FIREBASE_PROJECT_ID = verifactu-business
# ... resto de variables Firebase
```

**⚠️ IMPORTANTE:** Marca todas como "Production, Preview, Development"

---

### 2. App (app.verifactu.business)

**URL:** https://vercel.com/ksenias-projects-16d8d1fb/app/settings/environment-variables

**Variables requeridas:**

```
SESSION_SECRET = [MISMO-SECRET-QUE-LANDING]
SESSION_COOKIE_DOMAIN = .verifactu.business
SESSION_COOKIE_SECURE = true
SESSION_COOKIE_SAMESITE = none

NEXT_PUBLIC_APP_URL = https://app.verifactu.business
NEXT_PUBLIC_LANDING_URL = https://verifactu.business

DATABASE_URL = [tu-postgres-connection-string]

# Firebase variables (todas las NEXT_PUBLIC_FIREBASE_*)
NEXT_PUBLIC_FIREBASE_API_KEY = [tu-api-key]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = [tu-auth-domain]
NEXT_PUBLIC_FIREBASE_PROJECT_ID = verifactu-business
# ... resto de variables Firebase

# Firebase Admin (backend)
FIREBASE_PROJECT_ID = verifactu-business
FIREBASE_CLIENT_EMAIL = [service-account-email]
FIREBASE_PRIVATE_KEY = [service-account-private-key]
```

**⚠️ CRÍTICO:** `SESSION_SECRET` debe ser **exactamente igual** en ambos proyectos.

---

## 🔍 Verificar que SESSION_SECRET está configurado

### Opción 1: Vercel Dashboard

1. Ve a cada proyecto → Settings → Environment Variables
2. Busca `SESSION_SECRET`
3. Verifica que:
   - ✅ Existe
   - ✅ Tiene el mismo valor en ambos proyectos
   - ✅ Está marcado para "Production"

### Opción 2: Vercel CLI

```bash
# Ver variables de landing
vercel env ls --scope ksenias-projects-16d8d1fb

# Ver variables de app  
cd apps/app
vercel env ls
```

---

## 🚨 ERROR COMÚN: Variables en vercel.json

**❌ INCORRECTO:**
```json
{
  "env": {
    "SESSION_SECRET": "mi-secret-aqui"
  }
}
```

Las variables en `vercel.json` se usan solo en **build time**, no en **runtime**.

**✅ CORRECTO:**
- Variables de sesión → Vercel Dashboard (Environment Variables)
- Variables públicas (NEXT_PUBLIC_*) → Pueden ir en vercel.json o Dashboard

---

## 📝 PASOS PARA ARREGLAR AHORA MISMO

### 1. Obtén tu SESSION_SECRET

Desde tu `.env.local`:
```bash
cat .env.local | grep SESSION_SECRET
```

O genera uno nuevo:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configura en Landing

1. Ve a: https://vercel.com/ksenias-projects-16d8d1fb/landing/settings/environment-variables
2. Click "Add New"
3. Name: `SESSION_SECRET`
4. Value: [pega tu secret]
5. Environment: Production, Preview, Development
6. Click "Save"

### 3. Configura en App (MISMO VALOR)

1. Ve a: https://vercel.com/ksenias-projects-16d8d1fb/app/settings/environment-variables
2. Click "Add New"
3. Name: `SESSION_SECRET`
4. Value: [MISMO secret que landing]
5. Environment: Production, Preview, Development
6. Click "Save"

### 4. Redeploy ambos proyectos

Las variables nuevas solo se aplican en el siguiente deploy:

```bash
# Trigger redeploy via GitHub
git commit --allow-empty -m "chore: trigger redeploy with SESSION_SECRET configured"
git push origin main
```

O manualmente en Vercel Dashboard → Deployments → Redeploy

---

## ✅ Verificar que funcionó

Después del redeploy:

1. Ve a https://verifactu.business/auth/login
2. Haz login con Google
3. Abre DevTools → Application → Cookies → https://verifactu.business
4. Verifica que existe cookie `__session` con:
   - Domain: `.verifactu.business` (con punto)
   - Secure: ✓
   - SameSite: None
5. Ve a https://app.verifactu.business/dashboard
6. Debería cargar sin redirigir

---

## 🐛 Si aún no funciona

**Revisa logs del browser:**

1. F12 → Console
2. Busca logs `[🧠 LOGIN]` y `[🧠 AUTH]`
3. Verifica que llama a `/api/auth/session`
4. Verifica que recibe `{ ok: true }`

**Revisa logs de Vercel:**

```bash
# Landing logs
vercel logs --scope ksenias-projects-16d8d1fb

# Busca errores relacionados con:
# - JWT verification
# - SESSION_SECRET undefined
# - Cookie configuration
```

---

**Última actualización:** 15 Enero 2026  
**Status:** Esperando configuración de SESSION_SECRET en Vercel
