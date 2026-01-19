#!/bin/bash
# Script para aplicar migraciones de BD de forma segura
# Uso: ./scripts/migrate-db.sh [options]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DATABASE MIGRATION - Verifactu${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"

# Verificar que DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL no está configurada${NC}"
    echo -e "${YELLOW}Asegúrate de que .env.local tiene DATABASE_URL${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 Conectando a la base de datos...${NC}"

# Función para ejecutar migración
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")
    
    if [ ! -f "$migration_file" ]; then
        echo -e "${RED}❌ Archivo no encontrado: $migration_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}📤 Aplicando: $migration_name${NC}"
    
    # Ejecutar migración
    psql "$DATABASE_URL" -f "$migration_file" 2>&1 | while IFS= read -r line; do
        if [[ $line == *"ERROR"* ]]; then
            echo -e "${RED}❌ $line${NC}"
        elif [[ $line == *"CREATE TABLE"* ]] || [[ $line == *"CREATE INDEX"* ]] || [[ $line == *"ALTER TABLE"* ]]; then
            echo -e "${GREEN}✅ $line${NC}"
        elif [[ -n "$line" ]]; then
            echo -e "${BLUE}ℹ️  $line${NC}"
        fi
    done
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migración aplicada: $migration_name${NC}\n"
        return 0
    else
        echo -e "${RED}❌ Error en migración: $migration_name${NC}\n"
        return 1
    fi
}

# Aplicar migraciones en orden
echo -e "${BLUE}📦 Aplicando migraciones...${NC}\n"

# Nueva migración para respuestas de email
apply_migration "db/migrations/003_add_email_responses_table.sql"

# Verificar que las tablas se crearon correctamente
echo -e "${BLUE}🔍 Verificando tablas...${NC}\n"

# Verificar tabla admin_email_responses
echo "Verificando: admin_email_responses"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_responses FROM admin_email_responses;" 2>/dev/null && \
    echo -e "${GREEN}✅ Tabla admin_email_responses existe${NC}\n" || \
    echo -e "${RED}❌ Error con admin_email_responses${NC}\n"

# Verificar tabla admin_emails
echo "Verificando: admin_emails"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_emails FROM admin_emails;" 2>/dev/null && \
    echo -e "${GREEN}✅ Tabla admin_emails existe${NC}\n" || \
    echo -e "${RED}❌ Error con admin_emails${NC}\n"

# Verificar columnas
echo -e "${BLUE}📋 Columnas en admin_email_responses:${NC}"
psql "$DATABASE_URL" -c "\d admin_email_responses" 2>/dev/null || echo "No se pudo listar columnas"

echo -e "\n${GREEN}✅ Migraciones completadas${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Próximos pasos:${NC}"
echo "1. Reinicia el servidor: pnpm dev"
echo "2. Ve a: https://app.verifactu.business/dashboard/admin/emails"
echo "3. Selecciona un email y prueba responder"
echo ""
echo -e "${BLUE}Para más información, ver: docs/DATABASE_MIGRATION_GUIDE.md${NC}"
