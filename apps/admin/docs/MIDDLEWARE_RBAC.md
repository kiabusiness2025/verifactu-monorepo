# Middleware RBAC - Guía de Configuración

## 🎯 Objetivo

Proteger el panel de administración con control de acceso basado en roles (RBAC) usando NextAuth JWT.

## 🔐 Implementación Actual

### Archivo: [middleware.ts](../middleware.ts)

El middleware protege todas las rutas del admin panel excepto las públicas.

### Características

✅ **Rutas públicas permitidas:**
- `/api/auth/*` - NextAuth endpoints
- `/_next/*` - Assets de Next.js
- `/favicon.ico` - Favicon
- `/robots.txt` - Robots

✅ **Verificación de autenticación:**
- Usa `getToken()` de `next-auth/jwt`
- Token JWT firmado y verificado
- Redirección automática a signin si no autenticado

✅ **Control de acceso granular:**
- **Email específico**: Permite email exacto (ej: support@verifactu.business)
- **Dominio completo**: Permite cualquier email del dominio (ej: @verifactu.business)
- **Roles permitidos**: SUPPORT, ADMIN
- **Roles bloqueados**: USER (clientes de apps/app)

✅ **Respuestas HTTP:**
- `302 Redirect` - No autenticado → `/api/auth/signin`
- `403 Forbidden` - Autenticado pero sin permisos
- `200 OK` - Autenticado y autorizado

## 🔧 Variables de Entorno

### Configuración en `.env.local`

```bash
# Email específico permitido
ADMIN_ALLOWED_EMAIL="support@verifactu.business"

# Dominio completo permitido
ADMIN_ALLOWED_DOMAIN="verifactu.business"
```

### Lógica de Validación

```typescript
const email = token.email.toLowerCase();
const allowedEmail = process.env.ADMIN_ALLOWED_EMAIL || "support@verifactu.business";
const allowedDomain = process.env.ADMIN_ALLOWED_DOMAIN || "verifactu.business";

// Válido si cumple CUALQUIERA de estas condiciones:
const emailOk = 
  email === allowedEmail ||           // Email exacto
  email.endsWith(`@${allowedDomain}`); // Dominio completo

// Válido si cumple CUALQUIERA de estos roles:
const roleOk = 
  role === "SUPPORT" || 
  role === "ADMIN";

// Acceso permitido solo si AMBOS son true
if (!emailOk || !roleOk) {
  return new NextResponse("Forbidden", { status: 403 });
}
```

## 📋 Escenarios de Acceso

### ✅ Permitido

| Email | Rol | Resultado |
|-------|-----|-----------|
| support@verifactu.business | ADMIN | ✅ Permitido (email exacto + rol válido) |
| support@verifactu.business | SUPPORT | ✅ Permitido (email exacto + rol válido) |
| admin@verifactu.business | ADMIN | ✅ Permitido (dominio válido + rol válido) |
| juan@verifactu.business | SUPPORT | ✅ Permitido (dominio válido + rol válido) |

### ❌ Bloqueado

| Email | Rol | Razón |
|-------|-----|-------|
| usuario@gmail.com | ADMIN | ❌ Email/dominio no autorizado |
| support@verifactu.business | USER | ❌ Rol no autorizado |
| cliente@otrodominio.com | SUPPORT | ❌ Email/dominio no autorizado |
| admin@verifactu.com | ADMIN | ❌ Dominio incorrecto (.com vs .business) |

## 🚀 Testing

### Test 1: Usuario no autenticado
```bash
# Visitar cualquier ruta sin sesión
curl -I http://localhost:3003/overview

# Resultado esperado:
# 302 Redirect → /api/auth/signin?callbackUrl=...
```

### Test 2: Usuario con rol USER
```bash
# Login con cuenta USER de apps/app
# Intentar acceder a admin panel

# Resultado esperado:
# 403 Forbidden
```

### Test 3: Email fuera del dominio
```bash
# Login con Google OAuth usando @gmail.com
# (configurado en NextAuth)

# Resultado esperado:
# 403 Forbidden
```

### Test 4: Usuario ADMIN válido
```bash
# Login con support@verifactu.business + rol ADMIN
# Acceder a /overview

# Resultado esperado:
# 200 OK + Dashboard visible
```

## 🔍 Debugging

### Verificar Token JWT

Agregar logs temporales en middleware:

```typescript
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // Debug logs (remover en producción)
  console.log('[MIDDLEWARE]', {
    path: req.nextUrl.pathname,
    hasToken: !!token,
    email: token?.email,
    role: token?.role,
  });
  
  // ... resto del código
}
```

### Verificar Variables de Entorno

```bash
# En apps/admin
cat .env.local | grep ADMIN_ALLOWED

# Resultado esperado:
# ADMIN_ALLOWED_EMAIL="support@verifactu.business"
# ADMIN_ALLOWED_DOMAIN="verifactu.business"
```

## 📝 Notas Importantes

### 🔒 Seguridad

1. **No confiar solo en cliente**: El middleware se ejecuta server-side en Edge Runtime
2. **JWT firmado**: El token está firmado con NEXTAUTH_SECRET y no puede ser falsificado
3. **Doble validación**: Email Y rol deben ser válidos
4. **Case insensitive**: Los emails se comparan en lowercase

### 🎯 Mejores Prácticas

1. **Usar variables de entorno**: No hardcodear emails/dominios
2. **Logging de accesos**: El audit log registra intentos de acceso
3. **Renovación de token**: NextAuth renueva automáticamente antes de expirar
4. **CallbackUrl**: Redirección automática después de login

### 🚨 Troubleshooting

**Problema**: "Forbidden" después de login exitoso
- ✅ Verificar que el email esté en .env.local
- ✅ Verificar que el dominio sea exacto (verifactu.business)
- ✅ Verificar que el rol sea ADMIN o SUPPORT en base de datos

**Problema**: Redirect loop infinito
- ✅ Verificar que `/api/auth/*` esté en PUBLIC_PATHS
- ✅ Verificar NEXTAUTH_URL en .env.local
- ✅ Limpiar cookies del navegador

**Problema**: Token null/undefined
- ✅ Verificar NEXTAUTH_SECRET coincide en toda la app
- ✅ Verificar que NextAuth esté configurado correctamente
- ✅ Hacer logout y login de nuevo

## 🔗 Referencias

- [NextAuth JWT](https://next-auth.js.org/configuration/options#jwt)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Edge Runtime](https://nextjs.org/docs/app/api-reference/edge)

---

**Última actualización**: 21 Enero 2026  
**Versión**: 1.0
