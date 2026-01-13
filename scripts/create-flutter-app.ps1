# Create Flutter App for Verifactu
# Run this script AFTER installing Flutter

Write-Host "=== Creando App Flutter de Verifactu ===" -ForegroundColor Cyan
Write-Host ""

# Check if Flutter is installed
if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Flutter no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Primero instala Flutter:" -ForegroundColor Yellow
    Write-Host "1. Ejecuta: .\install-chocolatey.ps1 (como Admin)" -ForegroundColor Cyan
    Write-Host "2. Cierra y reabre PowerShell como Admin" -ForegroundColor Cyan
    Write-Host "3. Ejecuta: .\install-flutter.ps1 (como Admin)" -ForegroundColor Cyan
    Write-Host "4. Cierra y reabre PowerShell" -ForegroundColor Cyan
    Write-Host "5. Ejecuta este script nuevamente" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Flutter encontrado:" -ForegroundColor Green
flutter --version
Write-Host ""

# Navigate to apps directory
$appsDir = Join-Path $PSScriptRoot "..\apps"
Set-Location $appsDir

Write-Host "Creando proyecto Flutter en: $appsDir\mobile" -ForegroundColor Cyan
Write-Host ""

# Create Flutter project
flutter create mobile `
    --org business.verifactu `
    --project-name verifactu_mobile `
    --platforms android,ios,web `
    --description "Verifactu Business Mobile App"

Write-Host ""
Write-Host "✅ Proyecto Flutter creado" -ForegroundColor Green
Write-Host ""

# Navigate to project
Set-Location mobile

Write-Host "Activando FlutterFire CLI..." -ForegroundColor Cyan
dart pub global activate flutterfire_cli

Write-Host ""
Write-Host "Configurando Firebase..." -ForegroundColor Cyan
Write-Host "⚠️ Esto abrirá tu navegador para autenticación" -ForegroundColor Yellow
Write-Host ""

# Configure Firebase
flutterfire configure --project=verifactu-business

Write-Host ""
Write-Host "Instalando dependencias de Firebase..." -ForegroundColor Cyan
flutter pub add firebase_core
flutter pub add firebase_auth
flutter pub add firebase_remote_config
flutter pub add cloud_firestore

Write-Host ""
Write-Host "✅ ¡App Flutter lista!" -ForegroundColor Green
Write-Host ""
Write-Host "Para ejecutar la app:" -ForegroundColor Cyan
Write-Host "  cd apps\mobile" -ForegroundColor White
Write-Host "  flutter run -d chrome" -ForegroundColor White
Write-Host ""
Write-Host "Para Android:" -ForegroundColor Cyan
Write-Host "  flutter emulators" -ForegroundColor White
Write-Host "  flutter run -d <device_id>" -ForegroundColor White
