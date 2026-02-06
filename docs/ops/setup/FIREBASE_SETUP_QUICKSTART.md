# 🚀 Pasos Siguientes: Conectar Firebase Auth

## 1️⃣ Crear Proyecto en Firebase

### A. Ir a Firebase Console

```
https://console.firebase.google.com
```

### B. Crear Nuevo Proyecto

- Click "Add project"
- Nombre: `verifactu-business` (o similar)
- Continuar, aceptar términos
- Crear proyecto

### C. Obtener Credenciales

1. **Project Settings** (rueda ⚙️ en arriba a la izquierda)
2. Ir a la pestaña "General"
3. Scroll abajo a "Your apps"
4. Click "Add app" → Web (símbolo `</>`)
5. Registrar app como `verifactu-landing`
6. Copiar el config object:

```javascript
const firebaseConfig = {
  apiKey: 'AIz...',
  authDomain: 'verifactu-business.firebaseapp.com',
  projectId: 'verifactu-business',
  storageBucket: 'verifactu-business.appspot.com',
  messagingSenderId: '12345...',
  appId: '1:12345...',
};
```

---

## 2️⃣ Configurar Variables de Entorno

### A. Crear archivo `.env.local`

```bash
cd apps/landing
touch .env.local  # En macOS/Linux
# O crear manualmente en Windows
```

### B. Pegar credenciales

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIz...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=verifactu-business.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789...
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcd...
```

⚠️ **Importante:** NO commitear `.env.local` (ya está en .gitignore)

---

## 3️⃣ Habilitar Sign-in Methods

En Firebase Console:

### A. Email/Password

1. **Authentication** → "Sign-in method"
2. Click "Email/Password"
3. Habilitar ambas opciones:
   - ✅ Email/Password
   - ✅ Email link (optional)
4. Click "Save"

### B. Google Sign-in

1. **Authentication** → "Sign-in method"
2. Click "Google"
3. Habilitar
4. Seleccionar project support email
5. Click "Save"

---

## 4️⃣ Autorizar Dominios

En Firebase Console → **Authentication** → **Settings** → "Authorized domains"

Agregar:

```
localhost
localhost:3000
localhost:3001
127.0.0.1
verifactu.business     (producción)
www.verifactu.business (producción)
```

---

## 5️⃣ Configurar Google OAuth (Recomendado)

Para que Google Sign-in funcione en producción:

### A. Google Cloud Console

1. Ir a https://console.cloud.google.com
2. Seleccionar proyecto (Firebase lo crea automáticamente)
3. **APIs & Services** → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Tipo: "Web application"
6. Authorized JavaScript origins:
   ```
   http://localhost:3000
   http://localhost:3001
   https://verifactu.business
   https://www.verifactu.business
   ```
7. Authorized redirect URIs:
   ```
   http://localhost:3000/auth/login
   http://localhost:3001/auth/login
   https://verifactu.business/auth/login
   https://www.verifactu.business/auth/login
   ```
8. Copiar Client ID

### B. Usar en Firebase

- Firebase maneja esto automáticamente
- Solo habilitar "Google" en Sign-in methods

---

## 6️⃣ Configurar Email Verification

### Personalizar Templates (Opcional)

En Firebase Console:

1. **Authentication** → "Templates"
2. Emails:
   - Verification email
   - Password reset
   - Custom domain (si tienes)

---

## 7️⃣ Probar Localmente

### A. Iniciar Dev Server

```bash
cd apps/landing
npm run dev --port 3001
```

### B. Ir a Signup

```
http://localhost:3001/auth/signup
```

### C. Crear Cuenta

- Email: `test@example.com`
- Contraseña: `TestPassword123!`
- Aceptar términos

### D. Verificar Email

- Firebase envia email automáticamente
- Revisar Gmail/Outlook
- Click en link de verificación

### E. Loguear

```
http://localhost:3001/auth/login
```

- Mismas credenciales
- Acceso permitido

---

## 8️⃣ Verificar Build

```bash
cd apps/landing
npm run build
```

Debería mostrar:

```
✓ Compiled successfully
...
✓ Generating static pages (9/9)
```

---

## 9️⃣ Deploy a Vercel

### A. Variables de Entorno en Vercel

1. Vercel Dashboard → Project Settings
2. Environment Variables
3. Agregar:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY = AIz...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = ...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID = ...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = ...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = ...
   NEXT_PUBLIC_FIREBASE_APP_ID = ...
   ```

### B. Autorizar Dominio en Firebase

En Firebase Console → **Authentication** → **Settings**

Agregar `verifactu.business` y `*.vercel.app`

### C. Deploy

```bash
git push origin main
```

Vercel deployará automáticamente

---

## 🔟 Testing Completo

### Checklist de Pruebas

- [ ] Signup con email ✓
- [ ] Email verification llega
- [ ] Click en email verifica
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Forgot password funciona
- [ ] Google OAuth funciona
- [ ] En móvil funciona
- [ ] Build sin errores

---

## ⚠️ Errores Comunes

### "Firebase: Error (auth/invalid-api-key)"

**Causa:** Credenciales incorrectas o faltantes
**Solución:** Verificar `.env.local`

### "Popup closed by user"

**Causa:** Usuario canceló Google login
**Solución:** No es error, intenta de nuevo

### "Email not verified"

**Causa:** Usuario no hizo clic en link
**Solución:** Ir a `/auth/verify-email` y reenviar

### "Domain not authorized"

**Causa:** Dominio no está en whitelist
**Solución:** Agregar a Authorized domains

---

## 📞 Support

Si necesitas ayuda:

1. Revisar [FIREBASE_AUTH_SETUP.md](FIREBASE_AUTH_SETUP.md) para más detalles
2. Revisar [AUTH_PAGES_GUIDE.md](AUTH_PAGES_GUIDE.md) para estructura de componentes
3. Consultardocs de Firebase: https://firebase.google.com/docs

---

**Una vez completes estos pasos, tu landing tendrá autenticación completamente funcional! 🎉**
