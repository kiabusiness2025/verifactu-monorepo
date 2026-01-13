#!/usr/bin/env bash
# ISAAK: Intelligent System for Automatic Analysis and Key-fixing
# Orquestador principal que detecta y soluciona errores automáticamente

set -e

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                        ║"
echo "║  🧠 ISAAK: Intelligent Error Detection & Auto-Resolution System       ║"
echo "║  Orquestador Principal de Verifactu                                    ║"
echo "║                                                                        ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

WORKSPACE=$(pwd)
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
REPORT_DIR=".isaak/reports"
REPORT_FILE="$REPORT_DIR/$TIMESTAMP-report.md"

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# ISAAK Diagnostic Report

EOF

log() {
    echo -e "$1"
    echo "${1//$'\033'[0;31m/}" >> "$REPORT_FILE" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Environment Check
# ═══════════════════════════════════════════════════════════════════════════

log "${CYAN}STEP 1: Environment Analysis${NC}"
log "═════════════════════════════════════════════════════════════════════════"
echo ""

# Check Node version
NODE_VERSION=$(node -v)
log "✓ Node: ${PURPLE}${NODE_VERSION}${NC}"

# Check pnpm version
PNPM_VERSION=$(pnpm -v)
log "✓ pnpm: ${PURPLE}${PNPM_VERSION}${NC}"

# Check Git status
if git diff-index --quiet HEAD --; then
    log "${GREEN}✓ Git: Clean${NC}"
else
    log "${YELLOW}⚠ Git: Uncommitted changes${NC}"
fi

# Check .env files
log ""
log "Environment files:"
[ -f ".env" ] && log "  ${GREEN}✓${NC} .env exists" || log "  ${YELLOW}✗${NC} .env missing"
[ -f ".env.local" ] && log "  ${GREEN}✓${NC} .env.local exists (root)" || log "  ${YELLOW}✗${NC} .env.local missing (root)"
[ -f "apps/app/.env.local" ] && log "  ${GREEN}✓${NC} .env.local exists (app)" || log "  ${YELLOW}✗${NC} .env.local missing (app)"

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Dependency Analysis
# ═══════════════════════════════════════════════════════════════════════════

log "${CYAN}STEP 2: Dependency Analysis${NC}"
log "═════════════════════════════════════════════════════════════════════════"
echo ""

# Check Prisma configuration
log "Prisma:"
if grep -q '"@prisma/client".*"dependencies"' apps/app/package.json; then
    log "  ${GREEN}✓${NC} @prisma/client in dependencies"
else
    log "  ${RED}✗${NC} @prisma/client NOT in dependencies"
fi

# Check Firebase packages
if grep -q "firebase" apps/app/package.json; then
    log "  ${GREEN}✓${NC} Firebase configured"
else
    log "  ${YELLOW}⚠${NC} Firebase not found"
fi

# Check AI SDK
if grep -q "@ai-sdk/openai" apps/app/package.json; then
    log "  ${GREEN}✓${NC} AI SDK installed"
else
    log "  ${YELLOW}⚠${NC} AI SDK not found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Build Test (Critical)
# ═══════════════════════════════════════════════════════════════════════════

log "${CYAN}STEP 3: Critical Build Test${NC}"
log "═════════════════════════════════════════════════════════════════════════"
echo ""

BUILD_ERRORS=0
BUILD_LOG="/tmp/isaak-build-$TIMESTAMP.log"

# Test app build
log "Testing: ${PURPLE}app${NC}"
cd apps/app

if pnpm build > "$BUILD_LOG" 2>&1; then
    log "  ${GREEN}✓ Build successful${NC}"
else
    log "  ${RED}✗ Build FAILED${NC}"
    BUILD_ERRORS=$((BUILD_ERRORS + 1))
    
    # Extract error
    ERROR_MSG=$(grep -i "error\|failed" "$BUILD_LOG" | head -3)
    log "    ${RED}Error:${NC} ${ERROR_MSG}"
fi

cd "$WORKSPACE"

# Test landing build
log "Testing: ${PURPLE}landing${NC}"
cd apps/landing

if pnpm build > "$BUILD_LOG" 2>&1; then
    log "  ${GREEN}✓ Build successful${NC}"
else
    log "  ${RED}✗ Build FAILED${NC}"
    BUILD_ERRORS=$((BUILD_ERRORS + 1))
    
    # Extract error
    ERROR_MSG=$(grep -i "error\|failed" "$BUILD_LOG" | head -3)
    log "    ${RED}Error:${NC} ${ERROR_MSG}"
fi

cd "$WORKSPACE"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Auto-Fix Procedures
# ═══════════════════════════════════════════════════════════════════════════

if [ $BUILD_ERRORS -gt 0 ]; then
    log "${CYAN}STEP 4: Auto-Fix Procedures${NC}"
    log "═════════════════════════════════════════════════════════════════════════"
    echo ""
    
    log "${YELLOW}Attempting automatic fixes...${NC}"
    echo ""
    
    # Fix 1: Reinstall dependencies
    log "Fix 1: Reinstalling dependencies..."
    if pnpm install --force > /dev/null 2>&1; then
        log "  ${GREEN}✓ Dependencies reinstalled${NC}"
    else
        log "  ${YELLOW}⚠ Install had issues${NC}"
    fi
    
    # Fix 2: Clear Next.js cache
    log "Fix 2: Clearing build caches..."
    rm -rf apps/app/.next apps/landing/.next 2>/dev/null || true
    log "  ${GREEN}✓ Caches cleared${NC}"
    
    # Fix 3: Re-test builds
    log ""
    log "Re-testing after fixes..."
    
    cd apps/app
    if pnpm build > "$BUILD_LOG" 2>&1; then
        log "  ${GREEN}✓ app build now OK${NC}"
        BUILD_ERRORS=$((BUILD_ERRORS - 1))
    fi
    cd "$WORKSPACE"
    
    cd apps/landing
    if pnpm build > "$BUILD_LOG" 2>&1; then
        log "  ${GREEN}✓ landing build now OK${NC}"
        BUILD_ERRORS=$((BUILD_ERRORS - 1))
    fi
    cd "$WORKSPACE"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════════

log "${CYAN}FINAL REPORT${NC}"
log "═════════════════════════════════════════════════════════════════════════"
echo ""

if [ $BUILD_ERRORS -eq 0 ]; then
    log "${GREEN}✓✓✓ ALL SYSTEMS OPERATIONAL ✓✓✓${NC}"
    log ""
    log "Ready for deployment:"
    log "  ${PURPLE}1.${NC} git add . && git commit -m 'fix: resolve build errors'"
    log "  ${PURPLE}2.${NC} git push origin main"
    log "  ${PURPLE}3.${NC} Vercel auto-deploys (2-3 mins)"
else
    log "${RED}✗✗✗ BUILD ERRORS REMAIN ✗✗✗${NC}"
    log ""
    log "Remaining errors: ${RED}${BUILD_ERRORS}${NC}"
    log ""
    log "Manual review required:"
    log "  Build log: $BUILD_LOG"
    log "  Full report: $REPORT_FILE"
fi

log ""
log "Report saved: ${PURPLE}${REPORT_FILE}${NC}"
log ""
