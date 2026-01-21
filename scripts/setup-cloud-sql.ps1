# ====================================================================
# Script: Configuración Cloud SQL + Prisma Accelerate
# Proyecto: Verifactu Business
# ====================================================================

Write-Host "`n🚀 SETUP CLOUD SQL + PRISMA ACCELERATE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$PROJECT_ID = "verifactu-business-480212"
$INSTANCE_NAME = "verifactu-db"
$REGION = "europe-west1"
$DATABASE_NAME = "verifactu_production"

# ====================================================================
# Opción 1: Crear vía Google Cloud Console (RECOMENDADO)
# ====================================================================

Write-Host "📋 OPCIÓN 1: Crear vía Google Cloud Console (MÁS FÁCIL)" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────`n" -ForegroundColor Gray

Write-Host "1️⃣  Abre Google Cloud Console:" -ForegroundColor Green
Write-Host "   https://console.cloud.google.com/sql/instances?project=$PROJECT_ID`n" -ForegroundColor Cyan

Write-Host "2️⃣  Click en 'CREATE INSTANCE' → 'PostgreSQL'`n" -ForegroundColor Green

Write-Host "3️⃣  Configuración:" -ForegroundColor Green
Write-Host "   • Instance ID: $INSTANCE_NAME" -ForegroundColor White
Write-Host "   • Password: [Genera una segura]" -ForegroundColor White
Write-Host "   • Database version: PostgreSQL 15" -ForegroundColor White
Write-Host "   • Region: $REGION (Belgium)" -ForegroundColor White
Write-Host "   • Zonal availability: Single zone" -ForegroundColor White
Write-Host "   • Machine type: Shared core → 1 vCPU, 1.7 GB" -ForegroundColor White
Write-Host "   • Storage: SSD, 10 GB, Enable automatic storage increase" -ForegroundColor White
Write-Host "   • Connections: Public IP" -ForegroundColor White
Write-Host "   • Data protection: Automated backups → 03:00" -ForegroundColor White
Write-Host "   • Maintenance: Any time`n" -ForegroundColor White

Write-Host "4️⃣  Click 'CREATE INSTANCE' (tardará 5-10 minutos)`n" -ForegroundColor Green

Write-Host "5️⃣  Una vez creada, copia la IP pública`n" -ForegroundColor Green

# ====================================================================
# Opción 2: Crear vía gcloud CLI
# ====================================================================

Write-Host "`n📋 OPCIÓN 2: Crear vía gcloud CLI" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────`n" -ForegroundColor Gray

$gcloudCommand = @"
gcloud sql instances create $INSTANCE_NAME ``
  --database-version=POSTGRES_15 ``
  --tier=db-g1-small ``
  --region=$REGION ``
  --storage-type=SSD ``
  --storage-size=10GB ``
  --storage-auto-increase ``
  --backup-start-time=03:00 ``
  --require-ssl ``
  --project=$PROJECT_ID
"@

Write-Host "Comando:" -ForegroundColor Green
Write-Host $gcloudCommand -ForegroundColor Cyan
Write-Host ""

# ====================================================================
# Pasos Post-Creación
# ====================================================================

Write-Host "`n📋 DESPUÉS DE CREAR LA INSTANCIA" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Gray

Write-Host "1️⃣  CREAR BASE DE DATOS:" -ForegroundColor Green
Write-Host "   https://console.cloud.google.com/sql/instances/$INSTANCE_NAME/databases?project=$PROJECT_ID`n" -ForegroundColor Cyan
Write-Host "   • Click 'CREATE DATABASE'" -ForegroundColor White
Write-Host "   • Database name: $DATABASE_NAME" -ForegroundColor White
Write-Host "   • Character set: UTF8" -ForegroundColor White
Write-Host "   • Collation: Default`n" -ForegroundColor White

