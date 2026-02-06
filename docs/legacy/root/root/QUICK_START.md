# 🎯 QUICK START - SINCRONIZACIÓN Y STORAGE

## El Problema que Resolvimos

```
ANTES:
Firebase Auth: usuario1, usuario2, usuario3 ✅
PostgreSQL:    usuario1                     ❌
Admin Panel:   Muestra solo usuario1        ❌ INCONSISTENCIA

DESPUÉS:
Firebase Auth: usuario1, usuario2, usuario3 ✅
PostgreSQL:    usuario1, usuario2, usuario3 ✅
Admin Panel:   Muestra los 3 usuarios       ✅ SINCRONIZADO
```

---

## ✅ QUÉ SE IMPLEMENTÓ

### 1. Sincronización Automática (Listo ahora)

**Archivo:** `apps/landing/lib/syncUser.ts` (NUEVO)

```typescript
export async function syncUserToDB(user: User);
export async function syncUserSilent(user: User);
```

**Integrado en:** `apps/landing/lib/auth.ts`

```typescript
signUpWithEmail()   ← ahora llama syncUserSilent()
signInWithEmail()   ← ahora llama syncUserSilent()
signInWithGoogle()  ← ahora llama syncUserSilent()
```

**Resultado:** Cada login/signup sincroniza automáticamente con PostgreSQL

---

### 2. Firebase Storage por Tenant (Listo)

**Archivos creados:**

- `apps/app/lib/storage.ts` ← Funciones de upload/delete
- `apps/app/app/api/storage/upload/route.ts` ← Endpoint API
- `storage.rules` ← Reglas de seguridad

**Funciones disponibles:**

```typescript
uploadToStorage(tenantId, category, file); // Genérico
uploadInvoice(tenantId, file); // Solo PDFs/XMLs
uploadDocument(tenantId, file); // Solo docs
uploadAvatar(tenantId, userId, file); // Avatars
deleteFromStorage(tenantId, category, file); // Eliminar
```

---

## 🚀 CÓMO TESTEAR AHORA MISMO

### Test 1: Validar Sincronización (5 minutos)

```bash
# 1. Abre landing en navegador
https://localhost:3001/auth/login

# 2. Haz signup con nuevo email
Email: test@example.com
Password: Password123

# 3. Verifica el email (o salta si no hay mail)

# 4. Abre admin panel
https://localhost:3000/dashboard/admin/users

# 5. Resultado esperado:
✅ Debes ver el nuevo usuario en la lista
✅ Si hay 3 usuarios en Firebase, verás los 3
```

### Test 2: Validar Storage (2 minutos)

```javascript
// En consola del navegador (en dashboard)
import { uploadDocument } from '@/lib/storage';

// Crear archivo de prueba
const file = new File(['test content'], 'test.pdf', {
  type: 'application/pdf',
});

// Upload
const result = await uploadDocument('tu-tenant-id', file);

// Verificar resultado
if (result.success) {
  console.log('✅ Upload exitoso!');
  console.log('URL:', result.url);
} else {
  console.log('❌ Error:', result.error);
}
```

---

## 📧 PRÓXIMO PASO: Emails (30 minutos)

El sistema de emails YA está listo en `apps/landing/lib/email/`, solo falta integrarlo.

### Paso 1: Agregar API Key

```bash
# En apps/landing/.env.local, agregar:
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

Obtener en: https://resend.com → Settings → API Keys

### Paso 2: Integrar en Signup

**Archivo:** `apps/landing/app/auth/signup/page.tsx`

```typescript
// Agregar import
import { sendVerificationEmail } from '@/lib/email/emailService';

// En handleEmailSignup, después de signUpWithEmail():
const emailResult = await sendVerificationEmail({
  email: user.email || '',
  userName: fullName || email.split('@')[0],
  verificationLink: `${process.env.NEXT_PUBLIC_LANDING_URL}/auth/verify-email?token=...`,
  // TODO: Generar token de verificación
});

if (!emailResult.success) {
  console.warn('Email no se envió:', emailResult.error);
  // No fallar el signup, solo loguear
}
```

### Paso 3: Integrar en Verify-Email

**Archivo:** `apps/landing/app/auth/verify-email/page.tsx`

```typescript
// Agregar import
import { sendWelcomeEmail } from '@/lib/email/emailService';

// Cuando se verifica el email:
const emailResult = await sendWelcomeEmail({
  userName: user.displayName || 'Usuario',
  email: user.email!,
  dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
});
```

---

## 📊 Resumen de Cambios

| Feature               | Archivos                          | Estado           |
| --------------------- | --------------------------------- | ---------------- |
| **Sync Users**        | `syncUser.ts` + `auth.ts`         | ✅ LISTO         |
| **Storage SDK**       | `lib/storage.ts`                  | ✅ LISTO         |
| **Storage API**       | `app/api/storage/upload/route.ts` | ✅ LISTO         |
| **Storage Rules**     | `storage.rules`                   | ✅ LISTO         |
| **Emails**            | `lib/email/emailService.ts`       | ✅ LISTO         |
| **Email Templates**   | `emails/*.tsx`                    | ✅ LISTO         |
| **Email Integration** | PENDIENTE                         | ⏳ A IMPLEMENTAR |

---

## 📁 Archivos Importantes

1. **INTEGRATION_GUIDE.md** ← Guía completa con ejemplos
2. **SESSION_8_SUMMARY.md** ← Resumen detallado
3. **CURRENT_SYNC_STATUS.md** ← Estado actual
4. **apps/landing/lib/syncUser.ts** ← Código sync
5. **apps/app/lib/storage.ts** ← Código storage

---

## ❓ Preguntas Frecuentes

**P: ¿Dónde están los 3 usuarios de Firebase?**
R: Al hacer login/signup, ahora se sincronizan automáticamente a PostgreSQL. Verás los 3 en `/dashboard/admin/users`

**P: ¿Qué pasa si la sincronización falla?**
R: El usuario sigue autenticado en Firebase (no se bloquea el flujo). Solo se logguea el error.

**P: ¿Necesito configurar Storage Rules?**
R: Sí, luego. Ahora puedes usar el código. Después deployas `storage.rules` en Firebase Console.

**P: ¿Los emails funcionan sin RESEND_API_KEY?**
R: No. Sin API key, el email no se envía pero el signup sigue siendo válido.

**P: ¿Puedo testear uploads sin configurar storage.rules?**
R: Sí, en desarrollo funciona. En producción necesitas las reglas.

---

## 🎯 Plan para Hoy

1. **Ahora** (5 min)
   - Probar sincronización (crear usuario → verificar admin)
2. **Dentro de 10 min** (30 min)
   - Integrar emails en signup/verify-email
   - Configurar RESEND_API_KEY
   - Probar flujos de email

3. **Después** (15 min)
   - Deployer storage.rules a Firebase
   - Integrar uploads en dashboard

---

**¿Listo para testear?** 🚀

Abre: https://localhost:3001/auth/login y crea un nuevo usuario
