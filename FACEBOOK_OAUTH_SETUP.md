# 🔵 Configuración de Facebook OAuth

## 📋 Resumen

Facebook OAuth está **implementado en el código** pero requiere configuración en Firebase Console y Facebook Developers.

## 🎯 Estado Actual

- ✅ Código implementado en `LoginForm.tsx`
- ✅ Botón de Facebook visible en UI
- ✅ Función `handleFacebookLogin()` con `FacebookAuthProvider`
- ✅ Tracking de Analytics integrado
- ✅ Sincronización automática con Prisma
- ⏳ **Pendiente:** Habilitar en Firebase Console
- ⏳ **Pendiente:** Crear Facebook App

---

## 🔧 Paso 1: Crear Facebook App

### 1.1 Acceder a Facebook Developers

```
URL: https://developers.facebook.com/apps/
```

1. Inicia sesión con tu cuenta de Facebook
2. Haz clic en **"Create App"** o **"Crear aplicación"**

### 1.2 Configurar la App

**Tipo de app:** Consumer / Consumidor  
**Nombre de la app:** Verifactu Business  
**Email de contacto:** kiabusiness2025@gmail.com

### 1.3 Agregar Producto "Facebook Login"

1. En el Dashboard de la app, busca **"Facebook Login"**
2. Haz clic en **"Set Up"** / **"Configurar"**
3. Selecciona **Web** como plataforma

### 1.4 Configurar URLs de Redirección

En **Facebook Login > Settings**, agrega estas **OAuth Redirect URIs**:

```
https://verifactu-business.firebaseapp.com/__/auth/handler
https://app.verifactu.business/__/auth/handler
```

### 1.5 Obtener Credenciales

En **Settings > Basic** de tu app de Facebook:

- **App ID**: Copia este valor
- **App Secret**: Haz clic en "Show" y copia el valor

⚠️ **IMPORTANTE**: El App Secret es confidencial. No lo compartas públicamente.

---

## 🔥 Paso 2: Configurar Firebase Console

### 2.1 Acceder a Authentication Providers

```
URL: https://console.firebase.google.com/project/verifactu-business/authentication/providers
```

### 2.2 Habilitar Facebook

1. En la lista de proveedores, busca **"Facebook"**
2. Haz clic en **"Facebook"** para abrirlo
3. Activa el switch **"Enable"** / **"Habilitar"**

### 2.3 Configurar Credenciales

Introduce las credenciales de Facebook:

- **App ID**: Pega el App ID de Facebook Developers
- **App secret**: Pega el App Secret de Facebook Developers

### 2.4 Copiar OAuth Redirect URI

Firebase te mostrará una **OAuth redirect URI**:

```
https://verifactu-business.firebaseapp.com/__/auth/handler
```

Copia esta URL (la necesitarás para Facebook Developers).

### 2.5 Guardar Cambios

Haz clic en **"Save"** / **"Guardar"**

---

## 🔐 Paso 3: Permisos de Facebook

### Permisos Solicitados

La implementación actual solicita:

```typescript
provider.addScope('email'); // Acceso al email del usuario
```

### Permisos Adicionales (Opcionales)

Si necesitas más datos, puedes agregar:

```typescript
provider.addScope('public_profile'); // Nombre, foto de perfil
provider.addScope('user_birthday');  // Fecha de nacimiento
provider.addScope('user_location');  // Ubicación
```

---

## 🧪 Paso 4: Probar la Integración

### 4.1 Prueba en Desarrollo

1. Ve a: http://localhost:3000/login
2. Haz clic en el botón **"Facebook"** (azul con icono)
3. Se abrirá una ventana de Facebook
4. Autoriza la aplicación
5. Deberías ser redirigido al dashboard

### 4.2 Verificar Sincronización

Comprueba que se crearon los registros en PostgreSQL:

```sql
-- Ver usuarios creados
SELECT * FROM users WHERE email LIKE '%facebook%';

-- Ver tenants asociados
SELECT t.* FROM tenants t
JOIN memberships m ON m.tenant_id = t.id
JOIN users u ON u.id = m.user_id
WHERE u.email LIKE '%facebook%';
```

### 4.3 Verificar en Firebase Console

```
URL: https://console.firebase.google.com/project/verifactu-business/authentication/users
```

Deberías ver el nuevo usuario con:
- **Provider:** facebook.com
- **Email:** (del perfil de Facebook)
- **Nombre:** (del perfil de Facebook)

---

## 🎨 Implementación en Código

### Archivo: `apps/app/components/auth/LoginForm.tsx`

```typescript
import { FacebookAuthProvider } from 'firebase/auth';

const handleFacebookLogin = async () => {
  setError('');
  setLoading(true);

  try {
    const provider = new FacebookAuthProvider();
    provider.addScope('email'); // Solicitar acceso al email
    const userCredential = await signInWithPopup(auth, provider);
    trackLogin('facebook');
    
    // Sincronizar con Prisma (auto-crear tenant, membership, etc.)
    await syncUserWithPrisma(userCredential.user);
    
    router.push('/dashboard');
  } catch (err: any) {
    console.error('Facebook auth error:', err);
    setError('Error al iniciar sesión con Facebook');
  } finally {
    setLoading(false);
  }
};
```

