# ==========================================================
# Script de migración de base de datos Postgres
# VeriFactu Business
# ==========================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = $env:DATABASE_URL,
    
    [Parameter(Mandatory=$false)]
    [string]$SchemaFile = "$PSScriptRoot\..\db\schema.sql"
)

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " VeriFactu - Migración de Base de Datos" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo schema
if (-not (Test-Path $SchemaFile)) {
    Write-Host "ERROR: No se encuentra el archivo schema.sql en: $SchemaFile" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Schema encontrado: $SchemaFile" -ForegroundColor Green
Write-Host ""

# Verificar DATABASE_URL
if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    Write-Host "ERROR: DATABASE_URL no está configurado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configura DATABASE_URL con el siguiente formato:" -ForegroundColor Yellow
    Write-Host 'postgres://usuario:password@host:5432/verifactu_app' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "  1. Variable de entorno: " -ForegroundColor White -NoNewline
    Write-Host '$env:DATABASE_URL="postgres://..."' -ForegroundColor Gray
    Write-Host "  2. Parámetro: " -ForegroundColor White -NoNewline
    Write-Host '.\migrate-db.ps1 -DatabaseUrl "postgres://..."' -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✓ DATABASE_URL configurado" -ForegroundColor Green
Write-Host ""

# Parsear DATABASE_URL para extraer componentes
if ($DatabaseUrl -match 'postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $Matches[1]
    $dbPassword = $Matches[2]
    $dbHost = $Matches[3]
    $dbPort = $Matches[4]
    $dbName = $Matches[5]
    
    Write-Host "Conexión:" -ForegroundColor Cyan
    Write-Host "  Host: $dbHost" -ForegroundColor White
    Write-Host "  Port: $dbPort" -ForegroundColor White
    Write-Host "  Database: $dbName" -ForegroundColor White
    Write-Host "  User: $dbUser" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERROR: Formato de DATABASE_URL inválido" -ForegroundColor Red
    Write-Host "Formato esperado: postgres://usuario:password@host:5432/database" -ForegroundColor Yellow
    exit 1
}

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ADVERTENCIA: psql no está instalado en el sistema" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "  1. Instalar PostgreSQL Client (https://www.postgresql.org/download/)" -ForegroundColor White
    Write-Host "  2. Usar cliente de base de datos alternativo (DBeaver, pgAdmin, etc.)" -ForegroundColor White
    Write-Host "  3. Ejecutar el script manualmente copiando el contenido de:" -ForegroundColor White
    Write-Host "     $SchemaFile" -ForegroundColor Gray
    Write-Host ""
    
    $response = Read-Host "¿Quieres abrir el archivo schema.sql para ejecutarlo manualmente? (s/n)"
    if ($response -eq 's') {
        Start-Process $SchemaFile
    }
    exit 1
}

Write-Host "✓ psql encontrado: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# Confirmar antes de ejecutar
Write-Host "===========================================================" -ForegroundColor Yellow
Write-Host " ⚠️  ATENCIÓN: Esta operación ejecutará el schema completo" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Esto creará/actualizará las siguientes tablas:" -ForegroundColor White
Write-Host "  - tenants" -ForegroundColor Gray
Write-Host "  - users" -ForegroundColor Gray
Write-Host "  - memberships" -ForegroundColor Gray
Write-Host "  - user_preferences" -ForegroundColor Gray
Write-Host "  - plans" -ForegroundColor Gray
Write-Host "  - subscriptions" -ForegroundColor Gray
Write-Host "  - invoices" -ForegroundColor Gray
Write-Host "  - invoice_items" -ForegroundColor Gray
Write-Host "  - expense_categories" -ForegroundColor Gray
Write-Host "  - expenses" -ForegroundColor Gray
Write-Host "  - usage_counters" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "¿Continuar con la migración? (s/n)"
if ($confirm -ne 's') {
    Write-Host "Migración cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Ejecutando migración..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar migración usando psql
$env:PGPASSWORD = $dbPassword
$psqlArgs = @(
    "-h", $dbHost,
    "-p", $dbPort,
    "-U", $dbUser,
    "-d", $dbName,
    "-f", $SchemaFile
)

try {
    & psql $psqlArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "===========================================================" -ForegroundColor Green
        Write-Host " ✓ Migración completada exitosamente" -ForegroundColor Green
        Write-Host "===========================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Próximos pasos:" -ForegroundColor Cyan
        Write-Host "  1. Configurar DATABASE_URL en Vercel:" -ForegroundColor White
        Write-Host "     https://vercel.com/ksenias-projects-16d8d1fb/app/settings/environment-variables" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Redesplegar la aplicación:" -ForegroundColor White
        Write-Host "     cd apps\app" -ForegroundColor Gray
        Write-Host "     vercel --prod" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: La migración falló con código $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Revisa los errores anteriores." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Excepción durante la migración" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Limpiar password del entorno
    $env:PGPASSWORD = $null
}
