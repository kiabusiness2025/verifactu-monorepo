@echo off
REM Script para obtener SHA-1 del Android Debug Keystore
REM Requiere: Java JDK instalado

setlocal enabledelayedexpansion

REM Definir rutas
set KEYSTORE_PATH=%USERPROFILE%\.android\debug.keystore
set STORE_PASS=android
set KEY_PASS=android
set ALIAS=androiddebugkey

REM Buscar keytool
set KEYTOOL_FOUND=0
for /d %%a in ("C:\Program Files\Java\jdk*") do (
    if exist "%%a\bin\keytool.exe" (
        set KEYTOOL_PATH=%%a\bin\keytool.exe
        set KEYTOOL_FOUND=1
    )
)

if !KEYTOOL_FOUND! equ 0 (
    echo.
    echo [ERROR] keytool no encontrado. 
    echo Necesitas instalar Java JDK desde:
    echo https://www.oracle.com/java/technologies/downloads/
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Encontrado keytool en: !KEYTOOL_PATH!
echo.
echo Obteniendo SHA-1 del keystore...
echo.

"!KEYTOOL_PATH!" -list -v -keystore "!KEYSTORE_PATH!" -alias !ALIAS! -storepass !STORE_PASS! -keypass !KEY_PASS! | findstr /i "SHA1 SHA-1"

echo.
echo [INFO] Copia el valor SHA-1 anterior y pégalo en Firebase Console
echo        https://console.firebase.google.com/project/verifactu-business/settings/general
echo.
pause
