#!/usr/bin/env pwsh
# Script para configurar GitHub Secrets

Write-Host "Configurando GitHub Secrets para Auto-Deploy" -ForegroundColor Cyan
Write-Host ""

# Valores conocidos
$VERCEL_ORG_ID = "team_VKgEl6B4kMmqwaplJcykx3KP"
$VERCEL_PROJECT_ID = "prj_be6HjlXddniCrDaPDNAf2A7g5cjj"

Write-Host "✓ VERCEL_ORG_ID: $VERCEL_ORG_ID" -ForegroundColor Green
Write-Host "✓ VERCEL_PROJECT_ID: $VERCEL_PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Solicitar VERCEL_TOKEN
Write-Host "Por favor, pega tu VERCEL_TOKEN (desde https://vercel.com/account/tokens):" -ForegroundColor Yellow
$VERCEL_TOKEN = Read-Host -AsSecureString

# Leer GCP key
if (Test-Path "gcp-key.json") {
    $GCP_SA_KEY = Get-Content "gcp-key.json" -Raw
    Write-Host "✓ GCP_SA_KEY cargado desde gcp-key.json" -ForegroundColor Green
} else {
    Write-Host "❌ Error: gcp-key.json no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configurando secrets en GitHub..." -ForegroundColor Cyan

# Configurar secrets
try {
    # VERCEL_TOKEN
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($VERCEL_TOKEN)
    $PlainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    gh secret set VERCEL_TOKEN --body $PlainToken
    Write-Host "✓ VERCEL_TOKEN configurado" -ForegroundColor Green
    
    # VERCEL_ORG_ID
    gh secret set VERCEL_ORG_ID --body $VERCEL_ORG_ID
    Write-Host "✓ VERCEL_ORG_ID configurado" -ForegroundColor Green
    
    # VERCEL_PROJECT_ID
    gh secret set VERCEL_PROJECT_ID --body $VERCEL_PROJECT_ID
    Write-Host "✓ VERCEL_PROJECT_ID configurado" -ForegroundColor Green
    
    # GCP_SA_KEY
    gh secret set GCP_SA_KEY --body $GCP_SA_KEY
    Write-Host "✓ GCP_SA_KEY configurado" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Todos los secrets configurados correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora puedes hacer push y el workflow se ejecutara automaticamente" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error configurando secrets: $_" -ForegroundColor Red
    exit 1
}

# Limpiar
Remove-Item "gcp-key.json" -Force
Write-Host "Archivo gcp-key.json eliminado por seguridad" -ForegroundColor Yellow
