# 🧠 Prueba Manual del Flujo de Autenticación Simplificado

## Estado Actual
- Landing: `http://localhost:3001` (dev server corriendo)
- App: `http://localhost:3000` (dev server corriendo)
- Firebase: Google OAuth configurado
- Base de datos: PostgreSQL conectada
- Session cookie: Domain=.verifactu.business, Path=/, HttpOnly, SameSite=none

## Pasos de Prueba

### 1. Limpieza Inicial
```bash
# Borrar cookies existentes del navegador
# DevTools → Application → Cookies → localhost:3001 y localhost:3000 → Delete all
```

### 2. Navegar a Login
```
Abrir en navegador: http://localhost:3001/auth/login
Expected: Página de login con botones "Email" y "Google"
```

### 3. Google Login
```
Click en "Sign in with Google"
Expected: 
  - Popup de Google Authentication abre
  - Logs en console: [🧠 LOGIN] Google button clicked...
```

### 4. Autenticar con Google
```
En el popup: Seleccionar cuenta de Google
Expected:
  - Popup cierra
  - Console logs: [🧠 LOGIN] Google authentication successful...
  - Console logs: [🧠 LOGIN] Calling /api/auth/session...
```

### 5. Verificar API Response
```
DevTools → Network tab
Expected:
  - POST /api/auth/session: Status 200
  - Response: { "ok": true }
  - Response headers: Set-Cookie con __session (HttpOnly)
  - Console: [📋 API] Session token signed successfully
```

### 6. Verificar Redirect
```
Expected:
  - URL debe cambiar de http://localhost:3001/auth/login a http://localhost:3000/dashboard
  - Console: [🧠 LOGIN] Redirecting to dashboard...
  - NO debe haber ?next= parámetro en la URL
```

### 7. Verificar Session Cookie
```
DevTools → Application → Cookies
Expected:
  - Cookie name: __session
  - Domain: .localhost (en desarrollo) o .verifactu.business (en producción)
  - HttpOnly: ✓
  - Secure: ✓ (en producción)
  - SameSite: none (para cross-subdomain)
```

### 8. Verificar Middleware
```
Console en http://localhost:3000/dashboard
Expected:
  - [🧠 MW] Session validation: ✅ Valid session found
  - [🧠 MW] Session payload: { uid: "...", email: "...", tenantId: "..." }
  - Dashboard carga normalmente
```

### 9. Verificar Dashboard Cargado
```
Expected:
  - Página de dashboard visible
  - No hay redirecciones adicionales
  - Usuario ve su datos de sesión (si hay display)
```

## Logs a Buscar en Console

### Landing Login Page ([🧠 LOGIN])
```
[🧠 LOGIN] Component mounted
[🧠 LOGIN] Google button clicked...
[🧠 LOGIN] Google authentication successful...
[🧠 LOGIN] Calling /api/auth/session...
[🧠 LOGIN] /api/auth/session response: { "ok": true }
[🧠 LOGIN] Redirecting to dashboard...
```

### App Middleware ([🧠 MW])
```
[🧠 MW] Request to /dashboard
[🧠 MW] Session cookie found
[🧠 MW] Session validation: ✅ Valid session found
[🧠 MW] Session payload: { uid: "...", ... }
[🧠 MW] Continuing to page...
```

### API Endpoint ([📋 API])
```
[📋 API] /api/auth/session START
[📋 API] Verifying idToken with Firebase Admin
[📋 API] idToken verified { uid: "...", email: "..." }
[📋 API] Getting or creating tenant
[📋 API] Tenant resolved { tenantId: "..." }
[📋 API] Signing session token
[📋 API] Session token signed successfully
[📋 API] Session cookie set successfully
```

## Si Falla en Algún Paso

### Si no hay popup de Google:
- ❌ Check Firebase configuration
- ❌ Check Google OAuth credentials
- ❌ Check CLIENT_ID env var

### Si popup cierra pero no hay redirect:
- ❌ Check API response (Network tab)
- ❌ Check console for errors ([🧠 LOGIN] or [📋 API])
- ❌ Check if /api/auth/session is returning ok: true

### Si redirect va a login en lugar de dashboard:
- ❌ Check session cookie exists in Application tab
- ❌ Check middleware logs ([🧠 MW] ❌)
- ❌ Check middleware is validating JWT correctly
- ❌ Check SESSION_COOKIE_DOMAIN matches (should be .verifactu.business or .localhost)

### Si redirect funciona pero dashboard no carga:
- ❌ Check Vercel logs for API errors
- ❌ Check database connection
- ❌ Check user/tenant creation queries

## Ambiente de Desarrollo

### Portos
- Landing: `http://localhost:3001` (dev server)
- App: `http://localhost:3000` (dev server)
- Session Cookie Domain: `.localhost` (para localhost) 

### Variables de Entorno Usadas
```
FIREBASE_ADMIN_PROJECT_ID=verifactu-business
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
SESSION_COOKIE_DOMAIN=.localhost (dev) o .verifactu.business (prod)
SESSION_COOKIE_SECURE=false (dev) o true (prod)
SESSION_COOKIE_SAMESITE=none (cross-subdomain)
DATABASE_URL=...
```

## Checklist Antes de Probar

- [ ] Dev servers corriendo en 3000 y 3001
- [ ] Database conectada
- [ ] Firebase Admin credentials configuradas
- [ ] Google OAuth credentials en Firebase
- [ ] Cookies del navegador limpias
- [ ] Console abierta para ver logs
- [ ] Network tab abierta para ver requests
- [ ] Application tab abierta para ver cookies

## Después de Completar Pruebas

1. Si TODO funciona: 🎉 Flujo simplificado es exitoso
2. Si hay problemas: Usar logs para debuggear
3. Commit cambios a git
4. Push a main
5. Vercel auto-deploya
6. Probar en https://verifactu.business/auth/login
