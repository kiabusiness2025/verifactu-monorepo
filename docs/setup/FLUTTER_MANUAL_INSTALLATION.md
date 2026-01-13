# 📱 Instalación Manual de Flutter - Windows

## ¿Qué pasó con Chocolatey?

Chocolatey se instaló correctamente, pero Windows necesita **reiniciar o cerrar/reabrir PowerShell** para actualizar el PATH.

Para ahorrar tiempo, voy a guiarte por la **instalación manual rápida** que es más directa.

---

## Opción A: Instalación Manual (10 minutos)

### Paso 1: Descargar Flutter

1. Ve a: https://docs.flutter.dev/get-started/install/windows
2. Click en **"Windows (64-bit)"** (debe ser azul)
3. Descargará un ZIP: `flutter_windows_3.x.x-stable.zip` (~1.5GB)

### Paso 2: Extraer el ZIP

1. En tu carpeta Descargas, **clic derecho** en `flutter_windows_3.x.x-stable.zip`
2. **Extraer aquí** (o "Extract All")
3. Espera a que termine (puede tardar 1-2 minutos)

Después deberías tener una carpeta llamada `flutter`

### Paso 3: Mover a Ubicación Permanente

⚠️ **IMPORTANTE**: NO instales en `C:\Program Files\` (problemas de permisos)

Opción 1 - Ubicación recomendada:

```
C:\src\flutter
```

**Pasos**:
1. Abre **Explorador de Archivos** (Windows + E)
2. Navega a: `C:\` (unidad raíz)
3. Si no existe carpeta `src`, crea una:
   - Clic derecho → **Nueva carpeta** → `src`
4. Abre la carpeta `src`
5. **Corta** la carpeta `flutter` de Descargas (Ctrl+X)
6. **Pega** en `C:\src\` (Ctrl+V)

Ahora deberías tener: `C:\src\flutter\bin\flutter.exe`

### Paso 4: Agregar al PATH de Windows

#### Opción A: Automático (recomendado)

Abre **PowerShell como Administrador** y ejecuta:

```powershell
$flutterPath = "C:\src\flutter\bin"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$flutterPath*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$flutterPath", "User")
    Write-Host "[OK] Flutter agregado al PATH"
    Write-Host "Cierra y reabre PowerShell para que aplique"
} else {
    Write-Host "[INFO] Flutter ya está en el PATH"
}
```

#### Opción B: Manual

1. Presiona `Windows + X` → **Sistema**
2. Click en **"Configuración avanzada del sistema"** (abajo)
3. Click en **"Variables de entorno..."** (abajo)
4. En "Variables del sistema", selecciona `Path` → **Editar**
5. Click **"Nuevo"**
6. Escribe: `C:\src\flutter\bin`
7. Click **OK** en todas las ventanas
8. **Cierra todas las ventanas de PowerShell y reabré una nueva**

### Paso 5: Verificar

Abre **PowerShell NUEVA** (NO reutilices la anterior) y ejecuta:

```powershell
flutter --version
```

Deberías ver:

```
Flutter 3.x.x • channel stable
Framework • revision ...
Engine • revision ...
Tools • Dart 3.x.x
```

Si ves esto: ✅ **¡Flutter está instalado!**

---

## Opción B: Usar Chocolatey (si lo prefieres)

Si quieres esperar a que Chocolatey funcione:

1. **Cierra todas las ventanas de PowerShell**
2. Abre **PowerShell NUEVA como Administrador**
3. Ejecuta:

```powershell
choco install flutter -y
```

4. Espera a que termine
5. Cierra y reabre PowerShell (NO admin)
6. Verifica: `flutter --version`

---

## Siguiente: Crear Proyecto Flutter

Una vez Flutter funcione (`flutter --version` muestra versión):

```powershell
cd C:\dev\verifactu-monorepo\apps

# Crear proyecto
flutter create mobile \
    --org business.verifactu \
    --project-name verifactu_mobile \
    --platforms android,ios,web

cd mobile

# Instalar FlutterFire CLI
dart pub global activate flutterfire_cli

# Configurar Firebase (abrirá navegador para autenticar)
flutterfire configure --project=verifactu-business

# Instalar paquetes Firebase
flutter pub add firebase_core
flutter pub add firebase_auth
flutter pub add firebase_remote_config
flutter pub add cloud_firestore

# Ejecutar en Chrome
flutter run -d chrome
```

---

## Troubleshooting

### "flutter no se reconoce"

```powershell
# Verificar PATH
$env:Path

# Si no ves C:\src\flutter\bin, agrégalo manualmente (opción B arriba)
```

### "Error: No Android toolchain found"

No es problema para web. Para Android:

1. Descarga Android Studio: https://developer.android.com/studio
2. Instala
3. Abre Android Studio → Tools → SDK Manager
4. Instala: "Android SDK Platform-Tools"

### "dart pub global activate" no funciona

```powershell
# Agregar Dart pub al PATH
$dartPath = "$env:LOCALAPPDATA\Pub\Cache\bin"
$env:Path += ";$dartPath"

# Reintentar
dart pub global activate flutterfire_cli
```

---

## Status: Google Tag Manager ✅

GTM ya está **arreglado y funciona correctamente**:
- Componente `GoogleTagManager.tsx` en ambas apps
- Script con `next/script` (estrategia correcta)
- Verás las etiquetas en Google Analytics

---

**¿Necesitas ayuda con algún paso?** Avísame cuál es el más fácil para ti y lo resolvemos juntos.
