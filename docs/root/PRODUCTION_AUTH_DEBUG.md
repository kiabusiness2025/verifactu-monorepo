# 🔍 DIAGNÓSTICO: Error de Autenticación en Producción

**Fecha:** 15 de Enero de 2026  
**URL del error:** https://verifactu.business/auth/login?next=https://app.verifactu.business/dashboard

---

## 🐛 PROBLEMA REPORTADO

Usuario **logueado** en landing es redirigido a login al intentar acceder al dashboard.

**Síntoma:** Cookie de sesión no se comparte entre subdominios en producción.

---

## ✅ CORRECCIONES APLICADAS

### 1. Middleware simplificado (apps/app/middleware.ts)

**Antes:**

```typescript
return NextResponse.redirect(`${landingUrl}/auth/login?next=${encodeURIComponent(nextUrl)}`);
```

**Después:**

```typescript
return NextResponse.redirect(`${landingUrl}/auth/login`);
```

**Razón:** Flujo simplificado sin parámetro `?next=` - siempre redirige a `/dashboard` después del login.

---

## 🔍 PASOS PARA DIAGNOSTICAR

### 1. Verificar Cookie en el Browser

**Abre Chrome DevTools → Application → Cookies → https://verifactu.business**

Busca cookie `__session`:

- ✅ Domain debe ser: `.verifactu.business` (con punto inicial)
- ✅ Secure debe ser: `true`
- ✅ SameSite debe ser: `None`
- ✅ HttpOnly debe ser: `true`

**Si no existe la cookie:**

- El login no completó exitosamente
- Revisa logs del browser console durante el login

### 2. Verificar Logs del Browser

**Chrome DevTools → Console**

Durante el login, deberías ver:

```
[🧠 LOGIN] Component mounted
[🧠 LOGIN] Google button clicked
[🧠 LOGIN] Google authentication successful
[🧠 LOGIN] Calling /api/auth/session
[🧠 LOGIN] /api/auth/session response: { "ok": true }
[🧠 LOGIN] Redirecting to dashboard
```

**Si falla en algún paso, copia el error completo.**

### 3. Verificar Secrets en Vercel

**Ve a Vercel Dashboard:**

**Landing (verifactu.business):**

1. https://vercel.com/ksenias-projects-16d8d1fb/landing/settings/environment-variables
2. Verifica que existan:
   - `SESSION_SECRET` (debe ser el mismo en ambos proyectos)
   - Variables de Firebase (todas las NEXT*PUBLIC_FIREBASE*\*)

**App (app.verifactu.business):**

1. https://vercel.com/ksenias-projects-16d8d1fb/app/settings/environment-variables
2. Verifica que existan:
   - `SESSION_SECRET` (MISMO valor que en landing)
   - Variables de Firebase
   - `DATABASE_URL`

### 4. Ver Logs de Vercel

**Para ver logs en tiempo real:**

```bash
# Obtén la URL del último deployment
vercel ls

# Copia la URL y obtén los logs
vercel logs <URL-del-deployment>
```

**O visita:**

- Landing logs: https://vercel.com/ksenias-projects-16d8d1fb/landing/logs
- App logs: https://vercel.com/ksenias-projects-16d8d1fb/app/logs

**Busca en los logs:**

- `[📋 API]` - Logs del endpoint /api/auth/session
- `[🧠 MW]` - Logs del middleware
- Errores relacionados con JWT o cookies

---

## 🔧 POSIBLES CAUSAS Y SOLUCIONES

### Causa 1: SESSION_SECRET diferente entre apps

**Diagnóstico:**

```bash
# En Vercel Dashboard, compara los valores de SESSION_SECRET
# Landing: https://vercel.com/.../landing/settings/environment-variables
# App: https://vercel.com/.../app/settings/environment-variables
```

**Solución:**

- Deben ser **exactamente iguales**
- Si no, actualiza uno para que coincida con el otro
- Redeploy después del cambio

### Causa 2: Cookie no se está configurando

**Diagnóstico:**

- Abre Network tab durante el login
- Busca la request a `/api/auth/session`
- Verifica la respuesta tiene header `Set-Cookie`

**Solución:**

- Si no hay Set-Cookie, el backend no está configurando la cookie
- Revisa logs de `/api/auth/session` en Vercel
- Verifica que `SESSION_COOKIE_DOMAIN=.verifactu.business` existe

### Causa 3: Cookie se configura pero no se envía a app subdomain

**Diagnóstico:**

- Cookie existe en devtools para verifactu.business
- Pero no aparece en request a app.verifactu.business

**Solución:**

- Verifica Domain de cookie = `.verifactu.business` (con punto)
- Verifica SameSite = `None`
- Verifica Secure = `true`

### Causa 4: JWT inválido o expirado

**Diagnóstico:**

- Cookie existe y se envía
- Pero middleware dice "Session verification failed"

**Solución:**

- JWT firmado con SECRET diferente
- JWT expirado (verifica timestamp)
- Payload corrupto

---

## 📝 COMANDOS ÚTILES

```bash
# Ver deployments recientes
vercel ls

# Ver logs de un deployment específico
vercel logs <deployment-url>

# Ver logs en tiempo real (últimos 5 minutos)
vercel logs <deployment-url> --follow

# Verificar variables de entorno
vercel env ls

# Redeploy después de cambiar variables
vercel --prod
```

---

## 🚀 PRÓXIMOS PASOS

1. **Ejecuta el diagnóstico completo** siguiendo los pasos de arriba
2. **Comparte los resultados:**
   - Screenshot de cookies en DevTools
   - Logs del browser console
   - Errores de Vercel logs
3. **Aplica la solución** según la causa identificada
4. **Verifica** haciendo login de nuevo

---

## 📞 INFORMACIÓN DE CONTACTO

**Vercel Dashboard:**

- Org: ksenias-projects-16d8d1fb
- Landing: https://vercel.com/ksenias-projects-16d8d1fb/landing
- App: https://vercel.com/ksenias-projects-16d8d1fb/app

**GitHub Repo:**

- https://github.com/kiabusiness2025/verifactu-monorepo

---

**Actualizado:** 15 Enero 2026  
**Estado:** En diagnóstico
