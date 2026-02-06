# Multi-Tenant Auth Setup - Verifactu Business

## Flujo de Autenticación con Multi-Tenant

```
1. Usuario registra/inicia sesión en Landing (www.verifactu.business/auth/login)
   ↓
2. Firebase autentica al usuario
   ↓
3. Landing obtiene idToken de Firebase
   ↓
4. Landing → POST /api/auth/session con idToken
   ↓
5. Landing API (endpoint: /api/auth/session):
   - Verifica idToken con Firebase Admin SDK
   - Obtiene o CREA tenant para el usuario
   - Genera JWT con: uid, email, tenantId, roles
   - Guarda JWT en cookie `__session` (httpOnly, domain=.verifactu.business)
   ↓
6. Landing redirige a app.verifactu.business/dashboard
   ↓
7. App recibe request a /dashboard
   ↓
8. App middleware (middleware.ts) verifica:
   - ¿Existe cookie `__session`?
   - ¿JWT válido con SESSION_SECRET?
   - ¿Tiene uid y tenantId?
   ↓
9. Si OK → permite acceso al dashboard
   Si FAIL → redirige a www.verifactu.business/auth/login?next=...
```

## Estructura de la Sesión JWT

```typescript
{
  uid: string              // Firebase UID
  email: string           // Email del usuario
  tenantId: string        // UUID del tenant (empresa)
  roles: string[]         // ['owner', 'admin', 'member'] (futuro)
  ver: number             // Versión JWT (1)
  iat: number             // Issued at timestamp
  exp: number             // Expiration (30 días)
}
```

## Tablas Implicadas en BD

```
users
├── id (uuid, Firebase UID)
├── email (text, unique)
└── name (text)

tenants
├── id (uuid, PRIMARY KEY)
├── name (text)
├── legal_name (text)
└── created_at (timestamptz)

memberships (relación user ↔ tenant)
├── id (uuid, PRIMARY KEY)
├── tenant_id (uuid, FK → tenants)
├── user_id (uuid, FK → users)
├── role ('owner', 'admin', 'member')
├── status ('active', 'invited', 'revoked')
└── UNIQUE(tenant_id, user_id)

user_preferences
├── user_id (uuid, FK → users, PRIMARY KEY)
└── preferred_tenant_id (uuid, FK → tenants)
```

## Endpoints Clave

### 1. POST /api/auth/session (Landing)

**Ubicación:** `apps/landing/app/api/auth/session/route.ts`

**Input:**

```json
{
  "idToken": "firebase_jwt_token"
}
```

**Lógica:**

1. Verifica idToken con Firebase Admin SDK
2. Extrae uid y email del token
3. Llama a `getOrCreateTenantForUser(uid, email)`:
   - Si usuario existe en DB:
     - Obtiene su membership activa
     - Retorna tenant_id existente
   - Si usuario NO existe:
     - Crea fila en `users`
     - Crea nuevo tenant
     - Crea membership como 'owner'
     - Crea user_preferences
4. Genera JWT con tenantId
5. Guarda en cookie `__session` con:
   - domain: `.verifactu.business` (compartida entre landing y app)
   - httpOnly: true (no accesible desde JS)
   - secure: true (solo HTTPS en producción)
   - maxAge: 30 días

**Output:**

```json
{
  "ok": true
}
```

**Errores:**

- 400: Missing idToken
- 401: Invalid token
- 500: Database error

### 2. GET/POST /dashboard/\* (App)

**Protección:** Middleware (middleware.ts)

**Lógica:**

1. Revisa si existe cookie `__session`
2. Verifica JWT con SESSION_SECRET
3. Extrae tenantId del payload
4. Si válido → continúa
5. Si inválido → redirige a login

### 3. POST /api/chat (App)

**Ubicación:** `apps/app/app/api/chat/route.ts`

**Protección:**

1. Extrae tenantId de la sesión (cookie)
2. Si no existe → retorna 401
3. Pasa tenantId a todas las herramientas de IA
4. Las queries de DB filtran por `WHERE tenant_id = $1`

**Herramientas con multi-tenant:**

- `calculateProfit(tenantId)` → calcula beneficio de ESE tenant
- `checkVeriFactuDeadlines(tenantId)` → facturas de ESE tenant
- `suggestExpenseCategory(tenantId)` → categorías de ESE tenant

## Variables de Entorno Requeridas

### Landing App (apps/landing)

```env
# Firebase Admin SDK (para verificar idToken)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...

# Sesión
SESSION_SECRET=tu_secreto_aleatorio_aqui

# Base de datos (para crear users/tenants)
DATABASE_URL=postgres://...

# URLs públicas
NEXT_PUBLIC_LANDING_URL=https://www.verifactu.business
NEXT_PUBLIC_APP_URL=https://app.verifactu.business
```

### App (apps/app)