Write-Host "2️⃣  CREAR USUARIO:" -ForegroundColor Green
Write-Host "   https://console.cloud.google.com/sql/instances/$INSTANCE_NAME/users?project=$PROJECT_ID`n" -ForegroundColor Cyan
Write-Host "   • Click 'ADD USER ACCOUNT'" -ForegroundColor White
Write-Host "   • Username: verifactu_user" -ForegroundColor White
Write-Host "   • Password: [Genera una segura]" -ForegroundColor White
Write-Host "   • Host: % (cualquier host)`n" -ForegroundColor White

Write-Host "3️⃣  OBTENER CONNECTION STRING:" -ForegroundColor Green
Write-Host "   • Ve a Overview tab" -ForegroundColor White
Write-Host "   • Copia 'Public IP address'`n" -ForegroundColor White

$connectionStringTemplate = @"
postgres://verifactu_user:[PASSWORD]@[PUBLIC_IP]:5432/$DATABASE_NAME?sslmode=require
"@

Write-Host "   Formato:" -ForegroundColor White
Write-Host "   $connectionStringTemplate`n" -ForegroundColor Cyan

Write-Host "4️⃣  CONFIGURAR PRISMA ACCELERATE:" -ForegroundColor Green
Write-Host "   https://console.prisma.io/`n" -ForegroundColor Cyan
Write-Host "   • Ve a tu proyecto Accelerate" -ForegroundColor White
Write-Host "   • Settings → Connection String" -ForegroundColor White
Write-Host "   • Pega el connection string de Cloud SQL" -ForegroundColor White
Write-Host "   • Guarda y copia el nuevo PRISMA_DATABASE_URL`n" -ForegroundColor White

Write-Host "5️⃣  ACTUALIZAR VARIABLES DE ENTORNO:" -ForegroundColor Green
Write-Host "`n   📁 packages/db/.env:" -ForegroundColor Cyan
Write-Host @"
   DATABASE_URL="postgres://verifactu_user:[PASSWORD]@[PUBLIC_IP]:5432/$DATABASE_NAME?sslmode=require"
   PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
"@ -ForegroundColor White

Write-Host "`n   📁 apps/admin/.env.local:" -ForegroundColor Cyan
Write-Host @"
   DATABASE_URL="postgres://verifactu_user:[PASSWORD]@[PUBLIC_IP]:5432/$DATABASE_NAME?sslmode=require"
   PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
"@ -ForegroundColor White

Write-Host "`n   📁 apps/app/.env (si existe):" -ForegroundColor Cyan
Write-Host @"
   DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
"@ -ForegroundColor White

Write-Host "`n6️⃣  MIGRAR DATOS (SI TIENES DATOS EXISTENTES):" -ForegroundColor Green
Write-Host @"
   
   # Exportar desde Prisma actual
   pg_dump -h db.prisma.io -U ac6301a89a... postgres > backup.sql
   
   # Importar a Cloud SQL
   psql "postgres://verifactu_user:[PASSWORD]@[PUBLIC_IP]:5432/$DATABASE_NAME?sslmode=require" < backup.sql
"@ -ForegroundColor White

Write-Host "`n7️⃣  EJECUTAR MIGRACIONES:" -ForegroundColor Green
Write-Host @"
   
   cd packages/db
   pnpm db:migrate
"@ -ForegroundColor Cyan

Write-Host "`n8️⃣  VERIFICAR CONEXIÓN:" -ForegroundColor Green
Write-Host @"
   
   cd packages/db
   pnpm prisma studio
   
   # Debería abrir en http://localhost:5555 conectado a Cloud SQL
"@ -ForegroundColor Cyan

Write-Host "`n9️⃣  CONFIGURAR VERCEL:" -ForegroundColor Green
Write-Host "   • Ve a cada proyecto en Vercel Dashboard" -ForegroundColor White
Write-Host "   • Settings → Environment Variables" -ForegroundColor White
Write-Host "   • Actualiza DATABASE_URL y PRISMA_DATABASE_URL" -ForegroundColor White
Write-Host "   • Redeploy`n" -ForegroundColor White

