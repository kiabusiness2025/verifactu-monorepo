#!/bin/bash
# Pre-commit hook para verificar TypeScript antes de commit
# Instalar: cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "🔍 Verificando TypeScript antes del commit..."

# Obtener archivos modificados que son .ts o .tsx
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No hay archivos TypeScript para verificar"
  exit 0
fi

echo "Archivos a verificar:"
echo "$STAGED_FILES"

# Verificar si hay errores comunes
HAS_ERRORS=false

# Error 1: Tipos undefined sin validación
if echo "$STAGED_FILES" | xargs grep -l "verifyTenantAccess.*tenantId)" 2>/dev/null; then
  if echo "$STAGED_FILES" | xargs grep -L "if (!tenantId" 2>/dev/null | grep -l "verifyTenantAccess"; then
    echo "❌ Error: Posible tipo undefined pasado sin validación"
    HAS_ERRORS=true
  fi
fi

# Error 2: Propiedades opcionales sin verificar
if echo "$STAGED_FILES" | xargs grep -l "payload\.uid" 2>/dev/null; then
  if echo "$STAGED_FILES" | xargs grep -L "!payload\.uid\|payload\.uid)" 2>/dev/null | grep -l "payload\.uid"; then
    echo "❌ Error: Propiedad opcional payload.uid usada sin validación"
    HAS_ERRORS=true
  fi
fi

# Error 3: activeTenantId del contexto incorrecto
if echo "$STAGED_FILES" | xargs grep -l "activeTenantId.*useIsaakUI" 2>/dev/null; then
  echo "❌ Error: activeTenantId no existe en IsaakUI context"
  HAS_ERRORS=true
fi

if [ "$HAS_ERRORS" = true ]; then
  echo ""
  echo "❌ Se encontraron errores de TypeScript potenciales"
  echo "   Por favor corrígelos antes de hacer commit"
  echo ""
  echo "💡 Tip: Ejecuta 'pnpm --filter verifactu-app exec tsc --noEmit' para ver todos los errores"
  exit 1
fi

# Ejecutar type check completo solo en archivos del app
if echo "$STAGED_FILES" | grep -q "apps/app"; then
  echo "Ejecutando type check en app..."
  cd "$(git rev-parse --show-toplevel)"
  
  # Generar Prisma Client si es necesario
  if [ ! -d "node_modules/@prisma/client" ]; then
    pnpm --filter verifactu-app exec prisma generate > /dev/null 2>&1
  fi
  
  # Type check
  if ! pnpm --filter verifactu-app exec tsc --noEmit 2>&1 | grep -E "error TS"; then
    echo "✅ Type check pasado"
  else
    echo "❌ Errores de TypeScript encontrados"
    echo ""
    echo "Ejecuta esto para ver los errores completos:"
    echo "  pnpm --filter verifactu-app exec tsc --noEmit"
    exit 1
  fi
fi

echo "✅ Todas las verificaciones pasaron"
exit 0