```env
# Sesión (DEBE SER IGUAL que en Landing)
SESSION_SECRET=tu_secreto_aleatorio_aqui

# Base de datos (para AI tools)
DATABASE_URL=postgres://...

# OpenAI (para Isaak)
OPENAI_API_KEY=...

# URLs públicas
NEXT_PUBLIC_LANDING_URL=https://www.verifactu.business
NEXT_PUBLIC_APP_URL=https://app.verifactu.business
```

## Testing

### Test Local (desarrollo)

1. **Iniciar apps:**

```bash
# Terminal 1: Landing
cd apps/landing
npm run dev   # http://localhost:3001

# Terminal 2: App
cd apps/app
npm run dev   # http://localhost:3000
```

2. **Registrarse en Landing:**

```
http://localhost:3001/auth/login
→ Email + Contraseña
→ O Google OAuth
```

3. **Verificar sesión creada:**

```bash
# En DevTools del navegador:
Application → Cookies
→ Buscar `__session` en .localhost (no debería haber en local,
  pero sí cuando está en .verifactu.business)
```

4. **Redirección a App:**

```
Después de login → debe redirigir a http://localhost:3000/dashboard
```

5. **Verificar middleware:**

```bash
# Ver logs en terminal de App:
[Middleware] Sesión válida - uid: abc123, tenantId: xyz789
```

6. **Probar chat:**

```
En dashboard → Abrir Isaak
→ Escribir: "¿Cuánto he ganado este mes?"
→ Debe traer datos reales de la BD del tenant
```

### Test en Vercel (producción)

1. **Deploy ambas apps**
2. **Variables de entorno configuradas** (verificar en Settings → Environment Variables)
3. **Acceder a https://www.verifactu.business/auth/login**
4. **Login → debe redirigir a https://app.verifactu.business/dashboard**
5. **Cookie `__session` visible** (DevTools → Application → Cookies → .verifactu.business)

## Troubleshooting

### ❌ "Redirige a login después de login"

**Posibles causas:**

- `SESSION_SECRET` diferente entre Landing y App
- Cookie `__session` no se crea
- DATABASE_URL no configurada en Vercel Landing

**Solución:**

```bash
# Ver logs en Vercel:
vercel logs --follow
# Buscar: "[Auth] Error en getOrCreateTenantForUser"
```

### ❌ "No aparece tenantId en sesión"

**Posibles causas:**

- Database conectando incorrectamente
- Tablas no existen en BD

**Solución:**

```bash
# Verificar tablas:
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM memberships;
SELECT COUNT(*) FROM users;
```

### ❌ "Chat retorna 401 'No tenant found in session'"

**Posibles causas:**

- Cookie `__session` no se envía desde App
- JWT expirado
- tenantId no está en el JWT

**Solución:**

1. Verificar que SESSION_SECRET es igual
2. Ver logs: `[Middleware] Sesión válida - tenantId: ...`
3. Si tenantId es `undefined`, verificar `getOrCreateTenantForUser`

### ❌ "Middleware bloquea acceso a /dashboard"

**Posibles causas:**

- Cookie no compartida (domain issue)
- SESSION_SECRET incorrecto

**Solución:**

```bash
# En Vercel Landing, revisar logs:
console.log('Domain desde host:', cookieDomainFromHost(host));
# Debe ser `.verifactu.business`
```

## Esquema de Roles (Futuro)

```typescript
type Role = 'owner' | 'admin' | 'member' | 'asesor';

// En membership:
owner  → Control total, crear otros usuarios
admin  → Gestionar datos, no crear usuarios
member → Ver reportes, crear facturas/gastos
asesor → Solo consulta, recomendaciones
```

## Seguridad

✅ **Implementado:**

- [ ] Sesión en cookie httpOnly (no accesible desde JS)
- [ ] JWT firmado con HS256 + SESSION_SECRET
- [ ] Domain cookie: .verifactu.business (compartida entre dominios)
- [ ] Middleware verifica JWT en cada request a /dashboard
- [ ] tenantId incluido en JWT (aislamiento de datos)
- [ ] AI tools filtran por tenantId (no acceso a datos de otros tenants)

⚠️ **TODO:**

- Implementar refresh tokens (token expira en 30 días)
- Rate limiting en /api/auth/session
- Auditoría de cambios de tenant
- Two-factor authentication (2FA)

## Referencias

- Schema: [db/init-complete.sql](db/init-complete.sql)
- Landing auth: [apps/landing/app/api/auth/session/route.ts](apps/landing/app/api/auth/session/route.ts)
- App middleware: [apps/app/middleware.ts](apps/app/middleware.ts)
- Chat endpoint: [apps/app/app/api/chat/route.ts](apps/app/app/api/chat/route.ts)
- DB queries: [apps/app/lib/db-queries.ts](apps/app/lib/db-queries.ts)
