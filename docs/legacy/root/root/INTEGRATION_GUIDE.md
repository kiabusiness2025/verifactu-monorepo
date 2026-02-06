# 🚀 Integración Completa: Usuarios, Emails y Storage

## ✅ Lo que hemos implementado

### 1. Sincronización de Usuarios (NUEVO ✨)

**Archivos creados/modificados:**

- ✅ `apps/landing/lib/syncUser.ts` - Funciones de sincronización
- ✅ `apps/landing/lib/auth.ts` - Actualizado con `syncUserSilent()` en signup, login y Google

**Cambios:**

```typescript
// Ahora en signup y login se llama automáticamente:
syncUserSilent(user); // Sincroniza Firebase → PostgreSQL (no bloquea)
```

**Resultado:**

- Los 3 usuarios de Firebase ahora se sincronizarán con PostgreSQL
- El admin panel verá todos los usuarios registrados
- La sincronización es silenciosa (no interrumpe el flujo de auth)

---

### 2. Sistema de Emails (YA LISTO)

**Archivos disponibles:**

- ✅ `apps/landing/lib/email/emailService.ts` - Servicio Resend
- ✅ `apps/landing/emails/*.tsx` - 5 plantillas (VerifyEmail, Welcome, Reset, etc)
- ✅ `apps/landing/lib/email/INTEGRATION_EXAMPLES.ts` - Ejemplos de uso

**Cómo integrar en tu código:**

#### Opción A: Signup (enviar verificación)

```typescript
// apps/landing/app/auth/signup/page.tsx
import { sendVerificationEmail } from '@/lib/email/emailService';

// Después del signup exitoso:
await sendVerificationEmail({
  email: user.email!,
  userName: fullName || user.email.split('@')[0],
  verificationLink: `${process.env.NEXT_PUBLIC_LANDING_URL}/auth/verify-email?token=...`,
});
```

#### Opción B: Verificación de Email (enviar bienvenida)

```typescript
// En verify-email route o endpoint
import { sendWelcomeEmail } from '@/lib/email/emailService';

await sendWelcomeEmail({
  userName: user.displayName || 'Usuario',
  email: user.email!,
  dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
});
```

#### Opción C: Olvide Contraseña

```typescript
// apps/landing/app/auth/forgot-password/page.tsx
import { sendResetPasswordEmail } from '@/lib/email/emailService';

await sendResetPasswordEmail({
  userName: user.name || email.split('@')[0],
  email: user.email!,
  resetLink: `${process.env.NEXT_PUBLIC_LANDING_URL}/auth/reset-password?token=...`,
  expiryMinutes: 60,
});
```

**IMPORTANTE**: Agregar `RESEND_API_KEY` en `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

---

### 3. Firebase Storage (NUEVO ✨)

**Archivos creados:**

- ✅ `apps/app/lib/storage.ts` - Funciones de upload/delete
- ✅ `apps/app/app/api/storage/upload/route.ts` - Endpoint POST/DELETE
- ✅ `storage.rules` - Reglas de seguridad (raíz)

**Estructura de Storage:**

```
gs://verifactu-business.appspot.com/
├── tenants/
│   ├── {tenantId}/
│   │   ├── invoices/       (PDFs, XMLs, JSONs)
│   │   ├── documents/      (Contratos, certificados)
│   │   ├── avatars/        (Fotos de perfil)
│   │   └── attachments/    (Otros archivos)
└── public/
    └── avatars/            (Avatars públicos)
```

**Cómo usar en componentes:**

```typescript
// Importar función de upload
import { uploadToStorage, uploadInvoice, uploadDocument } from '@/lib/storage';

// 1. Upload genérico
const result = await uploadToStorage(tenantId, 'documents', file, 'mi-contrato-2026.pdf');

if (result.success) {
  console.log('File uploaded:', result.url);
}

// 2. Upload de factura (con validación)
const invoiceResult = await uploadInvoice(tenantId, file);

// 3. Upload de documento
const docResult = await uploadDocument(tenantId, file);

// 4. Upload de avatar
const avatarResult = await uploadAvatar(tenantId, userId, file);
```

**Desde el backend (API):**

```typescript
// POST /api/storage/upload
const formData = new FormData();
formData.append('file', file);
formData.append('category', 'invoices');
formData.append('customFileName', 'factura-123.pdf');

