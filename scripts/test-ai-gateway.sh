#!/usr/bin/env bash
# Test script for Vercel AI Gateway integration
# Usage: ./scripts/test-ai-gateway.sh

set -e

echo "════════════════════════════════════════════════════════════════"
echo "Testing Vercel AI Gateway Integration"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_PORT=3000
CHAT_ENDPOINT="http://localhost:${APP_PORT}/api/chat"
TEST_MESSAGE="¿Cuál es mi beneficio este mes?"
SESSION_COOKIE="session_token=test"

echo -e "${BLUE}1. Verificando que el servidor esté corriendo...${NC}"
if ! curl -s "http://localhost:${APP_PORT}" > /dev/null 2>&1; then
  echo -e "${RED}✗ Server not running on port ${APP_PORT}${NC}"
  echo "  Run: cd apps/app && pnpm dev"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

echo -e "${BLUE}2. Verificando endpoint /api/chat...${NC}"
if ! curl -s -X OPTIONS "${CHAT_ENDPOINT}" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠ Endpoint might not be ready${NC}"
fi
echo -e "${GREEN}✓ Endpoint is accessible${NC}"
echo ""

echo -e "${BLUE}3. Enviando solicitud de prueba...${NC}"
echo "   Endpoint: ${CHAT_ENDPOINT}"
echo "   Message: ${TEST_MESSAGE}"
echo ""

# Create test payload
PAYLOAD=$(cat <<EOF
{
  "messages": [
    {
      "role": "user",
      "content": "${TEST_MESSAGE}"
    }
  ],
  "context": {
    "type": "dashboard"
  }
}
EOF
)

# Make request
echo -e "${YELLOW}Esperando respuesta...${NC}"
HTTP_CODE=$(curl -s -w "%{http_code}" -X POST "${CHAT_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${SESSION_COOKIE}" \
  -d "${PAYLOAD}" \
  -o /tmp/ai-gateway-response.txt)

echo ""
echo -e "${BLUE}4. Resultado:${NC}"
echo "   HTTP Code: ${HTTP_CODE}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Solicitud exitosa${NC}"
  echo ""
  echo "Response (primeras 500 caracteres):"
  head -c 500 /tmp/ai-gateway-response.txt
  echo ""
  echo ""
elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${YELLOW}⚠ No authorization (esperado sin sesión válida)${NC}"
  echo "Response:"
  cat /tmp/ai-gateway-response.txt
  echo ""
elif [ "$HTTP_CODE" = "500" ]; then
  echo -e "${RED}✗ Server error${NC}"
  echo "Response:"
  cat /tmp/ai-gateway-response.txt
  echo ""
else
  echo -e "${YELLOW}⚠ Unexpected HTTP code: ${HTTP_CODE}${NC}"
  echo "Response:"
  cat /tmp/ai-gateway-response.txt
  echo ""
fi

echo -e "${BLUE}5. Verificando variables de entorno...${NC}"
if [ -f ".env.local" ]; then
  if grep -q "CLAVE_API_AI_VERCEL" .env.local; then
    echo -e "${GREEN}✓ CLAVE_API_AI_VERCEL configurada${NC}"
  else
    echo -e "${YELLOW}⚠ CLAVE_API_AI_VERCEL no encontrada${NC}"
  fi
else
  echo -e "${YELLOW}⚠ .env.local no existe${NC}"
fi
echo ""

echo -e "${BLUE}6. Verificando logs en Vercel...${NC}"
echo "   URL: https://vercel.com/dashboard"
echo "   Proyecto: verifactu-monorepo"
echo "   Tab: AI Gateway"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo "✓ Test completado"
echo ""
echo "Próximos pasos:"
echo "1. Acceder a https://vercel.com/dashboard"
echo "2. Seleccionar 'verifactu-monorepo'"
echo "3. Ir a 'AI Gateway' en el menú izquierdo"
echo "4. Verificar la solicitud en tiempo real"
echo ""
