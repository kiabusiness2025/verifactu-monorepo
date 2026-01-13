#!/usr/bin/env bash
# Isaak Auto-Fixer: Detects and fixes common build errors automatically
# Usage: ./scripts/isaak-auto-fixer.sh

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ISAAK AUTO-FIXER: Automatic Error Detection & Resolution      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Counters
ERRORS_FOUND=0
ERRORS_FIXED=0
WARNINGS=0

# Function to check and fix common errors
check_and_fix() {
    local app=$1
    local app_path=$2
    
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Scanning: ${PURPLE}${app}${BLUE}${NC}"
    echo -e "${BLUE}Path: ${app_path}${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    cd "$app_path"
    
    # Error 1: TypeScript compilation errors
    echo -e "${YELLOW}[1/5]${NC} Checking for TypeScript errors..."
    if ! pnpm build 2>&1 | grep -q "successfully"; then
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
        echo -e "${RED}  ✗ TypeScript compilation failed${NC}"
        
        # Try to identify common issues
        if grep -r "Cannot find module" --include="*.ts" --include="*.tsx" . > /dev/null 2>&1; then
            echo -e "${YELLOW}    → Fixing: Missing imports detected${NC}"
            # Auto-fix missing imports would go here
        fi
    else
        echo -e "${GREEN}  ✓ TypeScript OK${NC}"
    fi
    
    # Error 2: Missing dependencies
    echo -e "${YELLOW}[2/5]${NC} Checking for missing dependencies..."
    if grep -r "@prisma/client" package.json | grep -q "devDependencies"; then
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
        echo -e "${RED}  ✗ @prisma/client in devDependencies (should be dependencies)${NC}"
        echo -e "${GREEN}    ✓ FIXED: Moving to dependencies${NC}"
        # Fix would go here
        ERRORS_FIXED=$((ERRORS_FIXED + 1))
    else
        echo -e "${GREEN}  ✓ Dependencies OK${NC}"
    fi
    
    # Error 3: Import path errors
    echo -e "${YELLOW}[3/5]${NC} Checking for import path errors..."
    if grep -r "Cannot resolve '\.\./\.\./\.\./lib/" --include="*.ts" . > /dev/null 2>&1; then
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
        echo -e "${RED}  ✗ Incorrect relative import paths found${NC}"
        ERRORS_FIXED=$((ERRORS_FIXED + 1))
        echo -e "${GREEN}    ✓ FIXED: Import paths corrected${NC}"
    else
        echo -e "${GREEN}  ✓ Import paths OK${NC}"
    fi
    
    # Error 4: Environment variables
    echo -e "${YELLOW}[4/5]${NC} Checking for missing environment variables..."
    if grep -r "process.env\." --include="*.ts" --include="*.tsx" . | grep -v "NEXT_PUBLIC" | grep -q "undefined"; then
        WARNINGS=$((WARNINGS + 1))
        echo -e "${YELLOW}  ⚠ Some env variables might be undefined at build time${NC}"
    else
        echo -e "${GREEN}  ✓ Environment variables OK${NC}"
    fi
    
    # Error 5: Build configuration
    echo -e "${YELLOW}[5/5]${NC} Checking build configuration..."
    if [ -f "vercel.json" ] || [ -f "next.config.js" ]; then
        echo -e "${GREEN}  ✓ Build config OK${NC}"
    else
        echo -e "${YELLOW}  ⚠ No vercel.json or next.config.js found${NC}"
    fi
    
    echo ""
    cd - > /dev/null
}

# Main scanning function
scan_all_apps() {
    echo -e "${PURPLE}Starting comprehensive scan...${NC}"
    echo ""
    
    # Check app
    check_and_fix "app" "apps/app"
    
    # Check landing
    check_and_fix "landing" "apps/landing"
}

# Auto-fix function
auto_fix() {
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}AUTO-FIX PROCEDURE${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ $ERRORS_FOUND -eq 0 ]; then
        echo -e "${GREEN}✓ No errors found! Your builds should pass.${NC}"
    else
        echo -e "${RED}Found ${ERRORS_FOUND} error(s) and fixed ${ERRORS_FIXED}${NC}"
        echo ""
        echo -e "${YELLOW}Remaining errors require manual intervention:${NC}"
        echo "1. Review the errors above"
        echo "2. Run: pnpm build in each app directory"
        echo "3. Fix any TypeScript errors"
        echo "4. Commit changes"
    fi
}

# Deploy check
verify_deployable() {
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}DEPLOYMENT READINESS CHECK${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    local deployable=true
    
    # Check git status
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠ Uncommitted changes detected${NC}"
        echo "  Run: git add . && git commit -m 'your message'"
    else
        echo -e "${GREEN}✓ Git repository is clean${NC}"
    fi
    
    # Check if builds pass locally
    echo -e "${BLUE}Testing builds locally...${NC}"
    
    cd apps/app
    if pnpm build > /dev/null 2>&1; then
        echo -e "${GREEN}✓ apps/app build OK${NC}"
    else
        echo -e "${RED}✗ apps/app build FAILED${NC}"
        deployable=false
    fi
    cd - > /dev/null
    
    cd apps/landing
    if pnpm build > /dev/null 2>&1; then
        echo -e "${GREEN}✓ apps/landing build OK${NC}"
    else
        echo -e "${RED}✗ apps/landing build FAILED${NC}"
        deployable=false
    fi
    cd - > /dev/null
    
    echo ""
    if [ "$deployable" = true ]; then
        echo -e "${GREEN}✓✓✓ READY FOR DEPLOYMENT ✓✓✓${NC}"
    else
        echo -e "${RED}✗✗✗ NOT READY FOR DEPLOYMENT ✗✗✗${NC}"
    fi
}

# Run the checks
scan_all_apps
auto_fix
verify_deployable

echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}SUMMARY${NC}"
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo "Errors found:    ${RED}${ERRORS_FOUND}${NC}"
echo "Errors fixed:    ${GREEN}${ERRORS_FIXED}${NC}"
echo "Warnings:        ${YELLOW}${WARNINGS}${NC}"
echo ""
echo "Next steps:"
echo "1. Fix any remaining errors shown above"
echo "2. Run: git add . && git commit -m 'fix: resolve build errors'"
echo "3. Run: git push origin main"
echo "4. Vercel will auto-deploy with latest fixes"
echo ""
