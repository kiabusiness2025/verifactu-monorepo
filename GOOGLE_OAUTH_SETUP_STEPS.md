# 🔐 Configuración Google OAuth para Verifactu

## Credenciales OAuth 2.0

**Client ID:** `536174799167-dl0m9vg1eo7fu477fld1f4qj13ec3hb6.apps.googleusercontent.com`  
**Client Secret:** `GOCSPX-C2h17H_Ifz-...` *(ver archivo local `client_secret_*.json`)*  
**Project ID:** `verifactu-business`

> ⚠️ **IMPORTANTE:** Las credenciales completas están en el archivo `client_secret_2_536174799167-*.json` en tu máquina local. NO subas este archivo a Git.

---

## ✅ PASO 1: Configurar Firebase Authentication

### 1.1 Ir a Firebase Console
1. Ve a: https://console.firebase.google.com/project/verifactu-business/authentication/providers
2. Haz clic en **"Authentication"** → **"Sign-in method"**

### 1.2 Habilitar Google Provider
1. Busca **"Google"** en la lista de proveedores
2. Haz clic en **"Google"**
3. **Activa el toggle** "Enable"
4. Configura:
   - **Project support email:** `expertestudiospro@gmail.com` o tu email admin
   - **Web SDK configuration:**
     - **Web client ID:** `536174799167-dl0m9vg1eo7fu477fld1f4qj13ec3hb6.apps.googleusercontent.com`
     - **Web client secret:** *(usa el valor del archivo local `client_secret_*.json`)*

5. Haz clic en **"Save"**

### 1.3 Verificar Authorized Domains en Firebase
En la pestaña **"Settings"** de Authentication, verifica que estos dominios estén autorizados:
- ✅ `verifactu.business`
- ✅ `app.verifactu.business`
- ✅ `verifactu-business.firebaseapp.com`
- ✅ `localhost` (para desarrollo)

---

## ✅ PASO 2: Verificar Google Cloud Console

### 2.1 URIs de Redirección Correctos
Verifica en: https://console.cloud.google.com/apis/credentials

**Orígenes JavaScript autorizados:**
- ✅ `http://localhost`
- ✅ `https://verifactu-business.firebaseapp.com`
- ✅ `https://verifactu.business`

**URIs de redireccionamiento autorizados:**
- ✅ `https://verifactu-business.firebaseapp.com/__/auth/handler` ← **CRÍTICO para Firebase**
- ✅ `https://app.verifactu.business/`
- ✅ `https://verifactu.business`

---

## ✅ PASO 3: Actualizar Variables de Entorno en Vercel

### 3.1 Landing App (verifactu-monorepo-landing)
Ve a: https://vercel.com/ksenias-projects-16d8d1fb/verifactu-monorepo-landing/settings/environment-variables

Verifica estas variables (ya están configuradas):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o
NEXT_PUBLIC_FIREBASE_APP_ID=1:536174799167:web:cecdc93b701e133869cb8a
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=verifactu-business.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=536174799167
```

### 3.2 App (verifactu-monorepo-app)
Ve a: https://vercel.com/ksenias-projects-16d8d1fb/verifactu-monorepo-app/settings/environment-variables

Asegúrate de tener:
```bash
SESSION_COOKIE_DOMAIN=.verifactu.business
SESSION_COOKIE_SAMESITE=none
SESSION_COOKIE_SECURE=true
SESSION_SECRET=792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e
```

---

## ✅ PASO 4: Probar el Flujo Completo

### 4.1 Flujo Esperado
1. Usuario va a: `https://verifactu.business/auth/login`
2. Hace clic en **"Continuar con Google"**
3. Firebase abre popup de Google OAuth
4. Google redirige a: `https://verifactu-business.firebaseapp.com/__/auth/handler`
5. Firebase valida y cierra popup
6. Landing llama `mintSessionCookie()` → `/api/auth/session`
7. Backend crea JWT cookie `__session` con dominio `.verifactu.business`
8. Cliente redirige a: `https://app.verifactu.business/dashboard`
9. Middleware de app valida cookie JWT
10. Dashboard se carga correctamente ✅

### 4.2 Logs Esperados en Consola del Navegador
```
[🧠 AUTH] mintSessionCookie START { uid: '...', email: 'expertestudiospro@gmail.com', emailVerified: true }
[🧠 AUTH] Got Firebase idToken
[🧠 AUTH] Session cookie minted successfully
```

### 4.3 Logs Esperados en Vercel (Landing)
```
[📋 API] /api/auth/session START
[📋 API] Verifying idToken with Firebase Admin
[📋 API] idToken verified { uid: '...', email: '...' }
[📋 API] Getting or creating tenant
[📋 API] Tenant resolved { tenantId: '...' }
[📋 API] Signing session token
[📋 API] Session token signed successfully
[📋 API] Building cookie options
[📋 API] Session cookie set successfully
```

### 4.4 Logs Esperados en Vercel (App)
```
[🧠 MW] Incoming request { pathname: '/dashboard', host: 'app.verifactu.business' }
[🧠 MW] getSessionPayload { hasCookie: true, cookieName: '__session' }
[🧠 MW] Session verified successfully { uid: '...', email: '...' }
[🧠 MW] Session check { pathname: '/dashboard', hasSession: true }
[🧠 MW] Allowing request { pathname: '/dashboard' }
```

---

## 🔍 Troubleshooting

### Error: "Popup closed by user"
- Verifica que el popup de Google no esté siendo bloqueado por el navegador
- Revisa que `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` sea correcto

### Error: "redirect_uri_mismatch"
- Verifica que `https://verifactu-business.firebaseapp.com/__/auth/handler` esté en Google Cloud Console
- Verifica que el dominio esté autorizado en Firebase Authentication Settings

### Dashboard se queda en "Cargando..."
- Abre DevTools (F12) → Console
- Busca logs con prefijo `[🧠 AUTH]` o `[🧠 MW]`
- Verifica que la cookie `__session` se esté estableciendo (DevTools → Application → Cookies)

### Error: "Failed to mint session cookie"
- Revisa los logs de Vercel de landing app
- Verifica que `FIREBASE_ADMIN_PRIVATE_KEY` esté configurado correctamente
- Verifica que `DATABASE_URL` funcione (tenant creation)

---

## 📝 Checklist Final

- [ ] Google OAuth Client ID y Secret configurados en Firebase Console
- [ ] URIs de redireccionamiento incluyen `/__/auth/handler`
- [ ] Dominios autorizados en Firebase Authentication Settings
- [ ] Variables de entorno actualizadas en Vercel (landing y app)
- [ ] Deploy completado (verifica en Vercel dashboard)
- [ ] Probado login con Google en producción
- [ ] Cookie `__session` visible en DevTools → Application → Cookies
- [ ] Dashboard se carga correctamente después de login

---

## 🚀 Siguiente Paso

**PRUEBA AHORA:**
1. Ve a: https://verifactu.business/auth/login
2. Haz clic en "Continuar con Google"
3. Selecciona tu cuenta
4. Verifica que redirige a `app.verifactu.business/dashboard`
5. Comparte screenshot de consola si hay errores

**SI FALLA:**
Abre DevTools (F12) → Console y comparte los logs que veas con prefijos `[🧠 AUTH]`, `[📋 API]`, `[🧠 MW]`
