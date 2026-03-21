#!/usr/bin/env bash
# smoke-pr-b.sh — Expense API smoke test (companion to smoke-pr-a.sh)
#
# Required:  BASE_URL
# Optional:  SESSION_TOKEN | TOKEN   (one auth method required)
#            BYPASS_TOKEN            (Vercel protection bypass)
#            COOKIE_HEADER           (alternative cookie header)
#
# Usage:
#   BASE_URL="https://app.verifactu.business" SESSION_TOKEN="<__session>" bash scripts/smoke-pr-b.sh

set -euo pipefail

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

json_field_present() {
  local file="$1"
  local expr="$2"
  jq -e "$expr // empty" "$file" >/dev/null 2>&1
}

curl_post_json() {
  local url="$1"
  local payload="$2"
  local body_file="$3"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -X POST "$url" "${H_JSON[@]}" "${H_AUTH[@]}" "${H_EXTRA[@]}" -d "$payload")
  echo "$code"
}

curl_get_json() {
  local url="$1"
  local body_file="$2"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" "$url" "${H_JSON[@]}" "${H_AUTH[@]}" "${H_EXTRA[@]}")
  echo "$code"
}

curl_patch_json() {
  local url="$1"
  local payload="$2"
  local body_file="$3"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -X PATCH "$url" "${H_JSON[@]}" "${H_AUTH[@]}" "${H_EXTRA[@]}" -d "$payload")
  echo "$code"
}

curl_delete_json() {
  local url="$1"
  local body_file="$2"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -X DELETE "$url" "${H_AUTH[@]}" "${H_EXTRA[@]}")
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

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
RUN_TAG="$(date +%s)"

declare -A CODES
FAILURES=0
EXPENSE_ID=""

# ---------------------------------------------------------------------------
# Step 1: GET /api/expenses — list (pagination must be present)
# ---------------------------------------------------------------------------
body1="$TMP_DIR/step1.json"
CODES[1]="$(curl_get_json "$BASE_URL/api/expenses?limit=5&page=1" "$body1")"

if [[ "${CODES[1]}" != "200" ]]; then
  FAILURES=$((FAILURES + 1))
fi

if ! json_field_present "$body1" '.pagination'; then
  FAILURES=$((FAILURES + 1))
fi

if ! json_field_present "$body1" '.expenses'; then
  FAILURES=$((FAILURES + 1))
fi

# ---------------------------------------------------------------------------
# Step 2: POST /api/expenses/intake — create expense (valid payload)
# ---------------------------------------------------------------------------
body2="$TMP_DIR/step2.json"
payload2=$(cat <<JSON
{
  "date": "2026-03-03",
  "description": "Alquiler de oficina",
  "amount": 1000,
  "taxRate": 21,
  "reference": "SMOKE-B-$RUN_TAG"
}
JSON
)
CODES[2]="$(curl_post_json "$BASE_URL/api/expenses/intake" "$payload2" "$body2")"

if [[ ! "${CODES[2]}" =~ ^2 ]]; then
  FAILURES=$((FAILURES + 1))
fi

if [[ "${CODES[2]}" =~ ^2 ]]; then
  EXPENSE_ID=$(jq -r '.expenseId // .id // empty' "$body2")
  if [[ -z "$EXPENSE_ID" ]]; then
    FAILURES=$((FAILURES + 1))
  fi
  # category must be present
  if ! json_field_present "$body2" '.category'; then
    FAILURES=$((FAILURES + 1))
  fi
fi

# ---------------------------------------------------------------------------
# Step 3: POST /api/expenses/intake — missing required fields (expect 400)
# ---------------------------------------------------------------------------
body3="$TMP_DIR/step3.json"
CODES[3]="$(curl_post_json "$BASE_URL/api/expenses/intake" '{}' "$body3")"

if [[ "${CODES[3]}" != "400" ]]; then
  FAILURES=$((FAILURES + 1))
fi

