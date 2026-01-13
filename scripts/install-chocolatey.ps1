# Install Chocolatey Package Manager
# Run this script as Administrator

Write-Host "=== Instalando Chocolatey ===" -ForegroundColor Cyan

# Set security protocol
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072

# Download and execute installation script
try {
    $installScript = (New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')
    Invoke-Expression $installScript
    
    Write-Host ""
    Write-Host "✅ Chocolatey instalado correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️ IMPORTANTE: Cierra y reabre PowerShell como Administrador antes de continuar" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Después ejecuta: choco --version" -ForegroundColor Cyan
}
catch {
    Write-Host ""
    Write-Host "❌ Error al instalar Chocolatey:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativa: Descarga Flutter manualmente desde:" -ForegroundColor Yellow
    Write-Host "https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Cyan
}
