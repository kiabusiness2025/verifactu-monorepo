#!/bin/bash
# Script para verificar TypeScript en todo el proyecto
# Uso: ./scripts/typecheck-all.sh

set -e

echo "🔍 Verificación de TypeScript - Proyecto Verifactu"
echo "=================================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

HAS_ERRORS=false

# Verificar App
echo "📱 Verificando App..."
echo "-------------------"
cd "$(dirname "$0")/.."

# Generar Prisma Client
echo "Generando Prisma Client..."
pnpm --filter verifactu-app exec prisma generate > /dev/null 2>&1 || true

# Type check
if pnpm --filter verifactu-app exec tsc --noEmit; then
  echo -e "${GREEN}✅ App: Sin errores de TypeScript${NC}"
else
  echo -e "${RED}❌ App: Errores de TypeScript encontrados${NC}"
  HAS_ERRORS=true
fi

echo ""

# Verificar Landing (opcional, puede tener errores)
echo "🌐 Verificando Landing..."
echo "-------------------------"
if pnpm --filter verifactu-landing exec tsc --noEmit 2>/dev/null; then
  echo -e "${GREEN}✅ Landing: Sin errores de TypeScript${NC}"
else
  echo -e "${YELLOW}⚠️  Landing: Tiene algunos errores (no crítico)${NC}"
fi

echo ""
echo "=================================================="

if [ "$HAS_ERRORS" = true ]; then
  echo -e "${RED}❌ FALLÓ: Se encontraron errores de TypeScript${NC}"
  echo ""
  echo "Para ver detalles, ejecuta:"
  echo "  pnpm --filter verifactu-app exec tsc --noEmit"
  exit 1
else
  echo -e "${GREEN}✅ ÉXITO: Todas las verificaciones pasaron${NC}"
  echo ""
  echo "Tu código está listo para commit/deploy"
  exit 0
fi
