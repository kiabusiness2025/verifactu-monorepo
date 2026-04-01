#!/usr/bin/env bash

set -euo pipefail

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

pass() {
  echo "[PASS] $1"
}

fail() {
  echo "[FAIL] $1"
  FAILURES=$((FAILURES + 1))
}

check_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    pass "$label"
  else
    fail "$label"
  fi
}

check_not_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    fail "$label"
  else
    pass "$label"
  fi
}

require_var BASE_URL

BASE_URL="${BASE_URL%/}"
FAILURES=0
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
RUN_ID=$(date +%s)

# 1) Security headers
headers_file="$TMP_DIR/headers.txt"
status=$(curl -sS -L -D "$headers_file" -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [[ "$status" =~ ^2|3 ]]; then
  pass "Landing responde HTTP válido ($status)"
else
  fail "Landing responde HTTP válido ($status)"
fi

csp=$(grep -i '^content-security-policy:' "$headers_file" | tail -n1 | cut -d':' -f2- | tr -d '\r' | sed 's/^ //' || true)
hsts=$(grep -i '^strict-transport-security:' "$headers_file" | tail -n1 | cut -d':' -f2- | tr -d '\r' | sed 's/^ //' || true)
frame=$(grep -i '^x-frame-options:' "$headers_file" | tail -n1 | cut -d':' -f2- | tr -d '\r' | sed 's/^ //' || true)
ctype=$(grep -i '^x-content-type-options:' "$headers_file" | tail -n1 | cut -d':' -f2- | tr -d '\r' | sed 's/^ //' || true)
perm=$(grep -i '^permissions-policy:' "$headers_file" | tail -n1 | cut -d':' -f2- | tr -d '\r' | sed 's/^ //' || true)

if [[ -n "$csp" ]]; then
  pass "CSP presente"
else
  fail "CSP presente"
fi

check_contains "$csp" "nonce-" "CSP incluye nonce"
check_not_contains "$csp" "unsafe-eval" "CSP no usa unsafe-eval"
check_contains "$hsts" "max-age=63072000" "HSTS presente"
check_contains "$frame" "SAMEORIGIN" "X-Frame-Options correcto"
check_contains "$ctype" "nosniff" "X-Content-Type-Options correcto"
check_contains "$perm" "camera=()" "Permissions-Policy presente"

# 2) Debug endpoint removed
code_debug=$(curl -sS -o "$TMP_DIR/debug.json" -w "%{http_code}" "$BASE_URL/api/debug/env")
if [[ "$code_debug" == "404" ]]; then
  pass "Endpoint /api/debug/env no expuesto"
else
  fail "Endpoint /api/debug/env no expuesto (HTTP $code_debug)"
fi

# 3) Rate limiting send-lead (5/10m)
lead429=0
for i in {1..6}; do
  code=$(curl -sS -o "$TMP_DIR/lead_$i.json" -w "%{http_code}" -X POST \
    "$BASE_URL/api/send-lead" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{}')
  if [[ "$code" == "429" ]]; then
    lead429=1
  fi
done
if [[ "$lead429" == "1" ]]; then
  pass "Rate limit /api/send-lead activo"
else
  fail "Rate limit /api/send-lead activo"
fi

# 4) Rate limiting chat (20/60s)
chat429=0
for i in {1..22}; do
  code=$(curl -sS -o "$TMP_DIR/chat_$i.json" -w "%{http_code}" -X POST \
    "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{}')
  if [[ "$code" == "429" ]]; then
    chat429=1
  fi
done
if [[ "$chat429" == "1" ]]; then
  pass "Rate limit /api/chat activo"
else
  fail "Rate limit /api/chat activo"
fi

# 5) Optional: Stripe webhook idempotency (requires secret)
if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  payload=$(cat <<JSON
{"id":"evt_smoke_${RUN_ID}","object":"event","type":"invoice.payment_failed","data":{"object":{"id":"in_smoke_${RUN_ID}","object":"invoice","subscription":"sub_smoke_${RUN_ID}"}}}
JSON
)

  ts=$(date +%s)
  signed_payload="${ts}.${payload}"
  sig=$(printf "%s" "$signed_payload" | openssl dgst -sha256 -hmac "$STRIPE_WEBHOOK_SECRET" -binary | xxd -p -c 256)
  stripe_header="t=${ts},v1=${sig}"

  code_1=$(curl -sS -o "$TMP_DIR/webhook_1.json" -w "%{http_code}" -X POST \
    "$BASE_URL/api/stripe/webhook" \
    -H "Content-Type: application/json" \
    -H "stripe-signature: ${stripe_header}" \
    -d "$payload")

  code_2=$(curl -sS -o "$TMP_DIR/webhook_2.json" -w "%{http_code}" -X POST \
    "$BASE_URL/api/stripe/webhook" \
    -H "Content-Type: application/json" \
    -H "stripe-signature: ${stripe_header}" \
    -d "$payload")

  if [[ "$code_1" == "200" ]]; then
    pass "Webhook Stripe acepta payload firmado"
  else
    fail "Webhook Stripe acepta payload firmado (HTTP $code_1)"
  fi

  duplicate=$(jq -r '.duplicate // false' "$TMP_DIR/webhook_2.json" 2>/dev/null || echo "false")
  if [[ "$code_2" == "200" && "$duplicate" == "true" ]]; then
    pass "Webhook Stripe idempotente"
  else
    fail "Webhook Stripe idempotente (HTTP $code_2, duplicate=$duplicate)"
  fi
else
  echo "[SKIP] Idempotencia Stripe (define STRIPE_WEBHOOK_SECRET para validarlo)"
fi

echo ""
if [[ "$FAILURES" -gt 0 ]]; then
  echo "Security smoke failed: $FAILURES check(s)"
  exit 1
fi

echo "Security smoke passed"
