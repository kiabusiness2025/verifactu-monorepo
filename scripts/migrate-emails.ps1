#!/usr/bin/env pwsh
# Script para aplicar migraciones de base de datos
# Uso: .\migrate-db.ps1 [migration-file.sql]

param(
    [string]$MigrationFile = "003_create_emails_table.sql",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🗄️  Verifactu Database Migration" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Verificar que existe .env.local
$envFile = "apps\app\.env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: No se encuentra $envFile" -ForegroundColor Red
    Write-Host "   Crea el archivo con DATABASE_URL configurado" -ForegroundColor Yellow
    exit 1
}

# Cargar variables de entorno
Write-Host ""
Write-Host "📋 Cargando configuración..." -ForegroundColor Yellow
$env:DATABASE_URL = (Get-Content $envFile | Select-String "^DATABASE_URL=").Line -replace "DATABASE_URL=", ""

if (-not $env:DATABASE_URL) {
    Write-Host "❌ Error: DATABASE_URL no encontrado en $envFile" -ForegroundColor Red
    exit 1
}

# Parsear DATABASE_URL para obtener credenciales
# Formato: postgresql://user:password@host:port/database
if ($env:DATABASE_URL -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
    $dbUser = $matches[1]
    $dbPassword = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
    
    # Ocultar password en log
    $safeUrl = $env:DATABASE_URL -replace ":$dbPassword@", ":****@"
    Write-Host "   Database: $safeUrl" -ForegroundColor Gray
} else {
    Write-Host "❌ Error: Formato de DATABASE_URL inválido" -ForegroundColor Red
    Write-Host "   Formato esperado: postgresql://user:password@host:port/database" -ForegroundColor Yellow
    exit 1
}

# Verificar que existe el archivo de migración
$migrationPath = "db\migrations\$MigrationFile"
if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Error: No se encuentra el archivo de migración: $migrationPath" -ForegroundColor Red
    exit 1
}

Write-Host "   Migración: $MigrationFile" -ForegroundColor Gray

# Verificar que psql está instalado
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host ""
    Write-Host "❌ Error: psql no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Instalar PostgreSQL:" -ForegroundColor Yellow
    Write-Host "   - Windows: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "   - Con Chocolatey: choco install postgresql" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "   PostgreSQL: ✓" -ForegroundColor Green

# Modo dry-run
if ($DryRun) {
    Write-Host ""
    Write-Host "🧪 Modo DRY RUN - Solo mostrando contenido" -ForegroundColor Yellow
    Write-Host ""
    Get-Content $migrationPath
    Write-Host ""
    Write-Host "✅ Dry run completado. Ejecuta sin -DryRun para aplicar." -ForegroundColor Green
    exit 0
}

# Confirmación
Write-Host ""
Write-Host "⚠️  ¿Aplicar migración a la base de datos?" -ForegroundColor Yellow
Write-Host "   Base de datos: $dbName" -ForegroundColor Gray
Write-Host "   Host: $dbHost" -ForegroundColor Gray
Write-Host ""
$confirmation = Read-Host "Escribe 'yes' para continuar"

if ($confirmation -ne "yes") {
    Write-Host "❌ Migración cancelada" -ForegroundColor Red
    exit 0
}

# Aplicar migración
Write-Host ""
Write-Host "🚀 Aplicando migración..." -ForegroundColor Cyan

try {
    # Configurar variable de entorno para password
    $env:PGPASSWORD = $dbPassword
    
    # Ejecutar psql
    $output = & psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -f $migrationPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor Green
        Write-Host ""
        
        # Mostrar tablas creadas
        Write-Host "📊 Verificando tablas..." -ForegroundColor Cyan
        $tablesQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'admin_%' ORDER BY tablename;"
        $tables = & psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c $tablesQuery -t 2>&1
        
        if ($tables) {
            Write-Host "   Tablas admin:" -ForegroundColor Gray
            $tables | ForEach-Object {
                $table = $_.Trim()
                if ($table) {
                    Write-Host "   - $table" -ForegroundColor Green
                }
            }
        }
        
        Write-Host ""
        Write-Host "🎉 Todo listo!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error al aplicar migración:" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error inesperado:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Limpiar password de env
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Configurar webhook en Resend" -ForegroundColor Gray
Write-Host "   2. Añadir RESEND_WEBHOOK_SECRET a .env.local" -ForegroundColor Gray
Write-Host "   3. Desplegar a producción: vercel --prod" -ForegroundColor Gray
Write-Host "   4. Enviar email de prueba a soporte@verifactu.business" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentación completa: docs\EMAIL_SYSTEM_REAL.md" -ForegroundColor Cyan
Write-Host ""
