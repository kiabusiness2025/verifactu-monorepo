# 🔐 REFERENCIA: FLUJO DE AUTENTICACIÓN

**Actualizado:** 15 de Enero de 2026  
**Estado:** ✅ PRODUCCIÓN

---

## 📋 RESUMEN EJECUTIVO

El flujo de autenticación está **correctamente configurado** en:

- ✅ Variables de entorno (local y Vercel)
- ✅ Gestión de cookies de sesión
- ✅ URLs de redirección (Landing ↔ App)
- ✅ Detección inteligente de ambiente (dev/prod)

---

## 🏗️ ARQUITECTURA DE AUTENTICACIÓN

### Flujo Simplificado (Actual)

```
Usuario en Landing (verifactu.business)
    ↓
Firebase Auth (Email/Google/Facebook)
    ↓
mintSessionCookie() → POST /api/auth/session
    ↓
Backend: Verifica idToken + Crea/Obtiene usuario y tenant
    ↓
Firma JWT con SESSION_SECRET → Cookie __session
    ↓
Redirect directo a: {APP_URL}/dashboard
    ↓
Middleware valida cookie → Renderiza dashboard
```

**Simplificaciones aplicadas:**

- ❌ Eliminados parámetros `?next=...` en URLs
- ❌ Eliminada lógica compleja de `resolveNextUrl()`
- ❌ Eliminada validación redundante en `ProtectedRoute`
- ✅ Middleware como única fuente de validación
- ✅ Redirect directo a `/dashboard` siempre

---

## 🔑 VARIABLES DE ENTORNO

### Desarrollo Local

**`.env.local` (raíz y ambas apps):**

```dotenv
SESSION_SECRET=792231500a928ab8dacaaa8b4441b97f5f02234477bd69e236703f8dc1cce38e
SESSION_COOKIE_DOMAIN=.localhost
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=none

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_LANDING_URL=http://localhost:3001
```

### Producción (Vercel)

**Landing (`apps/landing/vercel.json`):**

```json
{
  "env": {
    "SESSION_COOKIE_DOMAIN": ".verifactu.business",
    "SESSION_COOKIE_SAMESITE": "none",
    "SESSION_COOKIE_SECURE": "true"
  }
}
```

**App (`apps/app/vercel.json`):**

```json
{
  "env": {
    "SESSION_COOKIE_DOMAIN": ".verifactu.business",
    "SESSION_COOKIE_SAMESITE": "none",
    "SESSION_COOKIE_SECURE": "true"
  }
}
```

**Secrets en GitHub/Vercel:**

- `SESSION_SECRET` - 64 caracteres hex (mismo en ambos proyectos)
- Variables de Firebase (API keys, project ID, etc.)

---

## 📝 COMPONENTES CLAVE

### 1. Login Page (`apps/landing/app/auth/login/page.tsx`)

```typescript
const redirectToDashboard = () => {
  console.log('[🧠 LOGIN] Redirecting to dashboard...');
  window.location.href = `${appUrl}/dashboard`;
};

// Después de llamar a /api/auth/session exitosamente:
redirectToDashboard();
```

### 2. Middleware (`apps/app/middleware.ts`)

```typescript
export async function middleware(req: NextRequest) {
  const session = await getSessionPayload();

  if (!session) {
    console.log('[🧠 MW] ❌ No session - redirecting to login');
    return NextResponse.redirect(`${landingUrl}/auth/login`);
  }

  console.log('[🧠 MW] ✅ Valid session found');
  return NextResponse.next();
}
```

### 3. ProtectedRoute (`apps/app/components/auth/ProtectedRoute.tsx`)

```typescript
export default function ProtectedRoute({ children }: Props) {
  console.log('[🧠 ProtectedRoute] Component mounted - middleware already validated session');
  return <>{children}</>;
}
```

**Nota:** El middleware ya validó la sesión. Este componente solo renderiza.

