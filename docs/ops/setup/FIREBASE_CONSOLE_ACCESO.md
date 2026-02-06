# 🔥 Acceso a Firebase Console - Guía Rápida

## 🎯 URL Correcta del Proyecto

**Tu proyecto Firebase:**

```
verifactu-business
```

**URL directa de la consola:**

```
https://console.firebase.google.com/project/verifactu-business
```

---

## 🔐 Credenciales de Acceso

**Email de Google registrado:**

```
kiabusiness2025@gmail.com
```

**Proyecto ID:**

```
verifactu-business
```

---

## 📱 Aplicaciones Registradas

### Web App

- **Nombre:** `verifactu_mobile` (web)
- **App ID:** `1:536174799167:web:69c286d928239c9069cb8a`
- **Dominio autorizado:** `app.verifactu.business`

### Android App (Flutter)

- **Package Name:** `business.verifactu.verifactu_mobile`
- **App ID:** Android registrado

### iOS App (Flutter)

- **Bundle ID:** `business.verifactu.verifactuMobile`
- **App ID:** iOS registrado

---

## 🚀 Servicios Activos

### 1. **Authentication**

📍 https://console.firebase.google.com/project/verifactu-business/authentication

**Proveedores habilitados:**

- ✅ Email/Password
- ✅ Google OAuth (configurado)

**Dominios autorizados:**

- `app.verifactu.business`
- `localhost`
- `verifactu-business.firebaseapp.com`

### 2. **Firestore Database**

📍 https://console.firebase.google.com/project/verifactu-business/firestore

**Modo:** Producción  
**Región:** us-central1 (o la seleccionada)

**Colecciones sugeridas:**

- `tenants/` - Multi-tenancy
- `invoices/` - Facturas en tiempo real
- `notifications/` - Notificaciones
- `chat_messages/` - Mensajes de Isaak

### 3. **Remote Config**

📍 https://console.firebase.google.com/project/verifactu-business/config

**Parámetros configurados:**

```json
{
  "feature_isaak_chat": true,
  "feature_new_dashboard": false,
  "ui_theme_primary_color": "#0060F0",
  "pricing_free_invoices_limit": 10,
  "maintenance_mode": false
}
```

### 4. **Analytics**

📍 https://console.firebase.google.com/project/verifactu-business/analytics

**Measurement ID:** `G-F91R5J137F`

**Eventos personalizados:**

- `login` - Usuario inicia sesión
- `sign_up` - Usuario se registra
- `invoice_created` - Factura creada
- `feature_used` - Feature utilizado

### 5. **Cloud Storage** (opcional)

📍 https://console.firebase.google.com/project/verifactu-business/storage

**Para:** Subir logos, facturas PDF, archivos adjuntos

---

## 🔧 Configuración Actual en Código

### Web App (apps/app/lib/firebase.ts)

```typescript
const firebaseConfig = {
  apiKey: 'AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o',
  authDomain: 'verifactu-business.firebaseapp.com',
  projectId: 'verifactu-business',
  storageBucket: 'verifactu-business.firebasestorage.app',
  messagingSenderId: '536174799167',
  appId: '1:536174799167:web:69c286d928239c9069cb8a',
  measurementId: 'G-F91R5J137F',
};
```

### Flutter App (apps/mobile/lib/firebase_options.dart)

```dart
// Auto-generado por flutterfire configure
// No modificar manualmente
```

---

## 📊 Ver Datos en Firebase

### Authentication - Usuarios

1. Ir a Authentication → Users
2. Ver lista de usuarios registrados
3. Buscar por email
4. Ver providers (Email, Google, etc.)
5. Deshabilitar/eliminar usuarios

### Firestore - Datos en tiempo real

1. Ir a Firestore Database → Data
2. Ver colecciones y documentos
3. Agregar/editar/eliminar datos manualmente
4. Ver índices y reglas de seguridad

### Remote Config - Feature Flags

1. Ir a Remote Config
2. Editar parámetros
3. Publicar cambios
4. Ver historial de versiones

### Analytics - Métricas

1. Ir a Analytics → Dashboard
2. Ver usuarios activos
3. Ver eventos personalizados
4. Configurar audiencias

---

## 🛡️ Reglas de Seguridad

### Firestore Rules (recomendadas)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Multi-tenant: usuarios solo pueden acceder a su tenant
    match /tenants/{tenantId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid in get(/databases/$(database)/documents/tenants/$(tenantId)).data.members;
    }

    // Facturas: solo del tenant del usuario
    match /invoices/{invoiceId} {
      allow read, write: if request.auth != null
        && resource.data.tenantId in request.auth.token.tenants;
    }
  }
}
```

### Storage Rules (recomendadas)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Solo usuarios autenticados pueden subir archivos
    match /uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

---

## 🧪 Probar Authentication

### Crear usuario de prueba

```bash
# En Firebase Console → Authentication → Add user
Email: test@verifactu.business
Password: Test123456!
```

### Probar login en la app

```
1. Ir a: https://app.verifactu.business/login
2. Email: test@verifactu.business
3. Password: Test123456!
4. Click "Iniciar Sesión"
```

---

## 🔍 Troubleshooting

### Error: "No aparece la app en Firebase Console"

✅ **Solución:** Usar la URL correcta

```
❌ https://studio.firebase.google.com/varifactuapp-77201123
✅ https://console.firebase.google.com/project/verifactu-business
```

### Error: "Auth domain not authorized"

1. Ir a Authentication → Settings → Authorized domains
2. Agregar: `app.verifactu.business`
3. Agregar: `localhost` (para desarrollo)

### Error: "API key not valid"

1. Verificar que el API key en `lib/firebase.ts` es correcto
2. Regenerar API key si es necesario en Project Settings

### Error: "Quota exceeded"

1. Firebase tiene límites gratuitos
2. Ver Usage en Firebase Console
3. Upgrade a plan Blaze si es necesario

---

## 📱 Flutter Mobile

### Ver apps móviles registradas

📍 https://console.firebase.google.com/project/verifactu-business/settings/general

**Android:**

- SHA-1: Pendiente de configurar
- SHA-256: Pendiente de configurar
- Download google-services.json

**iOS:**

- Download GoogleService-Info.plist

---

## ⚡ Comandos Útiles

### Firebase CLI

```bash
# Ver proyectos
firebase projects:list

# Usar proyecto
firebase use verifactu-business

# Ver configuración
firebase projects:list

# Deploy reglas (NO HOSTING)
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### FlutterFire CLI

```bash
# Reconfigurar Firebase en Flutter
cd apps/mobile
flutterfire configure --project=verifactu-business
```

---

## 🎯 Próximos Pasos

- [ ] Habilitar más providers OAuth (GitHub, Microsoft)
- [ ] Configurar reglas de Firestore
- [ ] Agregar Cloud Functions para lógica backend
- [ ] Configurar FCM (Firebase Cloud Messaging) para notificaciones
- [ ] Setup de Cloud Storage para PDFs

---

**Última actualización:** 13 enero 2026  
**Email soporte:** kiabusiness2025@gmail.com