### Botón en UI

```tsx
<button
  onClick={handleFacebookLogin}
  disabled={loading}
  className="mt-3 w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white py-2 px-4 rounded-md hover:bg-[#166FE5]"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    {/* Icono de Facebook */}
  </svg>
  Facebook
</button>
```

---

## 🔄 Flujo Completo de Autenticación

```
1. Usuario hace clic en "Facebook"
   ↓
2. Firebase abre ventana de Facebook
   ↓
3. Usuario autoriza la app
   ↓
4. Facebook redirige con token a Firebase
   ↓
5. Firebase crea/valida usuario
   ↓
6. App llama a /api/auth/sync-user
   ↓
7. Se crea:
   - User en PostgreSQL (con Firebase UID)
   - Tenant ("{nombre}'s Business")
   - Membership (role: owner)
   - UserPreference (preferredTenantId)
   - Subscription (trial 14 días)
   ↓
8. Usuario redirigido a /dashboard
```

---

## 🐛 Troubleshooting

### Error: "App Not Set Up"

**Causa:** Facebook App no está en modo "Live"  
**Solución:**
1. Ve a **Settings > Basic** en Facebook Developers
2. Completa toda la información requerida
3. Activa el switch **"App Mode: Live"**

### Error: "Invalid OAuth Redirect URI"

**Causa:** La URI no está registrada en Facebook  
**Solución:**
1. Verifica las URIs en **Facebook Login > Settings**
2. Asegúrate de incluir:
   - `https://verifactu-business.firebaseapp.com/__/auth/handler`
   - `https://app.verifactu.business/__/auth/handler`

### Error: "Email Not Provided"

**Causa:** Usuario no tiene email público en Facebook  
**Solución:**
- Solicita permisos adicionales: `provider.addScope('email')`
- Verifica que el email esté visible en la configuración de privacidad del usuario

### Error: "This App Cannot Be Used in This Country"

**Causa:** App de Facebook tiene restricciones geográficas  
**Solución:**
1. Ve a **Settings > Basic**
2. En **App Restrictions**, elimina restricciones de país

---

## 📊 Datos Recibidos de Facebook

Al autenticarse, Firebase recibe:

```typescript
{
  uid: "facebook:1234567890", // ID único de Firebase
  providerId: "facebook.com",
  email: "usuario@example.com",
  displayName: "Juan Pérez",
  photoURL: "https://graph.facebook.com/.../picture",
  emailVerified: true, // Facebook verifica emails
}
```

---

## 🔒 Seguridad

### App Secret

- **NUNCA** expongas el App Secret en código del cliente
- Guárdalo solo en Firebase Console
- Rótalo periódicamente en caso de compromiso

### Permisos

- Solicita solo los permisos estrictamente necesarios
- Facebook revisa apps que solicitan permisos avanzados
- Más permisos = más tiempo de revisión

### Testing

- Usa el modo "Development" de Facebook para pruebas internas
- Agrega testers en **Roles > Test Users**
- Pasa a "Live" solo cuando esté listo para producción

---

## ✅ Checklist de Configuración

- [ ] Crear Facebook App en developers.facebook.com
- [ ] Agregar producto "Facebook Login"
- [ ] Configurar OAuth Redirect URIs en Facebook
- [ ] Copiar App ID y App Secret
- [ ] Habilitar proveedor Facebook en Firebase Console
- [ ] Introducir credenciales en Firebase
- [ ] Guardar cambios en Firebase
- [ ] Probar login en localhost:3000/login
- [ ] Verificar usuario en Firebase Console
- [ ] Verificar registros en PostgreSQL
- [ ] Pasar app de Facebook a modo "Live"
- [ ] Probar en producción (app.verifactu.business)

---

## 🔗 Enlaces Útiles

- **Facebook Developers Console:** https://developers.facebook.com/apps/
- **Firebase Authentication:** https://console.firebase.google.com/project/verifactu-business/authentication/providers
- **Facebook Login Documentation:** https://developers.facebook.com/docs/facebook-login/web
- **Firebase Facebook Auth Guide:** https://firebase.google.com/docs/auth/web/facebook-login

---

## 📝 Notas Adicionales

1. **Email Opcional en Facebook:**
   - Algunos usuarios de Facebook no tienen email público
   - Tu app debe manejar casos donde `user.email` sea `null`
   - Considera solicitar email en un formulario posterior si no está disponible

2. **Foto de Perfil:**
   - Facebook proporciona URL de foto de perfil
   - Se guarda en `user.photoURL` automáticamente
   - La foto se muestra en el Topbar del dashboard

3. **Nombres de Usuario:**
   - Facebook proporciona `displayName` completo
   - Se usa para crear el nombre del Tenant: "{displayName}'s Business"

4. **Re-autenticación:**
   - Los tokens de Facebook expiran
   - Firebase maneja la renovación automáticamente
   - El usuario solo necesita re-autenticarse si revoca permisos en Facebook

---

**🎯 Una vez completada esta configuración, Facebook OAuth estará 100% funcional en producción.**
