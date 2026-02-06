# Firebase Auth Integration Guide

## ✅ Completado

Se ha integrado exitosamente **Firebase Authentication** en todas las páginas de autenticación del landing.

---

## 🔧 Configuración Instalada

### 1. Firebase SDK

```bash
npm install firebase
```

### 2. Archivos Creados

#### `app/lib/firebase.ts` - Inicialización de Firebase

- ✅ Client-side only initialization (evita SSR issues)
- ✅ Configuración desde variables de entorno
- ✅ Persistencia de sesión automática
- ✅ Soporte para Firebase Emulator (desarrollo local)

#### `app/lib/auth.ts` - Funciones de Autenticación Reutilizables

**Funciones incluidas:**

- `signUpWithEmail(email, password)` - Registro con email
- `signInWithEmail(email, password)` - Login con email
- `signInWithGoogle()` - Google OAuth login
- `sendResetEmail(email)` - Enviar email de reset
- `resetPasswordWithCode(code, password)` - Confirmar reset
- `resendVerificationEmail(user)` - Reenviar email de verificación
- `logout()` - Cerrar sesión
- `getCurrentUser()` - Obtener usuario actual

**Manejo de errores:**

- Mapeo de errores Firebase a mensajes en español
- Mensajes amigables para el usuario
- Codes de error para debugging

#### `app/context/AuthContext.tsx` - Context Global

- ✅ Hook `useAuth()` para acceder al estado
- ✅ Propiedades: `user`, `loading`, `isEmailVerified`
- ✅ Escuchador `onAuthStateChanged` automático

---

## 📄 Páginas Actualizadas

### `/auth/login` - Iniciar Sesión

✅ Email + Contraseña integrado con Firebase
✅ Google OAuth integrado
✅ Verificación de email antes de permitir login
✅ Mensajes de error localizados
✅ Link a "/auth/forgot-password"

### `/auth/signup` - Registro

✅ Registro con email y contraseña
✅ Email verificación automática
✅ Google OAuth integrado
✅ Redirección a `/auth/verify-email` tras registro
✅ Validaciones en tiempo real

### `/auth/forgot-password` - Recuperar Contraseña

✅ Envío de código de reset por email
✅ Confirmación con código + nueva contraseña
✅ Mensajes de error claros
✅ Opción para reenviar código

### `/auth/verify-email` - Verificación de Email (NUEVO)

✅ Página dedicada para confirmar email
✅ Polling automático para detectar verificación
✅ Opción para reenviar email con countdown (60s)
✅ Redirección automática al dashboard tras verificar
✅ Link para volver a login

---

## 🔐 Flujos Implementados

### Registro (Signup)

```
1. Usuario ingresa email y contraseña
2. signUpWithEmail() crea la cuenta
3. sendEmailVerification() envía email
4. Redirección a /auth/verify-email
5. Usuario hace clic en email
6. onAuthStateChanged detecta emailVerified
7. Redirección automática al dashboard
```

### Login

```
1. Usuario ingresa credenciales
2. signInWithEmail() intenta login
3. Verifica que emailVerified = true
4. Si no está verificado → mensaje de error
5. Si verificado → redirección al dashboard
```

### Olvido de Contraseña

```
1. Usuario ingresa email
2. sendResetEmail() envía código
3. Usuario recibe email con código
4. Ingresa código + nueva contraseña
5. resetPasswordWithCode() confirma
6. Redirección a login
```

### Google OAuth

```
1. Usuario hace clic "Continuar con Google"
2. signInWithGoogle() abre popup
3. Google verifica identidad
4. createUserWithEmailAndPassword automático (si no existe)
5. Redirección al dashboard
```

---

## 🎛️ Variables de Entorno Requeridas

