# 📱 Instalación Flutter - Guía Paso a Paso

## ⚠️ IMPORTANTE: Ejecutar PowerShell como Administrador

Para todos estos pasos, **haz clic derecho en PowerShell → "Ejecutar como administrador"**

---

## Paso 1: Instalar Chocolatey

### Abrir PowerShell como Administrador

1. Presiona `Windows + X`
2. Selecciona **"Windows PowerShell (Admin)"** o **"Terminal (Admin)"**
3. Click **"Sí"** en el mensaje de control de cuentas de usuario

### Ejecutar el script de instalación

```powershell
cd c:\dev\verifactu-monorepo\scripts
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install-chocolatey.ps1
```

### ¿Qué hace este script?

- ✅ Configura el protocolo de seguridad
- ✅ Descarga el instalador de Chocolatey
- ✅ Instala Chocolatey en tu sistema

### ⚠️ Después de ejecutar

**CERRAR PowerShell completamente y REABRIR como Administrador**

---

## Paso 2: Verificar Chocolatey

Abre **nuevo** PowerShell como Administrador y ejecuta:

```powershell
choco --version
```

Deberías ver algo como: `2.3.0` o similar.

Si ves "choco no se reconoce", vuelve a cerrar y reabrir PowerShell.

---

## Paso 3: Instalar Flutter

En PowerShell como Administrador:

```powershell
cd c:\dev\verifactu-monorepo\scripts
.\install-flutter.ps1
```

### ¿Qué hace este script?

- ✅ Verifica que Chocolatey esté instalado
- ✅ Descarga e instala Flutter SDK (~2GB)
- ✅ Ejecuta `flutter doctor` para verificar

### ⏱️ Tiempo estimado: 5-10 minutos

La descarga de Flutter es grande, ten paciencia.

### ⚠️ Después de ejecutar

**CERRAR PowerShell completamente y REABRIR (NO es necesario Admin)**

---

## Paso 4: Verificar Flutter

Abre PowerShell NORMAL (sin Admin) y ejecuta:

```powershell
flutter --version
```

Deberías ver:

```
Flutter 3.x.x • channel stable • ...
Framework • revision ...
Engine • revision ...
Tools • Dart 3.x.x • DevTools ...
```

Si funciona, ¡Flutter está instalado! ✅

---

## Paso 5: Aceptar Licencias de Android

Si planeas desarrollar para Android:

```powershell
flutter doctor --android-licenses
```

Presiona `y` para aceptar todas las licencias.

---

## Paso 6: Crear el Proyecto Flutter

```powershell
cd c:\dev\verifactu-monorepo\scripts
.\create-flutter-app.ps1
```

### ¿Qué hace este script?

- ✅ Crea el proyecto Flutter en `apps/mobile`
- ✅ Configura Firebase con FlutterFire CLI
- ✅ Instala dependencias:
  - firebase_core
  - firebase_auth
  - firebase_remote_config
  - cloud_firestore

### ⚠️ Autenticación Firebase

El script abrirá tu navegador para autenticar con Firebase. Usa tu cuenta de Google asociada al proyecto.

---

## Paso 7: Ejecutar la App

### Opción A: Web (Chrome)

```powershell
cd c:\dev\verifactu-monorepo\apps\mobile
flutter run -d chrome
```

### Opción B: Android Emulator

```powershell
# Listar emuladores
flutter emulators

# Iniciar emulador
flutter emulators --launch <nombre_emulador>

# Ejecutar app
flutter run
```

### Opción C: Windows Desktop

```powershell
flutter run -d windows
```

---

## Troubleshooting

### ❌ "Set-ExecutionPolicy : No se encuentra"

**Solución**: No estás en PowerShell como Administrador.

1. Cierra PowerShell
2. Presiona `Windows + X`
3. Selecciona "Windows PowerShell (Admin)"

### ❌ "choco no se reconoce"

**Solución**: Cierra y reabre PowerShell después de instalar Chocolatey.

### ❌ "flutter no se reconoce"

**Solución 1**: Cierra y reabre PowerShell después de instalar Flutter.

**Solución 2**: Agrega manualmente al PATH:

```powershell
# Ver PATH actual
$env:Path

# Si no ves C:\tools\flutter\bin, agrégalo manualmente:
# 1. Busca "Variables de entorno" en Windows
# 2. Edita "Path" en Variables del sistema
# 3. Agrega: C:\tools\flutter\bin
# 4. Reinicia PowerShell
```

### ❌ Error de red durante instalación

**Solución**: Verifica tu conexión a internet y reintenta.

### ❌ "Android SDK not found"

**Solución**: Instala Android Studio:

```powershell
choco install androidstudio -y
```

Luego:
1. Abre Android Studio
2. Tools → SDK Manager
3. Instala Android SDK Platform-Tools

### ❌ FlutterFire no se encuentra

**Solución**:

```powershell
# Agregar Dart pub bin al PATH manualmente
$dartBin = "$env:LOCALAPPDATA\Pub\Cache\bin"
$env:Path += ";$dartBin"

# Reintentar activación
dart pub global activate flutterfire_cli
```

---

## Verificación Final

Una vez todo instalado, ejecuta:

```powershell
flutter doctor -v
```

Deberías ver:

```
[✓] Flutter (Channel stable, ...)
[✓] Windows Version (...)
[✓] Android toolchain (si instalaste Android Studio)
[✓] Chrome (para desarrollo web)
[✓] Visual Studio (para Windows desktop)
[✓] VS Code (si lo tienes instalado)
[✓] Connected device (Chrome, Windows, etc.)
[✓] Network resources
```

No todos los ítems necesitan estar en ✓ para empezar. Con Flutter y Chrome es suficiente para web.

---

## Resumen de Comandos

```powershell
# Paso 1: Instalar Chocolatey (PowerShell como Admin)
cd c:\dev\verifactu-monorepo\scripts
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install-chocolatey.ps1
# Cerrar y reabrir PowerShell como Admin

# Paso 2: Instalar Flutter (PowerShell como Admin)
cd c:\dev\verifactu-monorepo\scripts
.\install-flutter.ps1
# Cerrar y reabrir PowerShell (ya NO como Admin)

# Paso 3: Crear proyecto Flutter (PowerShell normal)
cd c:\dev\verifactu-monorepo\scripts
.\create-flutter-app.ps1

# Paso 4: Ejecutar app
cd c:\dev\verifactu-monorepo\apps\mobile
flutter run -d chrome
```

---

## Siguiente Paso

Una vez la app esté corriendo, puedes:

1. **Ver el código**: `apps/mobile/lib/main.dart`
2. **Hot reload**: Presiona `r` mientras la app corre para ver cambios al instante
3. **Agregar Firebase**: El script ya configuró `lib/firebase_options.dart`

¡Todo listo para desarrollar! 🚀