### 4. Session API (`apps/landing/app/api/auth/session/route.ts`)

```typescript
1. Verifica idToken con Firebase Admin
2. Obtiene/crea usuario en PostgreSQL
3. Obtiene/crea tenant (empresa)
4. Firma JWT con session.uid + session.tenantId
5. Configura cookie __session con dominio compartido
6. Retorna { ok: true }
```

---

## 🔄 LOGS DE DEBUGGING

Para seguir el flujo completo, busca estos prefijos en la consola:

- `[🧠 LOGIN]` - Landing login page
- `[📋 API]` - Backend /api/auth/session
- `[🧠 MW]` - App middleware validation
- `[🧠 ProtectedRoute]` - Client-side component mount

**Flujo esperado:**

```
[🧠 LOGIN] Component mounted
[🧠 LOGIN] Google button clicked
[🧠 LOGIN] Google authentication successful
[🧠 LOGIN] Calling /api/auth/session
[📋 API] Verifying idToken with Firebase Admin
[📋 API] idToken verified
[📋 API] Tenant resolved
[📋 API] Session token signed successfully
[📋 API] Session cookie set successfully
[🧠 LOGIN] Redirecting to dashboard
[🧠 MW] Session validation: ✅ Valid session found
[🧠 ProtectedRoute] Component mounted
```

---

## 🗄️ SCHEMA DE BASE DE DATOS

**Cambios importantes para soportar Firebase Auth:**

```sql
-- users.id es TEXT (no UUID) para soportar Firebase UIDs
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- Firebase UID: "u2UkVMClhFaDRl1dP2KgqEDDIBa2"
  email TEXT NOT NULL UNIQUE,
  ...
);

-- memberships vincula users con tenants
CREATE TABLE memberships (
  user_id TEXT REFERENCES users(id),
  tenant_id TEXT REFERENCES tenants(id),
  ...
);
```

---

## ❌ PATRONES A EVITAR

### 1. NO usar parámetros `?next=...`

```typescript
// ❌ Antiguo (complejo)
const next = searchParams.get('next');
const resolvedUrl = resolveNextUrl(next);
window.location.href = resolvedUrl;

// ✅ Nuevo (simple)
window.location.href = `${appUrl}/dashboard`;
```

### 2. NO validar sesión en el cliente

```typescript
// ❌ Antiguo (redundante)
useEffect(() => {
  const user = firebase.auth().currentUser;
  if (!user) router.push('/login');
}, []);

// ✅ Nuevo (confiamos en middleware)
// El middleware ya redirigió si no hay sesión
```

### 3. NO crear múltiples funciones de redirect

```typescript
// ❌ Antiguo
function resolveNextUrl(next: string) {
  /* 30 líneas */
}
function getRedirectUrl() {
  /* 15 líneas */
}

// ✅ Nuevo
const redirectToDashboard = () => {
  window.location.href = `${appUrl}/dashboard`;
};
```

---

## 🔧 TROUBLESHOOTING

### Cookie no se comparte entre subdominios

**Síntoma:** Usuario autenticado en landing pero no en app

**Solución:**

1. Verifica `SESSION_COOKIE_DOMAIN=.verifactu.business` (con punto inicial)
2. Verifica `SESSION_COOKIE_SAMESITE=none`
3. Verifica `SESSION_SECRET` es idéntico en ambos proyectos

### "Invalid input syntax for type uuid"

**Síntoma:** Error al crear usuario con Firebase Auth

**Solución:**

- Schema debe usar `TEXT` para `users.id`, no `UUID`
- Firebase UIDs no son UUIDs válidos

### Redirect loops

**Síntoma:** Página recarga infinitamente

**Solución:**

- Elimina validaciones de sesión en el cliente
- Deja que solo el middleware maneje auth
- Verifica que middleware no redirige a sí mismo

---

## 📚 REFERENCIAS

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Mantenido por:** Isaak (con K)  
**Última revisión:** 15 de Enero de 2026
