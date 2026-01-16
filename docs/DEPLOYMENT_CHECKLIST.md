# Checklist de Despliegue - VeriFactu

Lecciones aprendidas de deploys anteriores para evitar errores comunes.

---

## ⚠️ Errores Comunes y Cómo Evitarlos

### 1. Uso Correcto de `query()` de PostgreSQL

**❌ INCORRECTO:**
```typescript
const result = await query('SELECT * FROM users');
const users = result.rows; // ❌ query() YA retorna rows
```

**✅ CORRECTO:**
```typescript
const users = await query('SELECT * FROM users');
// users ya es un array directamente
if (users.length > 0) {
  const firstUser = users[0];
}
```

**Ubicación:** `apps/app/lib/db.ts`
- La función `query()` está envuelta y retorna `res.rows` directamente
- No necesitas acceder a `.rows` otra vez

---

### 2. Imports de Firebase Admin

**❌ INCORRECTO:**
```typescript
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase/firebase-admin-app';
```

**✅ CORRECTO:**
```typescript
import { getFirebaseAuth } from '@/lib/firebase-admin';

// Luego en tu código:
const auth = getFirebaseAuth();
const user = await auth.getUser(userId);
```

**Archivo:** `apps/app/lib/firebase-admin.ts`
- Función exportada: `getFirebaseAuth()` (no `getFirebaseAdminAuth`)
- No existe `@/lib/firebase/firebase-admin-app`

---

### 3. Tokens de Sesión

**❌ INCORRECTO:**
```typescript
import { signToken } from '@verifactu/utils';
const token = await signToken(payload, secret);
```

**✅ CORRECTO:**
```typescript
import { signSessionToken, readSessionSecret } from '@verifactu/utils';

const token = await signSessionToken({
  payload: sessionPayload,
  secret: readSessionSecret(),
  expiresIn: '8h'
});
```

**Ubicación:** `packages/utils/session.ts`
- Función correcta: `signSessionToken()` (no `signToken`)
- Usar `readSessionSecret()` para obtener el secret del .env

---

### 4. TypeScript: SessionPayload

**❌ INCORRECTO:**
```typescript
const sessionPayload = {
  uid: user.uid,
  tenantId: null, // ❌ Type error: null no es string | undefined
};
```

**✅ CORRECTO:**
```typescript
const sessionPayload = {
  uid: user.uid,
  tenantId: undefined, // ✅ Correcto según el tipo SessionPayload
};
```

**Type definition:**
```typescript
export type SessionPayload = {
  tenantId?: string; // Nota el '?' - es opcional, no nullable
};
```

---

### 5. Verificación de Admin

**❌ INCORRECTO:**
```typescript
import { verifyAdminAccess } from '@/lib/adminAuth';
const check = await verifyAdminAccess(request);
if (!check.isAdmin) { ... }
```

**✅ CORRECTO:**
```typescript
import { requireAdmin } from '@/lib/adminAuth';

// requireAdmin lanza error si no es admin, no necesitas if
await requireAdmin(request);
```

**Archivo:** `apps/app/lib/adminAuth.ts`
- Función correcta: `requireAdmin()` (no `verifyAdminAccess`)
- Lanza error automáticamente si no es admin, simplifica el código

---

### 6. Handlers de Formularios en React

**❌ INCORRECTO:**
```tsx
<form onSubmit={handleSaveProfile}> {/* función no definida */}
```

**✅ CORRECTO:**
```tsx
// Definir el handler primero
const handleSaveProfile = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... lógica
};

// Luego usarlo
<form onSubmit={handleSaveProfile}>
```

**Regla:** Siempre definir handlers antes de referenciarlos en JSX.

---

## 🔍 Checklist Pre-Deploy

Antes de hacer push a `main`:

### Build Local
```bash
cd apps/app
pnpm build
```

Si el build local pasa, hay alta probabilidad de que Vercel también pase.

### Verificar Imports
- [ ] ¿Usas `query()` correctamente sin `.rows`?
- [ ] ¿Imports de Firebase Admin son `getFirebaseAuth()`?
- [ ] ¿Tokens de sesión usan `signSessionToken()`?
- [ ] ¿Admin checks usan `requireAdmin()`?

### TypeScript Strict
- [ ] ¿`tenantId` es `undefined` en lugar de `null`?
- [ ] ¿Todos los handlers de formularios están definidos?
- [ ] ¿No hay propiedades duplicadas en objetos JSON?

### Pruebas Manuales
- [ ] Iniciar sesión funciona
- [ ] Panel admin accesible (si aplica)
- [ ] No hay errores en consola del navegador

---

## 🚨 Si el Deploy Falla en Vercel

1. **Lee el log completo** - Busca la línea con `Type error:` o `Module not found:`
2. **Identifica el archivo** - Vercel indica el path exacto
3. **Busca en este documento** - Probablemente es uno de los errores comunes
4. **Fix rápido:**
   ```bash
   # Corregir el archivo
   git add <archivo>
   git commit -m "fix: descripción breve"
   git push origin main
   ```
5. **Vercel re-deploya automáticamente** - No hace falta reiniciar manualmente

---

## 📚 Referencias Rápidas

### Funciones de DB
- `query<T>(sql, params)` → retorna `T[]` directamente
- `one<T>(sql, params)` → retorna `T | null` (primer resultado)
- `tx<T>(fn)` → transacción

### Funciones de Firebase
- `getFirebaseAuth()` → Auth instance
- `verifyIdToken(token)` → decoded token

### Funciones de Sesión
- `signSessionToken(options)` → string
- `readSessionSecret()` → string
- `SESSION_COOKIE_NAME` → '__session'

### Funciones de Admin
- `requireAdmin(request)` → void (throws si no es admin)
- `getCurrentUserEmail()` → Promise<string | null>

---

## 🎯 Scripts Útiles

### Verificar Build Antes de Push
```bash
# Desde la raíz del monorepo
pnpm --filter verifactu-app build
```

### Ver Logs de Vercel en Tiempo Real
```bash
vercel logs --follow
```

### Deploy Manual desde CLI
```bash
cd apps/app
vercel --prod
```

---

## ✅ Deploy Exitoso - Commits Históricos

### Commits que Resolvieron Problemas de Deploy

- `3bd87eaa` - Fix: signSessionToken correctamente
- `4c937989` - Fix: Mover declaración de auth antes de uso
- `351c08d7` - Fix: tenantId de null a undefined
- `332ecedf` - Fix: query() ya retorna rows directamente
- `d398d42b` - Fix: Eliminar líneas duplicadas en JSON
- `e993a36c` - Fix: query() en export route
- `3b73d862` - Fix: Añadir handleSaveProfile faltante

**Lección:** Estos errores son fáciles de evitar con verificación de tipos y build local.

---

**Última actualización:** 2026-01-16  
**Versión:** 1.0
