# Install Flutter SDK using Chocolatey
# Run this script as Administrator AFTER installing Chocolatey

Write-Host "=== Instalando Flutter SDK ===" -ForegroundColor Cyan
Write-Host ""

# Check if Chocolatey is installed
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Chocolatey no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Primero ejecuta: .\install-chocolatey.ps1" -ForegroundColor Yellow
    Write-Host "Luego cierra y reabre PowerShell como Administrador" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Chocolatey encontrado" -ForegroundColor Green
Write-Host ""

# Install Flutter
Write-Host "Instalando Flutter (esto puede tomar varios minutos)..." -ForegroundColor Cyan
choco install flutter -y

Write-Host ""
Write-Host "Verificando instalación..." -ForegroundColor Cyan

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check Flutter
if (Get-Command flutter -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Host "✅ Flutter instalado correctamente!" -ForegroundColor Green
    flutter --version
    Write-Host ""
    Write-Host "Ejecutando Flutter Doctor..." -ForegroundColor Cyan
    flutter doctor
}
else {
    Write-Host ""
    Write-Host "⚠️ Flutter instalado pero no disponible en esta sesión" -ForegroundColor Yellow
    Write-Host "Cierra y reabre PowerShell, luego ejecuta: flutter --version" -ForegroundColor Cyan
}
