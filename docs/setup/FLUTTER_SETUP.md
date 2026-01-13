# 📱 Flutter Setup - Verifactu Mobile

## ⚠️ Flutter no está instalado

Necesitas instalar Flutter SDK para continuar. Hay dos opciones:

## Opción 1: Instalar Flutter con Chocolatey (Recomendado en Windows)

### 1. Instalar Chocolatey (si no lo tienes)

Abre PowerShell como **Administrador** y ejecuta:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Instalar Flutter

```powershell
choco install flutter -y
```

### 3. Agregar al PATH

Cierra y reabre PowerShell, luego verifica:

```powershell
flutter --version
```

## Opción 2: Instalación Manual

### 1. Descargar Flutter SDK

Ve a: https://docs.flutter.dev/get-started/install/windows

Descarga el archivo ZIP de Flutter para Windows.

### 2. Extraer a una ubicación permanente

Ejemplo: `C:\src\flutter`

⚠️ **NO** instales en `C:\Program Files\` (problemas de permisos)

### 3. Agregar al PATH

1. Busca "Variables de entorno" en Windows
2. Click en "Variables de entorno"
3. En "Variables del sistema", selecciona `Path` → Editar
4. Click "Nuevo" y agrega: `C:\src\flutter\bin`
5. Click OK en todas las ventanas
6. **Cierra y reabre PowerShell**

### 4. Verificar instalación

```powershell
flutter --version
```

## Configurar Flutter

### 1. Ejecutar Flutter Doctor

```bash
flutter doctor
```

Esto verifica qué falta configurar.

### 2. Instalar Android Studio (para Android)

1. Descarga de: https://developer.android.com/studio
2. Instala Android Studio
3. Abre Android Studio
4. Ve a Tools → SDK Manager
5. Instala:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android SDK (API 34 o superior)
6. Acepta las licencias:

```bash
flutter doctor --android-licenses
```

### 3. Instalar Visual Studio (para Windows Desktop)

Solo si quieres compilar apps de escritorio para Windows:

```powershell
choco install visualstudio2022community -y
choco install visualstudio2022-workload-nativedesktop -y
```

### 4. Configurar Chrome (para Web)

Flutter puede compilar a web usando Chrome. Ya debería estar instalado.

## Crear el proyecto Flutter

Una vez instalado Flutter:

```bash
cd c:\dev\verifactu-monorepo\apps

# Crear proyecto
flutter create mobile \
  --org business.verifactu \
  --project-name verifactu_mobile \
  --platforms android,ios,web

cd mobile

# Verificar que funciona
flutter run -d chrome
```

## Instalar FlutterFire CLI

### 1. Instalar Dart SDK

Si usaste Chocolatey:

```powershell
choco install dart-sdk -y
```

Si instalaste manualmente, Dart ya viene con Flutter.

### 2. Activar FlutterFire CLI

```bash
dart pub global activate flutterfire_cli
```

### 3. Configurar Firebase

Desde la raíz del proyecto Flutter:

```bash
cd c:\dev\verifactu-monorepo\apps\mobile

flutterfire configure --project=verifactu-business
```

Esto:
- ✅ Registra tus apps (Android/iOS/Web) en Firebase
- ✅ Descarga archivos de configuración
- ✅ Crea `lib/firebase_options.dart`

### 4. Agregar dependencias Firebase

```bash
flutter pub add firebase_core
flutter pub add firebase_auth
flutter pub add firebase_remote_config
flutter pub add cloud_firestore
```

## Estructura del proyecto

```
apps/mobile/
├── android/           # Proyecto Android nativo
├── ios/              # Proyecto iOS nativo
├── web/              # Proyecto Web
├── lib/              # Código Dart
│   ├── main.dart
│   └── firebase_options.dart  # Generado por FlutterFire
├── test/             # Tests
└── pubspec.yaml      # Dependencias
```

## Quick Start después de instalar

```bash
# Listar dispositivos disponibles
flutter devices

# Ejecutar en Chrome (web)
flutter run -d chrome

# Ejecutar en emulador Android
flutter emulators --launch <emulator_id>
flutter run -d <device_id>

# Hot reload durante desarrollo
# Mientras la app corre, presiona:
# r = hot reload
# R = hot restart
# q = quit
```

## Troubleshooting

### "Flutter no se reconoce como comando"

- Verifica que agregaste Flutter al PATH
- **Cierra y reabre PowerShell**
- Ejecuta: `$env:Path` para ver si `flutter\bin` está ahí

### "Unable to locate Android SDK"

```bash
flutter config --android-sdk C:\Users\<TU_USUARIO>\AppData\Local\Android\Sdk
```

### "cmdline-tools component is missing"

En Android Studio:
1. Tools → SDK Manager
2. SDK Tools tab
3. Marca "Android SDK Command-line Tools"
4. Apply

### "No connected devices"

Para web:
```bash
flutter run -d chrome
```

Para Android, inicia un emulador:
```bash
flutter emulators
flutter emulators --launch <emulator_name>
```

## Siguiente paso

Una vez instalado Flutter:

```bash
# Volver a ejecutar el comando de creación
cd c:\dev\verifactu-monorepo\apps
flutter create mobile --org business.verifactu --project-name verifactu_mobile
cd mobile
flutterfire configure --project=verifactu-business
```

## Recursos

- [Flutter Installation](https://docs.flutter.dev/get-started/install/windows)
- [FlutterFire Setup](https://firebase.google.com/docs/flutter/setup)
- [Flutter Doctor](https://docs.flutter.dev/get-started/install/windows#run-flutter-doctor)
- [Android Studio](https://developer.android.com/studio)

---

**Nota**: Flutter requiere ~2GB de espacio en disco para el SDK completo.
