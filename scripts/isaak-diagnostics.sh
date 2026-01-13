#!/usr/bin/env bash
# Isaak Diagnostics: Real-time error detection and reporting
# Este script ejecuta local para detectar errores antes de Vercel

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ISAAK DIAGNOSTICS: Build Error Detection System              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

WORKSPACE_ROOT=$(pwd)
BUILD_LOG="/tmp/isaak-build.log"
ERROR_LOG="/tmp/isaak-errors.log"

# Limpiar logs anteriores
> "$BUILD_LOG"
> "$ERROR_LOG"

echo -e "${BLUE}Workspace: ${PURPLE}${WORKSPACE_ROOT}${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# FASE 1: Scan de Errores Estáticos
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 1: Static Code Analysis${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check 1: Broken imports
echo -e "${YELLOW}[1]${NC} Scanning for broken imports..."
BROKEN_IMPORTS=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs grep -l "from ['\"]\.\.\/\.\.\/\.\.\/lib\/" 2>/dev/null || echo "")

if [ -n "$BROKEN_IMPORTS" ]; then
    echo -e "${RED}  ✗ Found incorrect import paths:${NC}"
    echo "$BROKEN_IMPORTS" | while read -r file; do
        echo -e "${YELLOW}    → ${file}${NC}"
        grep -n "from ['\"]\.\.\/\.\.\/\.\.\/lib\/" "$file" | head -3
    done >> "$ERROR_LOG"
else
    echo -e "${GREEN}  ✓ No broken imports found${NC}"
fi

# Check 2: Missing type declarations
echo -e "${YELLOW}[2]${NC} Checking for @ts-nocheck usage..."
NOCHECK_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs grep -l "@ts-nocheck" 2>/dev/null || echo "")

if [ -n "$NOCHECK_FILES" ]; then
    echo -e "${YELLOW}  ⚠ Found @ts-nocheck directives:${NC}"
    echo "$NOCHECK_FILES" | wc -l | xargs echo "    Number of files:"
    echo "$NOCHECK_FILES" | head -3 | while read -r file; do
        echo -e "${YELLOW}    → ${file}${NC}"
    done
else
    echo -e "${GREEN}  ✓ No @ts-nocheck found${NC}"
fi

# Check 3: Prisma client placement
echo -e "${YELLOW}[3]${NC} Checking Prisma configuration..."
if grep -q '"@prisma/client".*"dependencies"' apps/app/package.json; then
    echo -e "${GREEN}  ✓ @prisma/client in dependencies (correct)${NC}"
else
    echo -e "${RED}  ✗ @prisma/client not in dependencies${NC}"
    echo "    → Move @prisma/client from devDependencies to dependencies" >> "$ERROR_LOG"
fi

# Check 4: Environment variables
echo -e "${YELLOW}[4]${NC} Checking required environment variables..."
REQUIRED_VARS=("CLAVE_API_AI_VERCEL" "DATABASE_URL" "NEXT_PUBLIC_FIREBASE_PROJECT_ID")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -f ".env.local" ] && grep -q "$var=" .env.local; then
        echo -e "${GREEN}  ✓ ${var} configured${NC}"
    else
        echo -e "${YELLOW}  ⚠ ${var} not found${NC}"
    fi
done

echo ""

# ═══════════════════════════════════════════════════════════════════════
# FASE 2: Compilación Local
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 2: Local Build Test${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

build_app() {
    local app_name=$1
    local app_path=$2
    
    echo -e "${YELLOW}Building ${PURPLE}${app_name}${YELLOW}...${NC}"
    
    cd "$app_path"
    
    if pnpm build > "$BUILD_LOG" 2>&1; then
        echo -e "${GREEN}  ✓ ${app_name} build successful${NC}"
        return 0
    else
        echo -e "${RED}  ✗ ${app_name} build failed${NC}"
        
        # Extract error messages
        grep -i "error\|failed" "$BUILD_LOG" | head -5 >> "$ERROR_LOG"
        
        # Show first error
        echo -e "${RED}    Error details:${NC}"
        grep -A 3 "error:" "$BUILD_LOG" | head -10 | sed 's/^/      /'
        
        return 1
    fi
}

APP_ERRORS=0

cd "$WORKSPACE_ROOT"
if ! build_app "app" "apps/app"; then
    APP_ERRORS=$((APP_ERRORS + 1))
fi

if ! build_app "landing" "apps/landing"; then
    APP_ERRORS=$((APP_ERRORS + 1))
fi

cd "$WORKSPACE_ROOT"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# FASE 3: Git Readiness
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 3: Git & Deployment Readiness${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check git status
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}  ✓ Git working directory clean${NC}"
else
    echo -e "${YELLOW}  ⚠ Uncommitted changes:${NC}"
    git status --short | sed 's/^/    /'
fi

# Check branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}  Branch: ${PURPLE}${CURRENT_BRANCH}${NC}"

# Last commit
LAST_COMMIT=$(git log -1 --pretty=%B)
echo -e "${BLUE}  Last commit: ${PURPLE}${LAST_COMMIT}${NC}"

echo ""

# ═══════════════════════════════════════════════════════════════════════
# FASE 4: Reporte Final
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}REPORTE FINAL${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $APP_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ ALL BUILDS SUCCESSFUL ✓✓✓${NC}"
    echo ""
    echo -e "${GREEN}Ready for deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. git push origin main"
    echo "2. Vercel will auto-deploy"
    echo "3. Check: https://vercel.com/dashboard"
else
    echo -e "${RED}✗✗✗ BUILD ERRORS DETECTED ✗✗✗${NC}"
    echo ""
    echo "Errors found:"
    cat "$ERROR_LOG"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo "Logs saved to:"
echo "  Build: $BUILD_LOG"
echo "  Errors: $ERROR_LOG"
echo ""
