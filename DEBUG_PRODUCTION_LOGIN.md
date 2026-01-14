# Debug: Production Login Issue

## Problema Reportado
Después de hacer login en `https://verifactu.business/auth/login`, el dashboard (`app.verifactu.business/dashboard`) no se abre.

## Diagnosis en Pasos

### 1. Verificar Console Logs en Browser

**Abrir DevTools (F12) en Chrome/Edge:**
1. Ir a https://verifactu.business/auth/login
2. Abrir **Console** tab
3. Click en "Iniciar sesión con Google"
4. **¿Qué logs aparecen?**

**Logs esperados:**
```
[🧠 LOGIN] Google login attempt
[🧠 AUTH] mintSessionCookie START { uid: '...', email: '...' }
[🧠 AUTH] Got Firebase idToken
[🧠 AUTH] Session cookie minted successfully
[🧠 LOGIN] Google login successful, redirecting...
[🧠 LOGIN] Redirecting to dashboard...
```

**Si falta alguno de estos logs, hay un problema en ese paso.**

---

### 2. Verificar Network Requests

**En DevTools → Network tab:**
1. Filtrar por `session`
2. Buscar la request: `POST /api/auth/session`

**¿Qué status code tiene?**
- ✅ **200 OK** → Session creada correctamente
- ❌ **400/500 error** → Hay un problema en el backend

**Revisar Response:**
```json
{
  "ok": true
}
```

**Revisar Response Headers:**
- Buscar `Set-Cookie: __session=...`
- ¿Tiene `Domain=.verifactu.business`?
- ¿Tiene `SameSite=none`?
- ¿Tiene `Secure`?

---

### 3. Verificar Cookie en Application Tab

**En DevTools → Application → Cookies:**
1. Expandir https://verifactu.business
2. Buscar cookie `__session`

**Verificar propiedades:**
- ✅ `Domain`: `.verifactu.business` (con el punto al inicio)
- ✅ `Path`: `/`
- ✅ `Secure`: ✓ (checked)
- ✅ `HttpOnly`: ✓ (checked)
- ✅ `SameSite`: None

**Si la cookie NO está presente o tiene dominio incorrecto, el problema está en el backend.**

---

### 4. Verificar Redirect

**Después del login:**
- ¿La página redirige automáticamente?
- ¿Se abre `app.verifactu.business/dashboard`?
- ¿O se queda en `verifactu.business/auth/login`?

**Si NO redirige:**
- Revisar console logs
- Puede haber un error de JavaScript

---

### 5. Verificar Dashboard (App)

**Si redirige a app.verifactu.business/dashboard:**

**A. ¿Qué aparece en pantalla?**
- ✅ Dashboard carga correctamente
- ❌ Error 404
- ❌ Redirect de vuelta a login
- ❌ Página en blanco

**B. Revisar Console logs en app.verifactu.business:**
```
[🧠 MW] Incoming request { pathname: '/dashboard', ... }
[🧠 MW] ✅ Session validated ...
```

**Si aparece:**
```
[🧠 MW] ❌ No session found
[🧠 MW] Redirecting to login...
```
→ **La cookie NO se está compartiendo entre subdominios.**

---

## Posibles Causas y Soluciones

### Causa 1: Cookie Domain Incorrecto
**Síntoma:** Cookie tiene `Domain=verifactu.business` (sin punto) o `Domain=localhost`

**Solución:**
```bash
# Verificar variables de entorno en Vercel
SESSION_COOKIE_DOMAIN=.verifactu.business
SESSION_COOKIE_SAMESITE=none
SESSION_COOKIE_SECURE=true
```

---

### Causa 2: SameSite Policy Blocking Cookie
**Síntoma:** Cookie existe en verifactu.business pero NO en app.verifactu.business

**Solución:**
- Cookie debe tener `SameSite=none`
- Cookie debe tener `Secure=true`
- Ambas propiedades son obligatorias para cross-origin cookies

---

### Causa 3: Firebase Auth No Completa
**Síntoma:** Logs de [🧠 AUTH] faltan o tienen errores

**Solución:**
- Verificar Firebase config en Vercel
- Verificar `NEXT_PUBLIC_FIREBASE_*` variables
- Verificar `FIREBASE_ADMIN_*` variables

---

### Causa 4: Database Connection Issue
**Síntoma:** `/api/auth/session` retorna 500 error

**Solución:**
- Verificar `DATABASE_URL` en Vercel
- Verificar conexión a PostgreSQL
- Revisar logs de Vercel Functions

---

### Causa 5: Session Secret Mismatch
**Síntoma:** App middleware rechaza la cookie

**Solución:**
```bash
# Verificar que AMBOS proyectos tengan el MISMO valor
# En Vercel → verifactu-monorepo (landing)
SESSION_SECRET=792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e

# En Vercel → verifactu-monorepo (app)
SESSION_SECRET=792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e
```

---

## Checklist de Variables de Entorno

### Landing (verifactu.business)
```bash
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (server-side)
FIREBASE_ADMIN_PROJECT_ID=verifactu-business
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@verifactu-business.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Session
SESSION_SECRET=792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e
SESSION_COOKIE_DOMAIN=.verifactu.business
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none

# Database
DATABASE_URL=postgresql://...

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=https://app.verifactu.business
```

### App (app.verifactu.business)
```bash
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=... (same as landing)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Session (MUST BE SAME AS LANDING)
SESSION_SECRET=792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e

# Database
DATABASE_URL=postgresql://... (same as landing)
```

---

## Comandos de Verificación

### Ver Logs de Vercel (Serverless Functions)
```bash
# CLI
vercel logs verifactu-monorepo --scope=ksenias-projects-16d8d1fb

# Web
https://vercel.com/ksenias-projects-16d8d1fb/verifactu-monorepo/logs
```

### Ver Variables de Entorno
```bash
# Ver variables de landing
vercel env ls --scope=ksenias-projects-16d8d1fb

# Ver variables de app
vercel env ls --project=verifactu-app --scope=ksenias-projects-16d8d1fb
```

---

## Test Flow Completo (Manual)

1. **Borrar todas las cookies** de verifactu.business y app.verifactu.business
2. Ir a https://app.verifactu.business/dashboard (sin sesión)
3. **Esperado:** Redirect a https://verifactu.business/auth/login
4. Click en "Iniciar sesión con Google"
5. **Esperado:** Google OAuth popup
6. Completar Google login
7. **Esperado:** Popup se cierra
8. **Esperado:** Redirect automático a https://app.verifactu.business/dashboard
9. **Esperado:** Dashboard carga con datos del usuario

**Si falla en algún paso, revisar los logs de ese paso específico.**

---

## Contacto de Soporte

Si después de seguir estos pasos el problema persiste:

1. **Captura de pantalla de:**
   - Console logs (F12 → Console)
   - Network tab con `/api/auth/session` request
   - Application tab con cookies

2. **Enviar a:**
   - GitHub Issue en repo
   - Email soporte técnico

---

**Última actualización:** 2026-01-14
**Versión:** 1.0
