# 🔐 Cómo Obtener SHA-1 para Android Firebase

## Problema
Tu sistema no tiene Java JDK instalado. Necesitamos el SHA-1 del debug keystore para registrar la app Android en Firebase.

---

## ✅ Opción 1: Instalar Java JDK (RECOMENDADO)

### Paso 1: Descargar Java JDK
1. Ve a: https://www.oracle.com/java/technologies/downloads/
2. Descarga **"JDK 17" (LTS)** o superior
3. Selecciona Windows → x64 → `.exe`
4. Abre el instalador y sigue los pasos por defecto

### Paso 2: Verificar Instalación
```powershell
java -version
```

Si ves la versión de Java, está instalado correctamente.

### Paso 3: Obtener SHA-1
```powershell
# Abre PowerShell y ejecuta:
cd c:\dev\verifactu-monorepo\scripts
.\get-android-sha1.bat
```

Se mostrará el SHA-1 en el formato:
```
SHA1: A1:B2:C3:D4:E5:F6:...
```

---

## ✅ Opción 2: Usar Android Studio (SIN Java JDK)

Si prefieres no instalar Java JDK, puedes usar Android Studio:

### Paso 1: Abrir Android Studio
1. Abre Android Studio
2. Abre la carpeta del proyecto: `c:\dev\verifactu-monorepo\apps\mobile`

### Paso 2: Ejecutar signingReport
1. Ve a: **View** → **Tool Windows** → **Gradle**
2. En el panel Gradle de la derecha, expande:
   - `android` → `Tasks` → `android` → `signingReport`
3. Doble-clic en `signingReport`
4. Mira el output en la ventana inferior

Busca:
```
Variant: debug
Config: debug
Store: ...
SHA1: A1:B2:C3:... ← ESTO ES LO QUE NECESITAS
```

---

## ✅ Opción 3: Usar FlutterFire CLI (Automático)

Si tienes Flutter instalado:

```powershell
# Instalar FlutterFire CLI
dart pub global activate flutterfire_cli

# Configurar apps Firebase
cd c:\dev\verifactu-monorepo\apps\mobile
flutterfire configure --project=verifactu-business
```

FlutterFire te pedirá el SHA-1, pero también puede auto-detectarlo si tienes Android SDK correctamente configurado.

---

## 🎯 Próximos Pasos

1. **Elige una opción arriba** (1, 2 o 3)
2. **Obtén el SHA-1** en formato: `A1:B2:C3:D4:...`
3. **Agrega a Firebase Console:**
   - Ve a: https://console.firebase.google.com/project/verifactu-business/settings/general
   - Busca app Android: `business.verifactu.verifactu_mobile`
   - **"Huellas digitales de certificado SHA"**
   - Haz clic en **"Agregar huella digital"**
   - Pega el SHA-1
   - **Guarda**

---

## 📞 Si Algo Falla

**Error: "keytool not found"**
- Necesitas instalar Java JDK (Opción 1)

**Error: "debug.keystore not found"**
- El keystore debe estar en: `C:\Users\TU_USUARIO\.android\debug.keystore`
- Si no existe, ejecuta cualquier app Android en Android Studio o Flutter para generarlo

**¿Cuál opción vas a usar?**
