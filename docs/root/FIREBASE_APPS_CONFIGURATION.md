# 🔥 Configuración de Apps Firebase para Verifactu

## Estado Actual de Apps

El proyecto tiene **3 apps** que usan Firebase:

1. **Landing Web** (`verifactu.business`) - Next.js
2. **App Web** (`app.verifactu.business`) - Next.js
3. **Mobile** (Android/iOS) - Flutter

---

## 📱 PASO 1: Configurar App Android en Firebase

### 1.1 Agregar/Actualizar App Android

1. Ve a: https://console.firebase.google.com/project/verifactu-business/settings/general
2. Scroll hasta **"Tus apps"**
3. Si NO existe app Android, haz clic en **"Agregar app"** → selecciona **Android**
4. Si ya existe, haz clic en el ícono de engranaje ⚙️ de la app Android

### 1.2 Configuración de la App

- **Nombre del paquete de Android:** `com.verifactu.business`
- **Alias de la app (opcional):** `Verifactu Business`

### 1.3 Obtener Huella Digital SHA-1 (Debug)

**Opción A: Usando keytool (requiere Java JDK)**

```powershell
# En PowerShell (Windows)
& "C:\Program Files\Java\jdk-XX\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Busca la línea que dice: `SHA1: XX:XX:XX:...`

**Opción B: Usando Android Studio**

1. Abre Android Studio
2. Ve a: **Gradle** → **android** → **Tasks** → **android** → **signingReport**
3. Doble clic en `signingReport`
4. Copia el SHA-1 del **Variant: debug**

**Opción C: Usando Flutter**

```powershell
cd c:\dev\verifactu-monorepo\apps\mobile
flutter run --debug
```

Durante el build, Flutter mostrará el SHA-1 en la consola.

### 1.4 Agregar SHA-1 a Firebase

1. En Firebase Console → Tu app Android → **"Huellas digitales de certificado"**
2. Haz clic en **"Agregar huella digital"**
3. Pega tu **SHA-1** (formato: `A1:B2:C3:...`)
4. Haz clic en **"Guardar"**

### 1.5 Descargar google-services.json ACTUALIZADO

1. En Firebase Console → Tu app Android
2. Haz clic en **"Descargar google-services.json"**
3. **REEMPLAZA** el archivo en: `apps/mobile/android/app/google-services.json`

---

## 🍎 PASO 2: Configurar App iOS en Firebase

### 2.1 Agregar App iOS

1. Ve a: https://console.firebase.google.com/project/verifactu-business/settings/general
2. Haz clic en **"Agregar app"** → selecciona **iOS**

### 2.2 Configuración de la App

- **ID del paquete de iOS:** `com.verifactu.business`
- **Alias de la app (opcional):** `Verifactu Business`
- **ID de App Store (opcional):** _(déjalo en blanco por ahora)_

### 2.3 Descargar GoogleService-Info.plist

1. Haz clic en **"Descargar GoogleService-Info.plist"**
2. Guárdalo en: `apps/mobile/ios/Runner/GoogleService-Info.plist`

### 2.4 Agregar archivo a Xcode (si usas iOS)

1. Abre `apps/mobile/ios/Runner.xcworkspace` en Xcode
2. Arrastra `GoogleService-Info.plist` a la carpeta `Runner`
3. Asegúrate de marcar **"Copy items if needed"**

---

## 🌐 PASO 3: Configurar Apps Web en Firebase

### 3.1 Verificar App Web (Landing)

1. Ve a: https://console.firebase.google.com/project/verifactu-business/settings/general
2. Busca app web con nombre: **"Verifactu Landing"** o **"Web app"**
3. Si NO existe, haz clic en **"Agregar app"** → selecciona **Web (</> icon)**
   - **Alias:** `Verifactu Landing`
   - **Firebase Hosting:** ✅ Marca esta opción si usas Firebase Hosting
   - Haz clic en **"Registrar app"**

### 3.2 Copiar Configuración Web

Copia el objeto `firebaseConfig` que aparece:

```javascript
const firebaseConfig = {
  apiKey: 'AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o',
  authDomain: 'verifactu-business.firebaseapp.com',
  projectId: 'verifactu-business',
  storageBucket: 'verifactu-business.firebasestorage.app',
  messagingSenderId: '536174799167',
  appId: '1:536174799167:web:cecdc93b701e133869cb8a',
};
```

### 3.3 Verificar Variables de Entorno (Landing)

Las variables ya están en `.env.local` de landing:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=verifactu-business.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=536174799167
NEXT_PUBLIC_FIREBASE_APP_ID=1:536174799167:web:cecdc93b701e133869cb8a
```

