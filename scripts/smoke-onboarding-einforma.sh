#!/usr/bin/env bash
set -euo pipefail

# Smoke test onboarding eInforma flow with cache-first checks.
# Required env vars:
#   BASE_URL, TOKEN, QUERY
# Optional:
#   TAX_ID, LIMIT
#
# Example:
#   BASE_URL="https://app.verifactu.business" \
#   TOKEN="..." \
#   QUERY="restaurante" \
#   bash scripts/smoke-onboarding-einforma.sh

BASE_URL="${BASE_URL:-}"
TOKEN="${TOKEN:-}"
QUERY="${QUERY:-}"
TAX_ID="${TAX_ID:-}"
LIMIT="${LIMIT:-10}"

if [[ -z "$BASE_URL" || -z "$TOKEN" || -z "$QUERY" ]]; then
  echo "ERROR: required env vars missing."
  echo "Set BASE_URL, TOKEN, QUERY (optional TAX_ID, LIMIT)."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required."
  exit 1
fi

H_AUTH=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/json")

echo "== 1) Search onboarding (first call) =="
SEARCH_URL_1="$BASE_URL/api/onboarding/einforma/search?q=$(printf '%s' "$QUERY" | jq -sRr @uri)&limit=$LIMIT"
RESP_SEARCH_1="$(curl -sS "${H_AUTH[@]}" "$SEARCH_URL_1")"
echo "$RESP_SEARCH_1" | jq '{ok, cached, cacheSource, lastSyncAt, count:(.results|length)}'

OK_1="$(echo "$RESP_SEARCH_1" | jq -r '.ok // false')"
if [[ "$OK_1" != "true" ]]; then
  echo "FAIL: search #1 not ok"
  echo "$RESP_SEARCH_1" | jq .
  exit 1
fi

RESULT_COUNT="$(echo "$RESP_SEARCH_1" | jq -r '.results | length')"
if [[ "$RESULT_COUNT" -eq 0 ]]; then
  echo "FAIL: search returned zero results for QUERY='$QUERY'"
  exit 1
fi

FIRST_ID="$(echo "$RESP_SEARCH_1" | jq -r '.results[0].einformaId // empty')"
FIRST_NIF="$(echo "$RESP_SEARCH_1" | jq -r '.results[0].nif // empty')"
if [[ -z "$FIRST_ID" ]]; then
  echo "FAIL: first result has empty einformaId"
  echo "$RESP_SEARCH_1" | jq '.results[0]'
  exit 1
fi

USE_TAX_ID="$TAX_ID"
if [[ -z "$USE_TAX_ID" && -n "$FIRST_NIF" ]]; then
  USE_TAX_ID="$(printf '%s' "$FIRST_NIF" | tr '[:lower:]' '[:upper:]')"
fi

echo "== 2) Search onboarding (second call, should be cache-first) =="
RESP_SEARCH_2="$(curl -sS "${H_AUTH[@]}" "$SEARCH_URL_1")"
echo "$RESP_SEARCH_2" | jq '{ok, cached, cacheSource, lastSyncAt, count:(.results|length)}'

CACHED_2="$(echo "$RESP_SEARCH_2" | jq -r '.cached // false')"
if [[ "$CACHED_2" != "true" ]]; then
  echo "WARN: second search call was not cached (check einformaLookup TTL/keys)."
fi

echo "== 3) Company detail onboarding (cache before credit consumption) =="
DETAIL_URL="$BASE_URL/api/onboarding/einforma/company?einformaId=$(printf '%s' "$FIRST_ID" | jq -sRr @uri)"
if [[ -n "$USE_TAX_ID" ]]; then
  DETAIL_URL="$DETAIL_URL&taxId=$(printf '%s' "$USE_TAX_ID" | jq -sRr @uri)"
fi

RESP_DETAIL="$(curl -sS "${H_AUTH[@]}" "$DETAIL_URL")"
echo "$RESP_DETAIL" | jq '{ok, cached, cacheSource, lastSyncAt, company:{einformaId:.company.einformaId, name:.company.name, nif:.company.nif}}'

OK_DETAIL="$(echo "$RESP_DETAIL" | jq -r '.ok // false')"
if [[ "$OK_DETAIL" != "true" ]]; then
  echo "FAIL: company detail not ok"
  echo "$RESP_DETAIL" | jq .
  exit 1
fi

COMPANY_NAME="$(echo "$RESP_DETAIL" | jq -r '.company.name // empty')"
if [[ -z "$COMPANY_NAME" ]]; then
  echo "FAIL: company detail missing name"
  exit 1
fi

echo "== RESULT =="
echo "PASS: onboarding eInforma flow is responding."
echo "Search count: $RESULT_COUNT"
echo "Selected einformaId: $FIRST_ID"
echo "Selected taxId: ${USE_TAX_ID:-n/a}"
