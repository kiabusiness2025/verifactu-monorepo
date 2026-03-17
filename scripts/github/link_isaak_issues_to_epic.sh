#!/usr/bin/env bash
set -euo pipefail

EPIC="${1:-68}"
MODE="${2:-dry-run}" # dry-run | apply

if [[ "$MODE" != "dry-run" && "$MODE" != "apply" ]]; then
  echo "Uso: $0 [epic_number] [dry-run|apply]" >&2
  exit 1
fi

body="$(gh issue view "$EPIC" --json body --jq .body)"

insert_line() {
  local line="$1"
  if printf '%s\n' "$body" | grep -Fqx "$line"; then
    return 0
  fi

  local marker="### Acceptance Criteria"
  if printf '%s\n' "$body" | grep -Fq "$marker"; then
    body="$(printf '%s\n' "$body" | awk -v l="$line" -v m="$marker" '
      $0==m && !done { print l; done=1 }
      { print }
    ')"
  else
    body="$body
$line"
  fi
}

insert_line "- [ ] #69 [FEATURE] Isaak v2 — Normalización de gastos a esquema canónico (docType/taxCategory/AEAT fields)"
insert_line "- [ ] #70 [FEATURE] UI Confirmación gasto — campos fiscales + warnings + estimado"

if [[ "$MODE" == "dry-run" ]]; then
  echo "would update epic #$EPIC with Isaak issues"
  exit 0
fi

gh issue edit "$EPIC" --body "$body" >/dev/null
echo "updated epic #$EPIC"
