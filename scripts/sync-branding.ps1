# =============================================================================
# sync-branding.ps1
# Sincroniza logos e iconos desde brand/ hacia apps/landing y apps/app
# Idempotente: seguro ejecutar en cualquier momento sin romper despliegues
# =============================================================================

$ErrorActionPreference = "Stop"

# Rutas base
$repo = "C:\dev\verifactu-monorepo"
$brandLogo = Join-Path $repo "brand\logo"
$brandFavicon = Join-Path $repo "brand\favicon"
$brandApp = Join-Path $repo "brand\app"

$landingPublic = Join-Path $repo "apps\landing\public"
$appPublic = Join-Path $repo "apps\app\public"

Write-Host "[*] Sincronizando branding..." -ForegroundColor Cyan

# Validar que existen las fuentes
foreach ($p in @($brandLogo, $brandFavicon, $brandApp, $landingPublic, $appPublic)) {
    if (!(Test-Path $p)) { 
        throw "❌ No existe: $p" 
    }
}

# =============================================================================
# 1) LOGOS (horizontal light/dark)
# =============================================================================
Write-Host "`n[*] Sincronizando logos..." -ForegroundColor Yellow

# Crear directorios brand/ si no existen
$landingBrand = Join-Path $landingPublic "brand"
$appBrand = Join-Path $appPublic "brand"
New-Item -ItemType Directory -Force -Path $landingBrand, $appBrand | Out-Null

# Copiar logos
$logoLight = Join-Path $brandLogo "logo-horizontal-light.png"
$logoDark = Join-Path $brandLogo "logo-horizontal-dark.png"

if (Test-Path $logoLight) {
    Copy-Item $logoLight (Join-Path $landingBrand "logo-horizontal-light.png") -Force
    Copy-Item $logoLight (Join-Path $appBrand "logo-horizontal-light.png") -Force
    Write-Host "[OK] Logo light copiado" -ForegroundColor Green
}

if (Test-Path $logoDark) {
    Copy-Item $logoDark (Join-Path $landingBrand "logo-horizontal-dark.png") -Force
    Copy-Item $logoDark (Join-Path $appBrand "logo-horizontal-dark.png") -Force
    Write-Host "[OK] Logo dark copiado" -ForegroundColor Green
}

# =============================================================================
# 2) FAVICONS Y APP ICONS
# =============================================================================
Write-Host "`n[*] Sincronizando iconos..." -ForegroundColor Yellow

function Sync-Icon {
    param($Source, $DestLanding, $DestApp, $Name)
    
    if (!(Test-Path $Source)) {
        Write-Host "[!] Falta: $Name (saltado)" -ForegroundColor DarkYellow
        return
    }
    
    Copy-Item $Source $DestLanding -Force
    Copy-Item $Source $DestApp -Force
    Write-Host "[OK] $Name sincronizado" -ForegroundColor Green
}

# Favicons (16, 32, 48)
Sync-Icon `
    (Join-Path $brandFavicon "favicon-16.png") `
    (Join-Path $landingPublic "favicon-16x16.png") `
    (Join-Path $appPublic "favicon-16x16.png") `
    "favicon-16x16"

Sync-Icon `
    (Join-Path $brandFavicon "favicon-32.png") `
    (Join-Path $landingPublic "favicon-32x32.png") `
    (Join-Path $appPublic "favicon-32x32.png") `
    "favicon-32x32"

Sync-Icon `
    (Join-Path $brandFavicon "favicon-48.png") `
    (Join-Path $landingPublic "favicon-48x48.png") `
    (Join-Path $appPublic "favicon-48x48.png") `
    "favicon-48x48"

# Apple Touch Icon
Sync-Icon `
    (Join-Path $brandFavicon "apple-touch-icon.png") `
    (Join-Path $landingPublic "apple-touch-icon.png") `
    (Join-Path $appPublic "apple-touch-icon.png") `
    "apple-touch-icon"

# Android Chrome (192 y 512)
Sync-Icon `
    (Join-Path $brandApp "app-icon-192.png") `
    (Join-Path $landingPublic "android-chrome-192x192.png") `
    (Join-Path $appPublic "android-chrome-192x192.png") `
    "android-chrome-192x192"

Sync-Icon `
    (Join-Path $brandApp "app-icon-512.png") `
    (Join-Path $landingPublic "android-chrome-512x512.png") `
    (Join-Path $appPublic "android-chrome-512x512.png") `
    "android-chrome-512x512"

# =============================================================================
# 3) RESUMEN
# =============================================================================
Write-Host "`n[*] Resumen de archivos sincronizados:" -ForegroundColor Cyan

Write-Host "`n[LANDING] apps/landing/public:" -ForegroundColor White
Get-ChildItem $landingPublic -File |
    Where-Object { $_.Name -match "favicon|apple-touch|android-chrome" } |
    Select-Object Name, @{N='Tamaño (KB)';E={[math]::Round($_.Length/1KB,1)}} |
    Format-Table -AutoSize

Write-Host "[LANDING] apps/landing/public/brand:" -ForegroundColor White
Get-ChildItem $landingBrand -File |
    Select-Object Name, @{N='Tamaño (KB)';E={[math]::Round($_.Length/1KB,1)}} |
    Format-Table -AutoSize

Write-Host "[APP] apps/app/public:" -ForegroundColor White
Get-ChildItem $appPublic -File |
    Where-Object { $_.Name -match "favicon|apple-touch|android-chrome" } |
    Select-Object Name, @{N='Tamaño (KB)';E={[math]::Round($_.Length/1KB,1)}} |
    Format-Table -AutoSize

Write-Host "[APP] apps/app/public/brand:" -ForegroundColor White
Get-ChildItem $appBrand -File |
    Select-Object Name, @{N='Tamaño (KB)';E={[math]::Round($_.Length/1KB,1)}} |
    Format-Table -AutoSize

Write-Host "`n[OK] Branding sincronizado correctamente" -ForegroundColor Green
Write-Host "[INFO] Los cambios se aplicaran en el proximo deploy o rebuild local" -ForegroundColor Cyan
