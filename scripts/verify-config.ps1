#!/usr/bin/env pwsh
# Verification script for monorepo Next.js configuration

Write-Host "Verificando configuracion del monorepo..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location
$issues = @()
$warnings = @()
$success = @()

# CHECK 1: pnpm version
Write-Host "[1] Verificando pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version
    $success += "[OK] pnpm @$pnpmVersion"
} catch {
    $issues += "[ERROR] pnpm no esta instalado"
}

# CHECK 2: Root package.json and pnpm-workspace.yaml
Write-Host "[2] Verificando workspaces..." -ForegroundColor Yellow
if (Test-Path "pnpm-workspace.yaml") {
    $success += "[OK] pnpm-workspace.yaml existe"
} else {
    $issues += "[ERROR] No existe pnpm-workspace.yaml"
}

# CHECK 3: apps/landing
Write-Host "[3] Verificando apps/landing..." -ForegroundColor Yellow
$landingPath = "apps/landing"

if (Test-Path "$landingPath/package.json") {
    $success += "[OK] package.json existe"
} else {
    $issues += "[ERROR] Falta apps/landing/package.json"
}

if (Test-Path "$landingPath/next.config.js") {
    $landingNextConfig = Get-Content "$landingPath/next.config.js"
    if ($landingNextConfig -match "transpilePackages") {
        $success += "[OK] transpilePackages configurado"
    } else {
        $warnings += "[WARN] transpilePackages NO esta configurado en next.config.js"
    }
} else {
    $issues += "[ERROR] Falta apps/landing/next.config.js"
}

if (Test-Path "$landingPath/vercel.json") {
    $landingVercel = Get-Content "$landingPath/vercel.json" | ConvertFrom-Json
    if ($landingVercel.framework -eq "nextjs") {
        $success += "[OK] Framework: nextjs"
    } else {
        $warnings += "[WARN] Framework no esta establecido a 'nextjs'"
    }
    if ($landingVercel.buildCommand -like "*pnpm*") {
        $success += "[OK] buildCommand usa pnpm"
    } else {
        $issues += "[ERROR] buildCommand no usa pnpm"
    }
} else {
    $issues += "[ERROR] Falta apps/landing/vercel.json"
}

# CHECK 4: apps/app
Write-Host "[4] Verificando apps/app..." -ForegroundColor Yellow
$appPath = "apps/app"

if (Test-Path "$appPath/package.json") {
    $success += "[OK] package.json existe"
} else {
    $issues += "[ERROR] Falta apps/app/package.json"
}

if (Test-Path "$appPath/next.config.mjs") {
    $appNextConfig = Get-Content "$appPath/next.config.mjs"
    if ($appNextConfig -match "transpilePackages") {
        $success += "[OK] transpilePackages configurado"
    } else {
        $warnings += "[WARN] transpilePackages NO esta configurado"
    }
} else {
    $issues += "[ERROR] Falta apps/app/next.config.mjs"
}

if (Test-Path "$appPath/vercel.json") {
    $appVercel = Get-Content "$appPath/vercel.json" | ConvertFrom-Json
    if ($appVercel.framework -eq "nextjs") {
        $success += "[OK] Framework: nextjs"
    } else {
        $warnings += "[WARN] Framework no esta establecido a 'nextjs'"
    }
    if ($appVercel.buildCommand -like "*pnpm*") {
        $success += "[OK] buildCommand usa pnpm"
    } else {
        $issues += "[ERROR] buildCommand no usa pnpm"
    }
} else {
    $issues += "[ERROR] Falta apps/app/vercel.json"
}

# CHECK 5: packages/ui
Write-Host "[5] Verificando packages/ui..." -ForegroundColor Yellow
$uiPath = "packages/ui"

if (Test-Path "$uiPath/src/index.ts") {
    $uiIndex = Get-Content "$uiPath/src/index.ts"
    if ($uiIndex -match "export.*Button") {
        $success += "[OK] Button exportado"
    } else {
        $issues += "[ERROR] Button no esta exportado"
    }
} else {
    $issues += "[ERROR] Falta packages/ui/src/index.ts"
}

# CHECK 6: Environment variables
Write-Host "[6] Verificando .env.local..." -ForegroundColor Yellow

if (Test-Path "$landingPath/.env.local") {
    $landingEnv = Get-Content "$landingPath/.env.local"
    if ($landingEnv -match "FIREBASE") {
        $success += "[OK] .env.local tiene Firebase config"
    } else {
        $warnings += "[WARN] .env.local en landing no tiene Firebase config"
    }
} else {
    $warnings += "[WARN] No existe apps/landing/.env.local"
}

# CHECK 7: Git
Write-Host "[7] Verificando Git..." -ForegroundColor Yellow

try {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        $warnings += "[WARN] Hay cambios sin commitear"
    } else {
        $success += "[OK] Repositorio limpio"
    }
} catch {
    $issues += "[ERROR] No es un repositorio Git"
}

# SUMMARY
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "RESULTADO DE VERIFICACION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

if ($success.Count -gt 0) {
    Write-Host ""
    Write-Host "EXITOS ($($success.Count)):" -ForegroundColor Green
    $success | ForEach-Object { Write-Host "   $_" -ForegroundColor Green }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "ADVERTENCIAS ($($warnings.Count)):" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
}

if ($issues.Count -gt 0) {
    Write-Host ""
    Write-Host "PROBLEMAS ($($issues.Count)):" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "[OK] Configuracion verificada correctamente" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ERROR] Se encontraron problemas que deben ser corregidos" -ForegroundColor Red
    exit 1
}
