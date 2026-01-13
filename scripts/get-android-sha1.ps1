#!/usr/bin/env powershell
# Script para obtener SHA-1 del Android Debug Keystore
# Requiere: OpenSSL instalado

param(
    [string]$KeystorePath = "$env:USERPROFILE\.android\debug.keystore",
    [string]$StorePass = "android",
    [string]$KeyPass = "android",
    [string]$Alias = "androiddebugkey"
)

# Función para obtener el SHA-1
function Get-AndroidDebugSHA1 {
    # Método 1: Intentar con certutil (Windows nativo)
    Write-Host "Intentando obtener SHA-1 del keystore..." -ForegroundColor Cyan
    
    # Buscar Java en paths comunes
    $javaPaths = @(
        "C:\Program Files\Java",
        "C:\Program Files (x86)\Java",
        "$env:JAVA_HOME\bin",
        "$env:ProgramFiles\Android\Android Studio\jre\bin"
    )
    
    $keytoolPath = $null
    foreach ($path in $javaPaths) {
        if (Test-Path $path) {
            $foundKeytool = Get-ChildItem -Path $path -Filter "keytool.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($foundKeytool) {
                $keytoolPath = $foundKeytool.FullName
                break
            }
        }
    }
    
    if (-not $keytoolPath) {
        Write-Host "❌ keytool no encontrado. Instala Java JDK desde: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Red
        return $false
    }
    
    Write-Host "✅ Encontrado keytool en: $keytoolPath" -ForegroundColor Green
    
    # Ejecutar keytool
    try {
        Write-Host "`nEjecutando keytool..." -ForegroundColor Cyan
        $output = & $keytoolPath -list -v -keystore $KeystorePath -alias $Alias -storepass $StorePass -keypass $KeyPass 2>&1
        
        # Buscar SHA-1
        $sha1Line = $output | Select-String "SHA1|SHA-1" | Select-Object -First 1
        if ($sha1Line) {
            $sha1Value = $sha1Line.ToString().Split(":")[-1].Trim()
            Write-Host "`n✅ SHA-1 Fingerprint encontrado:" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
            Write-Host $sha1Value -ForegroundColor Yellow
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
            Write-Host "`n📋 Cópialo y pégalo en Firebase Console" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ No se encontró SHA-1 en el output" -ForegroundColor Red
            Write-Host "Output completo:" -ForegroundColor Yellow
            Write-Host $output
            return $false
        }
    } catch {
        Write-Host "❌ Error al ejecutar keytool: $_" -ForegroundColor Red
        return $false
    }
}

# Ejecutar
Get-AndroidDebugSHA1