# ---------------------------------------------------------------------------
# Step 4: GET /api/expenses/:id — detail (only if step 2 succeeded)
# ---------------------------------------------------------------------------
body4="$TMP_DIR/step4.json"
if [[ -n "$EXPENSE_ID" ]]; then
  CODES[4]="$(curl_get_json "$BASE_URL/api/expenses/$EXPENSE_ID" "$body4")"
  if [[ "${CODES[4]}" != "200" ]]; then
    FAILURES=$((FAILURES + 1))
  fi
  # id and amount must be present
  if ! json_field_present "$body4" '.id'; then
    FAILURES=$((FAILURES + 1))
  fi
else
  CODES[4]="000"
  echo '{"error":"Skipped - no expense id from step 2"}' >"$body4"
  FAILURES=$((FAILURES + 1))
fi

# ---------------------------------------------------------------------------
# Step 5: PATCH /api/expenses/:id — update description
# ---------------------------------------------------------------------------
body5="$TMP_DIR/step5.json"
if [[ -n "$EXPENSE_ID" ]]; then
  payload5=$(cat <<JSON
{
  "description": "Alquiler de oficina (smoke-updated)"
}
JSON
)
  CODES[5]="$(curl_patch_json "$BASE_URL/api/expenses/$EXPENSE_ID" "$payload5" "$body5")"
  if [[ ! "${CODES[5]}" =~ ^2 ]]; then
    FAILURES=$((FAILURES + 1))
  fi
else
  CODES[5]="000"
  echo '{"error":"Skipped"}' >"$body5"
fi

# ---------------------------------------------------------------------------
# Step 6: GET /api/aeat/books/purchases — purchases book (xlsx)
# ---------------------------------------------------------------------------
purchases_file="$TMP_DIR/purchases.xlsx"
purchases_headers="$TMP_DIR/purchases_headers.txt"
CODES[6]="$(curl_get_binary "$BASE_URL/api/aeat/books/purchases?from=2026-03-01&to=2026-03-31&format=xlsx" "$purchases_file" "$purchases_headers")"

if [[ "${CODES[6]}" != "200" ]]; then
  FAILURES=$((FAILURES + 1))
fi

if [[ ! -s "$purchases_file" ]]; then
  FAILURES=$((FAILURES + 1))
fi

purchases_kind=$(file "$purchases_file" 2>/dev/null || true)
if ! echo "$purchases_kind" | grep -Eiq 'zip|excel|xlsx|openxml'; then
  FAILURES=$((FAILURES + 1))
fi

# ---------------------------------------------------------------------------
# Step 7: DELETE /api/expenses/:id — cleanup
# ---------------------------------------------------------------------------
body7="$TMP_DIR/step7.json"
if [[ -n "$EXPENSE_ID" ]]; then
  CODES[7]="$(curl_delete_json "$BASE_URL/api/expenses/$EXPENSE_ID" "$body7")"
  if [[ ! "${CODES[7]}" =~ ^2 ]]; then
    FAILURES=$((FAILURES + 1))
  fi
else
  CODES[7]="000"
  echo '{"error":"Skipped"}' >"$body7"
fi

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
echo "1) GET  /api/expenses              ${CODES[1]}"
echo "2) POST /api/expenses/intake       ${CODES[2]}  (expense: ${EXPENSE_ID:-none})"
echo "3) POST /api/expenses/intake (400) ${CODES[3]}"
echo "4) GET  /api/expenses/:id          ${CODES[4]}"
echo "5) PATCH /api/expenses/:id         ${CODES[5]}"
echo "6) GET  /api/aeat/books/purchases  ${CODES[6]}"
echo "7) DELETE /api/expenses/:id        ${CODES[7]}"

if [[ "${CODES[2]}" != "200" && "${CODES[2]}" != "201" ]]; then
  echo ""
  echo "[ERROR STEP 2 BODY]"
  cat "$body2"
fi

if [[ "${CODES[3]}" != "400" ]]; then
  echo ""
  echo "[ERROR 400 BODY step 3]"
  cat "$body3"
fi

if [[ "${CODES[6]}" != "200" ]]; then
  echo ""
  echo "[BINARY TRACE 6 HEADERS]"
  tail -n 20 "$purchases_headers" || true
  echo "[BINARY TRACE 6 FILE]"
  ls -l "$purchases_file" || true
  file "$purchases_file" || true
fi

if [[ $FAILURES -gt 0 ]]; then
  echo ""
  echo "FAILURES: $FAILURES"
  exit 1
fi
