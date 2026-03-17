#!/usr/bin/env bash

set -euo pipefail

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

approx_eq() {
  local a="$1"
  local b="$2"
  awk -v x="$a" -v y="$b" 'BEGIN { d=x-y; if (d<0) d=-d; exit !(d <= 0.01) }'
}

json_num_or_empty() {
  local file="$1"
  local expr="$2"
  jq -r "$expr // empty" "$file" 2>/dev/null || true
}

contains_inconsistency_warning() {
  local file="$1"
  jq -e '.. | strings | test("inconsisten|inconsistency|mismatch|does not match"; "i")' "$file" >/dev/null 2>&1
}

curl_post_json() {
  local url="$1"
  local payload="$2"
  local body_file="$3"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -X POST "$url" "${H_JSON[@]}" "${H_AUTH[@]}" "${H_EXTRA[@]}" -d "$payload")
  echo "$code"
}

curl_get_binary() {
  local url="$1"
  local out_file="$2"
  local headers_file="$3"
  local code
  code=$(curl -sS -D "$headers_file" -o "$out_file" -w "%{http_code}" "$url" "${H_AUTH[@]}" "${H_EXTRA[@]}")
  echo "$code"
}

require_var BASE_URL

BASE_URL="${BASE_URL%/}"
TENANT_ID="${TENANT_ID:-}"
CUSTOMER_ID="${CUSTOMER_ID:-}"

H_JSON=(-H "Content-Type: application/json" -H "Accept: application/json")
H_AUTH=()
if [[ -n "${SESSION_TOKEN:-}" ]]; then
  H_AUTH=(-H "Cookie: __session=$SESSION_TOKEN")
elif [[ -n "${TOKEN:-}" ]]; then
  H_AUTH=(-H "Authorization: Bearer $TOKEN")
fi

H_EXTRA=()
if [[ -n "${BYPASS_TOKEN:-}" ]]; then
  H_EXTRA+=(-H "x-vercel-protection-bypass: $BYPASS_TOKEN")
fi
if [[ -n "${COOKIE_HEADER:-}" ]]; then
  H_EXTRA+=(-H "Cookie: $COOKIE_HEADER")
fi

if [[ -z "$CUSTOMER_ID" && "${CREATE_DUMMY_CUSTOMER:-1}" == "1" ]]; then
  customer_body_file=$(mktemp)
  customer_payload=$(cat <<JSON
{
  "name":"${DUMMY_CUSTOMER_NAME:-Smoke Test Customer}",
  "nif":"${DUMMY_CUSTOMER_NIF:-B12345678}",
  "email":"${DUMMY_CUSTOMER_EMAIL:-smoke@test.local}"
}
JSON
)

  customer_code=$(curl -sS -o "$customer_body_file" -w "%{http_code}" -X POST "$BASE_URL/api/customers" "${H_JSON[@]}" "${H_AUTH[@]}" "${H_EXTRA[@]}" -d "$customer_payload")
  if [[ "$customer_code" =~ ^2 ]]; then
    CUSTOMER_ID=$(jq -r '.id // .customer?.id // empty' "$customer_body_file")
  fi

  if [[ -z "$CUSTOMER_ID" ]]; then
    echo "Failed to auto-create dummy customer. HTTP: $customer_code" >&2
    cat "$customer_body_file" >&2 || true
    rm -f "$customer_body_file"
    exit 1
  fi

  rm -f "$customer_body_file"
fi

require_var CUSTOMER_ID

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
RUN_TAG="$(date +%s)"

declare -A CODES
FAILURES=0

body1="$TMP_DIR/step1.json"
payload1=$(cat <<JSON
{
  "customerId":"$CUSTOMER_ID",
  "number":"SMOKE-A-$RUN_TAG-1",
  "issueDate":"2026-03-03",
  "currency":"EUR",
  "lineItems":[
    {"description":"Servicio A","qty":1,"unitPrice":100,"vatRate":21}
  ]
}
JSON
)
CODES[1]="$(curl_post_json "$BASE_URL/api/invoices" "$payload1" "$body1")"

if [[ "${CODES[1]}" != "201" ]]; then
  FAILURES=$((FAILURES + 1))
fi

INV1_ID=$(jq -r '.id // .invoice?.id // empty' "$body1")
net1=$(json_num_or_empty "$body1" '.netAmount // .invoice?.netAmount // .totals?.netAmount // .invoice?.totals?.netAmount // .lineItems?[0]?.netAmount // .invoice?.lineItems?[0]?.netAmount')
vat1=$(json_num_or_empty "$body1" '.vatAmount // .invoice?.vatAmount // .totals?.vatAmount // .invoice?.totals?.vatAmount // .lineItems?[0]?.vatAmount // .invoice?.lineItems?[0]?.vatAmount')
tot1=$(json_num_or_empty "$body1" '.totalAmount // .invoice?.totalAmount // .totals?.totalAmount // .invoice?.totals?.totalAmount // .lineItems?[0]?.totalAmount // .invoice?.lineItems?[0]?.totalAmount')

if [[ -n "$net1" && -n "$vat1" && -n "$tot1" ]]; then
  if ! approx_eq "$net1" 100 || ! approx_eq "$vat1" 21 || ! approx_eq "$tot1" 121; then
    FAILURES=$((FAILURES + 1))
  fi
fi