✅ **No requiere cambios** - ya está configurado correctamente.

---

## 🔄 PASO 4: Regenerar firebase_options.dart (Flutter)

Después de actualizar las apps en Firebase Console, regenera el archivo de configuración:

### 4.1 Instalar Firebase CLI (si no lo tienes)

```powershell
npm install -g firebase-tools
firebase login
```

### 4.2 Instalar FlutterFire CLI

```powershell
dart pub global activate flutterfire_cli
```

### 4.3 Regenerar Configuración

```powershell
cd c:\dev\verifactu-monorepo\apps\mobile
flutterfire configure --project=verifactu-business
```

Esto creará/actualizará:

- `lib/firebase_options.dart` ✅
- `android/app/google-services.json` ✅
- `ios/Runner/GoogleService-Info.plist` ✅

### 4.4 Selecciona Plataformas

Cuando pregunte qué plataformas configurar:

- ✅ **android** (com.verifactu.business)
- ✅ **ios** (com.verifactu.business)
- ✅ **web** (usa el mismo proyecto)

---

## ✅ PASO 5: Verificar Dominios Autorizados

### 5.1 En Firebase Authentication

1. Ve a: https://console.firebase.google.com/project/verifactu-business/authentication/settings
2. Pestaña **"Authorized domains"**
3. Verifica que estén:
   - ✅ `verifactu.business`
   - ✅ `app.verifactu.business`
   - ✅ `verifactu-business.firebaseapp.com`
   - ✅ `localhost` (para desarrollo)

Si falta alguno, haz clic en **"Add domain"** y agrégalo.

---

## 🧪 PASO 6: Probar Configuración

### 6.1 Probar Landing Web

```powershell
cd c:\dev\verifactu-monorepo\apps\landing
npx -y pnpm@10.27.0 dev -p 3001
```

Abre: http://localhost:3001/auth/login
Prueba login con Google ✅

### 6.2 Probar App Web

```powershell
cd c:\dev\verifactu-monorepo\apps\app
npx -y pnpm@10.27.0 dev
```

Abre: http://localhost:3000/dashboard
Debería tener sesión activa si ya te logueaste en landing ✅

### 6.3 Probar Mobile (Android)

```powershell
cd c:\dev\verifactu-monorepo\apps\mobile
flutter run -d chrome  # Para web
# o
flutter run  # Para Android/iOS (si tienes emulador)
```

---

## 📋 Checklist Final

### Apps Registradas en Firebase

- [ ] **Android** - `com.verifactu.business` con SHA-1
- [ ] **iOS** - `com.verifactu.business`
- [ ] **Web (Landing)** - dominio `verifactu.business`
- [ ] **Web (App)** - dominio `app.verifactu.business` (opcional, puede usar mismo web app)

### Archivos de Configuración Actualizados

- [ ] `apps/mobile/android/app/google-services.json` ← descargado de Firebase
- [ ] `apps/mobile/ios/Runner/GoogleService-Info.plist` ← descargado de Firebase
- [ ] `apps/mobile/lib/firebase_options.dart` ← regenerado con flutterfire CLI

### Google OAuth Configurado

- [ ] Client ID configurado en Firebase Authentication → Google provider
- [ ] Client Secret configurado en Firebase Authentication → Google provider
- [ ] Redirect URIs incluyen `https://verifactu-business.firebaseapp.com/__/auth/handler`

### Dominios Autorizados

- [ ] `verifactu.business` en Firebase Authentication
- [ ] `app.verifactu.business` en Firebase Authentication
- [ ] Mismo dominios en Google Cloud Console OAuth

---

## 🚀 Próximos Pasos

1. **Completa PASO 1** - Agrega SHA-1 a Firebase y descarga `google-services.json`
2. **Completa PASO 2** - Crea app iOS y descarga `GoogleService-Info.plist`
3. **Ejecuta PASO 4** - Regenera `firebase_options.dart` con FlutterFire CLI
4. **Prueba PASO 6** - Verifica que Google OAuth funcione en todas las apps

**Cuando termines, avísame y probaremos el flujo completo de autenticación.**
