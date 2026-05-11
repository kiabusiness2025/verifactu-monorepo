#!/usr/bin/env bash
# Smoke-test del flujo Resend + OTP contra producción (o preview).
#
# Verifica:
#   1) POST /api/auth/magic-link → 200 + otpToken, envía correo real al inbox
#   2) Validaciones (email malo → 400, origen no permitido → 400)
#   3) POST /api/auth/otp/verify → 400 con código falso (no podemos leer el real)
#
# Uso:
#   bash smoke-resend-otp.sh [BASE_URL] [EMAIL_DESTINO]
#
# Ejemplos:
#   bash smoke-resend-otp.sh https://holded.verifactu.business soporte@verifactu.business
#   bash smoke-resend-otp.sh https://holded-git-main-xxx.vercel.app soporte@verifactu.business
set -euo pipefail

BASE_URL="${1:-https://holded.verifactu.business}"
EMAIL="${2:-soporte@verifactu.business}"
CONTINUE_URL="${BASE_URL}/auth/holded-direct?source=smoke-test"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo -e "  ${GREEN}✓${NC} $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $name (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "======================================================================"
echo "  Smoke test: Resend + OTP"
echo "  Base URL : $BASE_URL"
echo "  Email    : $EMAIL"
echo "======================================================================"

# ── 1) Happy path: pedir magic link al endpoint real ──────────────────────
echo
echo -e "${YELLOW}[1/3]${NC} POST /api/auth/magic-link (happy path)"
HAPPY=$(mktemp)
HTTP_CODE=$(curl -sS -o "$HAPPY" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/auth/magic-link" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"${EMAIL}\",\"continueUrl\":\"${CONTINUE_URL}\"}")
check "Magic-link envía correo" "200" "$HTTP_CODE"
OTP_TOKEN=""
if [ "$HTTP_CODE" = "200" ]; then
  OTP_TOKEN=$(grep -o '"otpToken":"[^"]*"' "$HAPPY" | head -1 | sed 's/.*"otpToken":"\([^"]*\)".*/\1/')
  if [ -n "$OTP_TOKEN" ]; then
    echo -e "    ${GREEN}↳${NC} otpToken recibido (${#OTP_TOKEN} chars) — revisa tu inbox para el código de 6 dígitos"
  else
    echo -e "    ${RED}↳${NC} Respuesta 200 pero sin otpToken — verifica que SESSION_SECRET esté seteado en Vercel"
  fi
fi
rm -f "$HAPPY"

# ── 2) Validación: email mal formado ──────────────────────────────────────
echo
echo -e "${YELLOW}[2/3]${NC} POST /api/auth/magic-link (validaciones)"
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/api/auth/magic-link" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"not-an-email\",\"continueUrl\":\"${CONTINUE_URL}\"}")
check "Email inválido → 400" "400" "$HTTP_CODE"

HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/api/auth/magic-link" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"${EMAIL}\",\"continueUrl\":\"https://evil.example.com/phish\"}")
check "continueUrl externo → 400" "400" "$HTTP_CODE"

# ── 3) OTP verify con código falso (no podemos leer el real del inbox) ──
echo
echo -e "${YELLOW}[3/3]${NC} POST /api/auth/otp/verify (código incorrecto)"
if [ -n "${OTP_TOKEN}" ]; then
  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/api/auth/otp/verify" \
    -H "Content-Type: application/json" \
    --data "{\"token\":\"${OTP_TOKEN}\",\"otp\":\"000000\"}")
  check "OTP incorrecto → 400" "400" "$HTTP_CODE"
else
  echo -e "    ${YELLOW}↳${NC} skip: no se obtuvo otpToken del paso 1"
fi

# ── Resumen ──────────────────────────────────────────────────────────────
echo
echo "======================================================================"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}✓ Todos los smoke-tests pasaron${NC} (${PASS}/${PASS})"
  echo
  echo "Acciones manuales pendientes:"
  echo "  1) Revisa tu inbox (${EMAIL}) — debe llegar el correo con OTP en <2 min"
  echo "  2) Si no llega: abre Resend Dashboard → Logs → busca el envío"
  echo "  3) Si llega pero tarda: verifica reputación del sender (SPF/DKIM)"
else
  echo -e "${RED}✗ ${FAIL} test(s) fallaron${NC} (${PASS} OK)"
  echo "Revisa los logs de Vercel → apps/holded → /api/auth/magic-link"
  exit 1
fi
echo "======================================================================"
