@echo off
REM Flutter Installation Script for Windows
REM This script installs Flutter and creates the Verifactu mobile app

setlocal enabledelayedexpansion

echo.
echo ===================================
echo  Instalando Flutter SDK
echo ===================================
echo.

REM Check if Flutter is already installed
where /q flutter
if %ERRORLEVEL% EQU 0 (
    echo [OK] Flutter ya esta instalado
    call flutter --version
    goto flutter_ready
)

echo [INFO] Instalando Flutter con Chocolatey...
echo.

REM Install Flutter
call choco install flutter -y

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo instalar Flutter con Chocolatey
    echo.
    echo Alternativa: Instala manualmente desde:
    echo https://docs.flutter.dev/get-started/install/windows
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Flutter instalado correctamente
echo.

REM Refresh environment variables
for /f "tokens=2*" %%A in ('reg query HKCU\Environment /v PATH ^| find /i "PATH"') do set "USERPATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH ^| find /i "PATH"') do set "SYSTEMPATH=%%B"
set "PATH=!SYSTEMPATH!;!USERPATH!"

:flutter_ready
echo.
echo ===================================
echo  Verificando Flutter
echo ===================================
echo.

call flutter --version
echo.

REM Run flutter doctor
echo [INFO] Ejecutando flutter doctor...
echo.
call flutter doctor

echo.
echo ===================================
echo  Creando Proyecto Flutter
echo ===================================
echo.

cd /d "%~dp0..\apps"

if exist "mobile" (
    echo [WARNING] Carpeta mobile ya existe
    echo [INFO] Actualizando dependencias...
    cd mobile
    call flutter pub get
    goto flutter_packages
)

echo [INFO] Creando proyecto Flutter...
call flutter create mobile ^
    --org business.verifactu ^
    --project-name verifactu_mobile ^
    --platforms android,ios,web ^
    --description "Verifactu Business Mobile App"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo crear el proyecto Flutter
    echo.
    pause
    exit /b 1
)

cd mobile

:flutter_packages
echo.
echo ===================================
echo  Instalando dependencias Firebase
echo ===================================
echo.

echo [INFO] Activando FlutterFire CLI...
call dart pub global activate flutterfire_cli

echo.
echo [INFO] Configurando Firebase...
echo [WARNING] Se abrira tu navegador para autenticar
echo.
call flutterfire configure --project=verifactu-business

echo.
echo [INFO] Instalando paquetes...
call flutter pub add firebase_core
call flutter pub add firebase_auth
call flutter pub add firebase_remote_config
call flutter pub add cloud_firestore

echo.
echo ===================================
echo  [OK] Flutter App Lista
echo ===================================
echo.

echo Ubicacion: %cd%
echo.
echo Para ejecutar:
echo   flutter run -d chrome
echo.
echo Cambios con hot reload:
echo   Presiona 'r' mientras la app corre
echo.

pause
