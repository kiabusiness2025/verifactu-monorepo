# 📱 Flutter App - Quick Start

## ✅ Proyecto Creado

La app Flutter de Verifactu está lista en `apps/mobile/`

**Configuración:**
- **Flutter**: 3.38.6
- **Dart**: 3.10.7
- **Plataformas**: Android, iOS, Web
- **Firebase**: Configurado con verifactu-business

**Firebase Apps Registradas:**
- 📱 **Android**: `business.verifactu.verifactu_mobile`
- 🍎 **iOS**: `business.verifactu.verifactuMobile`
- 🌐 **Web**: `verifactu_mobile`

**Paquetes Instalados:**
- `firebase_core` v4.3.0
- `firebase_auth` v6.1.3
- `firebase_remote_config` v6.1.3
- `cloud_firestore` v6.1.1

---

## 🚀 Ejecutar la App

### Opción 1: Web (Chrome) - La más rápida

```bash
cd c:\dev\verifactu-monorepo\apps\mobile
flutter run -d chrome
```

Presiona `r` para hot reload cuando hagas cambios.

### Opción 2: Windows Desktop

```bash
cd c:\dev\verifactu-monorepo\apps\mobile
flutter run -d windows
```

### Opción 3: Android Emulator

1. **Iniciar Android Studio**
2. **Tools → Device Manager**
3. **Create Device** (si no tienes ninguno)
4. **Start** emulator

Luego:

```bash
cd c:\dev\verifactu-monorepo\apps\mobile

# Ver dispositivos disponibles
flutter devices

# Ejecutar en emulador
flutter run
```

---

## 📁 Estructura del Proyecto

```
apps/mobile/
├── android/          # Configuración Android
├── ios/              # Configuración iOS
├── web/              # Configuración Web
├── lib/
│   ├── main.dart               # Punto de entrada
│   └── firebase_options.dart   # Config Firebase (auto-generado)
├── test/             # Tests unitarios
├── pubspec.yaml      # Dependencias
└── firebase.json     # Configuración Firebase
```

---

## 🔥 Inicializar Firebase en la App

Edita `lib/main.dart` para agregar Firebase:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Verifactu Business',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Color(0xFF0060F0)),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verifactu Business'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.business,
              size: 100,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 20),
            const Text(
              '¡Bienvenido a Verifactu!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            const Text(
              'Tu asistente de facturación',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 🔐 Usar Firebase Auth

Ejemplo de login con email/password:

```dart
import 'package:firebase_auth/firebase_auth.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Registrar usuario
  Future<UserCredential?> register(String email, String password) async {
    try {
      return await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
    } catch (e) {
      print('Error en registro: $e');
      return null;
    }
  }

  // Login
  Future<UserCredential?> login(String email, String password) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } catch (e) {
      print('Error en login: $e');
      return null;
    }
  }

  // Logout
  Future<void> logout() async {
    await _auth.signOut();
  }

  // Usuario actual
  User? get currentUser => _auth.currentUser;

  // Stream de cambios de auth
  Stream<User?> get authStateChanges => _auth.authStateChanges();
}
```

---

## 🎯 Usar Remote Config

Ejemplo de feature flags:

```dart
import 'package:firebase_remote_config/firebase_remote_config.dart';

class RemoteConfigService {
  final FirebaseRemoteConfig _remoteConfig = FirebaseRemoteConfig.instance;

  Future<void> initialize() async {
    await _remoteConfig.setConfigSettings(RemoteConfigSettings(
      fetchTimeout: const Duration(minutes: 1),
      minimumFetchInterval: const Duration(hours: 1),
    ));

    // Valores por defecto
    await _remoteConfig.setDefaults({
      'feature_isaak_chat': true,
      'feature_new_dashboard': false,
      'ui_theme_primary_color': '#0060F0',
      'pricing_free_invoices_limit': 10,
    });

    // Fetch valores
    await _remoteConfig.fetchAndActivate();
  }

  bool getFeatureFlag(String key) {
    return _remoteConfig.getBool(key);
  }

  String getString(String key) {
    return _remoteConfig.getString(key);
  }

  int getInt(String key) {
    return _remoteConfig.getInt(key);
  }
}
```

---

## 📦 Usar Firestore

Ejemplo de CRUD:

```dart
import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Crear documento
  Future<void> createInvoice(Map<String, dynamic> data) async {
    await _db.collection('invoices').add(data);
  }

  // Leer documentos
  Stream<QuerySnapshot> getInvoices() {
    return _db.collection('invoices').orderBy('date', descending: true).snapshots();
  }

  // Actualizar documento
  Future<void> updateInvoice(String id, Map<String, dynamic> data) async {
    await _db.collection('invoices').doc(id).update(data);
  }

  // Eliminar documento
  Future<void> deleteInvoice(String id) async {
    await _db.collection('invoices').doc(id).delete();
  }
}
```

---

## 🛠️ Comandos Útiles

```bash
# Ver dispositivos disponibles
flutter devices

# Ejecutar en dispositivo específico
flutter run -d <device_id>

# Ejecutar en Chrome
flutter run -d chrome

# Ejecutar en modo release (optimizado)
flutter run --release

# Hot reload (mientras la app corre)
# Presiona: r

# Hot restart (mientras la app corre)
# Presiona: R

# Salir
# Presiona: q

# Limpiar build
flutter clean

# Ver paquetes desactualizados
flutter pub outdated

# Actualizar dependencias
flutter pub upgrade

# Analizar código
flutter analyze

# Ejecutar tests
flutter test

# Build para Android
flutter build apk

# Build para iOS (requiere Mac)
flutter build ios

# Build para Web
flutter build web
```

---

## 📱 Build Production

### Android APK

```bash
flutter build apk --release
```

APK generado en: `build/app/outputs/flutter-apk/app-release.apk`

### Android App Bundle (para Google Play)

```bash
flutter build appbundle --release
```

Bundle generado en: `build/app/outputs/bundle/release/app-release.aab`

### iOS (requiere Mac con Xcode)

```bash
flutter build ios --release
```

### Web

```bash
flutter build web --release
```

Archivos en: `build/web/`

---

## 🐛 Troubleshooting

### Error: "No connected devices"

```bash
# Para web
flutter run -d chrome

# Para Android, iniciar emulador
flutter emulators
flutter emulators --launch <emulator_name>
```

### Error: "Gradle build failed"

```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
```

### Error: Firebase no inicializado

Asegúrate de tener en `main.dart`:

```dart
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

### Hot reload no funciona

Presiona `R` (mayúscula) para hot restart.

---

## 📚 Recursos

- [Flutter Docs](https://docs.flutter.dev/)
- [Firebase Flutter](https://firebase.google.com/docs/flutter/setup)
- [Material Design 3](https://m3.material.io/)
- [Pub.dev (paquetes)](https://pub.dev/)

---

## 🎯 Próximos Pasos

1. **Personalizar UI**: Edita `lib/main.dart`
2. **Agregar Auth**: Implementa login con Firebase Auth
3. **Sincronizar con Web**: Usar misma API que apps/app
4. **Testear en Android**: Crear APK y probar
5. **Publicar**: Google Play Store / Apple App Store

---

**App lista para desarrollar! 🚀**