# ====================================================================
# Costos Estimados
# ====================================================================

Write-Host "`n💰 COSTOS ESTIMADOS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Gray

Write-Host "Cloud SQL (db-g1-small):" -ForegroundColor Green
Write-Host "  • Instance: ~`$25/mes" -ForegroundColor White
Write-Host "  • Storage (10 GB SSD): ~`$2/mes" -ForegroundColor White
Write-Host "  • Backups (7 días): ~`$1/mes" -ForegroundColor White
Write-Host "  • Networking: ~`$2/mes" -ForegroundColor White
Write-Host "  TOTAL: ~`$30/mes (~`$360/año)`n" -ForegroundColor Cyan

Write-Host "Prisma Accelerate (Starter):" -ForegroundColor Green
Write-Host "  • Plan: `$29/mes" -ForegroundColor White
Write-Host "  TOTAL: ~`$29/mes (~`$348/año)`n" -ForegroundColor Cyan

Write-Host "TOTAL COMBINADO: ~`$59/mes (~`$708/año)" -ForegroundColor Yellow
Write-Host ""

# ====================================================================
# Enlaces Útiles
# ====================================================================

Write-Host "`n🔗 ENLACES ÚTILES" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Gray

Write-Host "Cloud SQL Instances:" -ForegroundColor Green
Write-Host "https://console.cloud.google.com/sql/instances?project=$PROJECT_ID`n" -ForegroundColor Cyan

Write-Host "Prisma Data Platform:" -ForegroundColor Green
Write-Host "https://console.prisma.io/`n" -ForegroundColor Cyan

Write-Host "Vercel Dashboard:" -ForegroundColor Green
Write-Host "https://vercel.com/`n" -ForegroundColor Cyan

Write-Host "Documentación Cloud SQL:" -ForegroundColor Green
Write-Host "https://cloud.google.com/sql/docs/postgres`n" -ForegroundColor Cyan

Write-Host "Documentación Prisma Accelerate:" -ForegroundColor Green
Write-Host "https://www.prisma.io/docs/accelerate`n" -ForegroundColor Cyan

# ====================================================================
# Verificación de Permisos
# ====================================================================

Write-Host "`n🔐 VERIFICAR PERMISOS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Gray

Write-Host "Asegúrate de tener estos roles en GCP:" -ForegroundColor Green
Write-Host "  • Cloud SQL Admin (roles/cloudsql.admin)" -ForegroundColor White
Write-Host "  • Compute Network Admin (si usas VPC)" -ForegroundColor White
Write-Host "  • Owner o Editor del proyecto`n" -ForegroundColor White

Write-Host "Verificar cuenta activa:" -ForegroundColor Green
Write-Host "  gcloud config get-value account`n" -ForegroundColor Cyan

Write-Host "Verificar proyecto activo:" -ForegroundColor Green
Write-Host "  gcloud config get-value project`n" -ForegroundColor Cyan

# ====================================================================
# Fin
# ====================================================================

Write-Host "`n✅ LISTO PARA COMENZAR" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Gray

Write-Host "Recomendación: Usa OPCIÓN 1 (Google Cloud Console)" -ForegroundColor Yellow
Write-Host "Es más visual y evita problemas de autenticación CLI`n" -ForegroundColor Gray

$choice = Read-Host "¿Quieres abrir Google Cloud Console ahora? (s/n)"
if ($choice -eq 's' -or $choice -eq 'S' -or $choice -eq 'si' -or $choice -eq 'Si') {
    Start-Process "https://console.cloud.google.com/sql/instances?project=$PROJECT_ID"
    Write-Host "`n✅ Navegador abierto. Sigue los pasos arriba 👆" -ForegroundColor Green
}

Write-Host "`n📝 Este script está guardado en:" -ForegroundColor Cyan
Write-Host "   scripts/setup-cloud-sql.ps1`n" -ForegroundColor White