**Crear archivo `.env.local` en `apps/landing/`:**

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional: Firebase Emulator for local dev
NEXT_PUBLIC_USE_AUTH_EMULATOR=false
```

**Obtener valores de Firebase Console:**

1. https://console.firebase.google.com
2. Crear proyecto (o usar existente)
3. Ir a "Project Settings"
4. Copiar config objeto

---

## 🧪 Testing Local

### Dev Server

```bash
npm run dev --port 3001
```

Luego visita:

- http://localhost:3001/auth/login
- http://localhost:3001/auth/signup
- http://localhost:3001/auth/forgot-password
- http://localhost:3001/auth/verify-email

### Flujo Completo Recomendado

1. **Signup:**
   - Ir a `/auth/signup`
   - Ingresar email: `test@example.com`
   - Contraseña: `Test1234!`
   - Aceptar términos
   - Click "Crear cuenta"
   - Redirige a `/auth/verify-email`

2. **Verificación:**
   - Revisa Gmail/Outlook en la carpeta de verificación
   - Click en enlace de verificación
   - Página detecta automáticamente
   - Redirige al dashboard

3. **Login:**
   - Vuelve a `/auth/login`
   - Ingresa mismas credenciales
   - Click "Iniciar sesión"
   - Acceso permitido (email verificado)

4. **Olvido de Contraseña:**
   - Ir a `/auth/forgot-password`
   - Ingresar email
   - Recibir código por email
   - Confirmar con código + nueva contraseña
   - Redirecciona a login

---

## 📊 Arquitectura

### Flujo de Datos

```
Page Component (UI)
        ↓
Firebase Auth Functions (app/lib/auth.ts)
        ↓
Firebase SDK
        ↓
Firebase Backend (remote)
        ↓
AuthContext (Global State)
        ↓
Otros componentes via useAuth()
```

### Responsabilidades

**Pages** (UI + estado local):

- Formularios
- Validaciones
- Estados de loading/error
- Redirecciones

**Auth Functions** (Lógica):

- Comunicación con Firebase
- Mapeo de errores
- Funciones reutilizables

**AuthContext** (Estado Global):

- Usuario actual
- Estado de autenticación
- Email verificado o no

---

## 🔒 Seguridad Implementada

✅ **Client-side only initialization**

- Firebase nunca se ejecuta en servidor
- Evita exposición de credenciales en logs

✅ **Persistence automática**

- Usuario permanece logged in tras refresh
- Token guardado en localStorage

✅ **Email verification obligatoria**

- Login rechazado si email no verificado
- Redirección automática a verify-email

✅ **Error handling**

- Mensajes amigables para usuario
- Codes de error para debugging
- No expone detalles internos

✅ **Validaciones frontend**

- Email válido
- Contraseña mínimo 8 caracteres
- Contraseñas coinciden
- Términos aceptados

---

## 📱 Páginas de Prueba

| URL                     | Estado      | Notas                  |
| ----------------------- | ----------- | ---------------------- |
| `/auth/login`           | ✅ Completa | Con Google OAuth       |
| `/auth/signup`          | ✅ Completa | Con verificación email |
| `/auth/forgot-password` | ✅ Completa | Multi-paso             |
| `/auth/verify-email`    | ✅ Completa | Con polling automático |

---

## 🔄 Cambios Requeridos en Firebase Console

### 1. Habilitar Google Sign-in

**Firebase Console > Authentication > Sign-in method**

- ✅ Email/Password
- ✅ Google (requiere OAuth credentials)

### 2. Configurar Dominio Autorizado

**Firebase Console > Authentication > Settings**

- `localhost:3001` (desarrollo)
- `localhost:3000` (alternativa)
- `verifactu.business` (producción)

### 3. Email Templates (Opcional pero Recomendado)

**Firebase Console > Authentication > Templates**

- Personalizar email de verificación
- Personalizar email de reset

---

## 🐛 Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"

**Solución:** Verificar que `.env.local` tiene las credenciales correctas

### Error: "Cannot read properties of undefined"

**Solución:** Usar `"use client"` en componentes que usen auth

### Email no llega

**Solución:**

1. Revisar carpeta Spam
2. Reenviar código en verify-email
3. Verificar email en Firebase Console

### Google Login falla

**Solución:**

1. Verificar que OAuth está habilitado
2. Verificar dominio en whitelist
3. Revisar Chrome DevTools > Network

---

## ✨ Próximas Mejoras Opcionales

- [ ] 2FA (Autenticación de dos factores)
- [ ] ReCAPTCHA en signup para prevenir bots
- [ ] Social login (GitHub, Apple)
- [ ] Verificación por SMS
- [ ] Enlace de verificación con tiempo de expiración
- [ ] Dashboard con perfil de usuario

---

## 📚 Referencias

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Next.js Auth Patterns](https://nextjs.org/docs/authentication)
- [Firebase Admin SDK](https://firebase.google.com/docs/auth/admin-setup)

---

**Status:** ✅ Integración completada y validada  
**Build:** ✅ Exitoso (npm run build)  
**Deploy:** ✅ Listo para Vercel  
**Última actualización:** Diciembre 2024