body2="$TMP_DIR/step2.json"
payload2=$(cat <<JSON
{
  "customerId":"$CUSTOMER_ID",
  "number":"SMOKE-A-$RUN_TAG-2",
  "issueDate":"2026-03-03",
  "currency":"EUR",
  "lineItems":[
    {"description":"Servicio B","qty":1,"unitPrice":100,"vatRate":21,"netAmount":100,"vatAmount":21,"totalAmount":121}
  ]
}
JSON
)
CODES[2]="$(curl_post_json "$BASE_URL/api/invoices" "$payload2" "$body2")"

if [[ "${CODES[2]}" != "201" ]]; then
  FAILURES=$((FAILURES + 1))
fi

if contains_inconsistency_warning "$body2"; then
  FAILURES=$((FAILURES + 1))
fi

INV2_ID=$(jq -r '.id // .invoice?.id // empty' "$body2")

body3="$TMP_DIR/step3.json"
payload3=$(cat <<JSON
{
  "customerId":"$CUSTOMER_ID",
  "number":"SMOKE-A-$RUN_TAG-3",
  "issueDate":"2026-03-03",
  "currency":"EUR",
  "lineItems":[
    {"description":"Servicio C","qty":1,"unitPrice":100,"vatRate":21,"netAmount":100,"vatAmount":20,"totalAmount":120}
  ]
}
JSON
)
CODES[3]="$(curl_post_json "$BASE_URL/api/invoices" "$payload3" "$body3")"

if [[ "${CODES[3]}" != "422" ]]; then
  FAILURES=$((FAILURES + 1))
fi

if ! jq -e '.issues and (.issues | type == "array") and (.issues | length > 0)' "$body3" >/dev/null 2>&1; then
  FAILURES=$((FAILURES + 1))
fi

body4="$TMP_DIR/step4.json"
if [[ -n "$INV1_ID" ]]; then
  payload4='{}'
  CODES[4]="$(curl_post_json "$BASE_URL/api/invoices/$INV1_ID/issue" "$payload4" "$body4")"
else
  CODES[4]="000"
  echo '{"error":"Missing invoice id from step 1"}' > "$body4"
  FAILURES=$((FAILURES + 1))
fi

if [[ ! "${CODES[4]}" =~ ^2 ]]; then
  FAILURES=$((FAILURES + 1))
fi

if [[ "${CODES[4]}" =~ ^2 ]]; then
  if ! jq -e '.verifactuStatus // .invoice?.verifactuStatus // .status // .invoice?.status // empty' "$body4" >/dev/null 2>&1; then
    FAILURES=$((FAILURES + 1))
  fi
fi

aeat_file="$TMP_DIR/aeat.xlsx"
aeat_headers="$TMP_DIR/aeat_headers.txt"
CODES[5.1]="$(curl_get_binary "$BASE_URL/api/aeat/books/sales?from=2026-03-01&to=2026-03-31&format=xlsx" "$aeat_file" "$aeat_headers")"

if [[ "${CODES[5.1]}" != "200" ]]; then
  FAILURES=$((FAILURES + 1))
fi

if [[ ! -s "$aeat_file" ]]; then
  FAILURES=$((FAILURES + 1))
fi

aeat_kind=$(file "$aeat_file" || true)
if ! echo "$aeat_kind" | grep -Eiq 'zip|excel|xlsx|openxml'; then
  FAILURES=$((FAILURES + 1))
fi

pdf_file="$TMP_DIR/invoice.pdf"
pdf_headers="$TMP_DIR/pdf_headers.txt"
if [[ -n "$INV1_ID" ]]; then
  CODES[5.2]="$(curl_get_binary "$BASE_URL/api/invoices/$INV1_ID/pdf" "$pdf_file" "$pdf_headers")"
else
  CODES[5.2]="000"
  printf 'HTTP/1.1 000\n' > "$pdf_headers"
  : > "$pdf_file"
fi

if [[ "${CODES[5.2]}" != "200" ]]; then
  FAILURES=$((FAILURES + 1))
fi

if [[ ! -s "$pdf_file" ]]; then
  FAILURES=$((FAILURES + 1))
fi

pdf_kind=$(file "$pdf_file" || true)
if ! echo "$pdf_kind" | grep -iq 'PDF'; then
  FAILURES=$((FAILURES + 1))
fi

echo "1) ${CODES[1]}"
echo "2) ${CODES[2]}"
echo "3) ${CODES[3]}"
echo "4) ${CODES[4]}"
echo "5.1) ${CODES[5.1]}"
echo "5.2) ${CODES[5.2]}"

if [[ "${CODES[3]}" != "422" ]]; then
  echo ""
  echo "[ERROR 422 BODY]"
  cat "$body3"
fi

if [[ "${CODES[5.1]}" != "200" ]]; then
  echo ""
  echo "[BINARY TRACE 5.1 HEADERS]"
  tail -n 20 "$aeat_headers" || true
  echo "[BINARY TRACE 5.1 FILE]"
  ls -l "$aeat_file" || true
  file "$aeat_file" || true
fi

if [[ "${CODES[5.2]}" != "200" ]]; then
  echo ""
  echo "[BINARY TRACE 5.2 HEADERS]"
  tail -n 20 "$pdf_headers" || true
  echo "[BINARY TRACE 5.2 FILE]"
  ls -l "$pdf_file" || true
  file "$pdf_file" || true
fi

if [[ $FAILURES -gt 0 ]]; then
  exit 1
fi

# keep shellcheck happy for collected ids (useful for ad-hoc debugging if needed)
if [[ -n "${INV2_ID:-}" && -n "${TENANT_ID:-}" ]]; then
  :
fi