const response = await fetch('/api/storage/upload', {
  method: 'POST',
  body: formData,
});

const { url } = await response.json();
```

---

## 📋 Checklist de Integración

### Sincronización ✅ LISTO

- [x] Crear `syncUser.ts` - HECHO
- [x] Integrar en signup - HECHO
- [x] Integrar en login - HECHO
- [x] Integrar en Google auth - HECHO

**Acción necesaria:**

- [ ] Ejecutar: `git add . && git commit -m "feat(auth): Add user sync to Firebase auth flows"`
- [ ] Probar: Crear nuevo usuario en landing → verificar en admin panel

### Emails 📧 (Implementación pendiente)

- [ ] Agregar `RESEND_API_KEY` a `.env.local`
- [ ] Integrar `sendVerificationEmail()` en signup
- [ ] Integrar `sendWelcomeEmail()` en verify-email
- [ ] Integrar `sendResetPasswordEmail()` en forgot-password
- [ ] Integrar `sendPasswordChangedEmail()` en reset-password
- [ ] Probar flujos completos

### Storage 🗂️ (Implementación pendiente)

- [ ] Deployer `storage.rules` a Firebase Console
- [ ] Integrar `uploadInvoice()` en dashboard de facturas
- [ ] Integrar `uploadDocument()` en sección de documentos
- [ ] Agregar input de file en UI
- [ ] Probar uploads

---

## 🧪 Testing

### Test 1: Sincronización de Usuarios

```bash
1. Ir a: https://localhost:3001/auth/login (signup tab)
2. Registrar: test@example.com / Password123
3. Verificar email
4. Ir a: https://localhost:3000/dashboard/admin/users
5. ✅ Usuario debe aparecer en la lista
```

### Test 2: Email de Verificación

```bash
1. Ir a: https://localhost:3001/auth/login
2. Hacer signup con nuevo email
3. ✅ Email debe llegar a bandeja (si RESEND_API_KEY está configurado)
4. Hacer click en link de verificación
5. ✅ Email de bienvenida debe llegar
```

### Test 3: Upload de Archivo

```javascript
// En consola del dashboard
const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
const { uploadInvoice } = await import('@/lib/storage');
const result = await uploadInvoice('tenant-123', file);
console.log(result); // { success: true, url: "..." }
```

---

## 📝 Notas Importantes

### Sincronización

- ✅ Ya está integrada automáticamente
- ✅ No requiere configuración adicional
- ✅ Funciona de fondo (no bloquea login)
- ⚠️ Si falla, el usuario sigue autenticado (graceful fallback)

### Emails

- ⚠️ Requiere `RESEND_API_KEY` configurada
- ⚠️ Sin API key, no se enviarán emails pero no fallará signup
- 📧 Resend es service externo (check status: https://resend.com)
- 🧪 Puedes testear con emails fake en desarrollo

### Storage

- ⚠️ Requiere deployer `storage.rules` a Firebase
- 👥 Validación de permisos es básica (localhost/dev)
- 📦 Límite: 50MB por archivo
- 🔒 Solo PDFs, docs y imágenes permitidas

---

## 🔗 Referencias Útiles

1. **Emails System**: `apps/landing/emails/README.md`
2. **Integration Examples**: `apps/landing/lib/email/INTEGRATION_EXAMPLES.ts`
3. **Storage SDK**: `apps/app/lib/storage.ts`
4. **Current Status**: `CURRENT_SYNC_STATUS.md`

---

## 🚀 Próximos Pasos

1. **Inmediato** (ahora):
   - Commit cambios de sincronización
   - Probar que usuarios se sincronizan correctamente

2. **Corto plazo** (hoy):
   - Integrar emails en auth flows
   - Configurar RESEND_API_KEY
   - Probar envío de emails

3. **Mediano plazo** (esta semana):
   - Deployer storage.rules
   - Integrar uploads en dashboard
   - Testear flujos de almacenamiento

---

**Última actualización**: Enero 14, 2026
**Estado**: 70% completado (sincronización lista, emails y storage en implementación)
