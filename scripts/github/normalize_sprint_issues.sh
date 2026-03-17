#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dry-run}" # dry-run | apply

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI no está instalado" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq es requerido" >&2
  exit 1
fi

repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Repo: $repo"

issues_json="$(gh issue list --state all --limit 200 --json number,title,body,state,url)"

# Filtra issues tipo Sx-yy ...
filtered="$(printf '%s' "$issues_json" | jq '[.[] | select(.title | test("^S[0-9]+-[0-9]{2}"))]')"
count="$(printf '%s' "$filtered" | jq 'length')"
if [[ "$count" -eq 0 ]]; then
  echo "No se encontraron issues Sx-yy"
  exit 0
fi

# Mapa canonico: para cada codigo Sx-yy, usa issue con numero mas alto (más reciente)
map_lines="$(printf '%s' "$filtered" | jq -r '
  group_by(.title | capture("^(?<code>S[0-9]+-[0-9]{2})").code)
  | map(sort_by(.number) | last)
  | .[]
  | .title as $t
  | ($t | capture("^(?<code>S[0-9]+-[0-9]{2})").code) + " " + (.number|tostring)
')"

echo "\nCanonical map (code -> issue):"
printf '%s\n' "$map_lines"

# Duplicados: mismo código con issue distinto al canónico
dup_json="$(
  printf '%s' "$filtered" | jq --arg map "$map_lines" '
    def canon_num($code):
      ($map | split("\n")
        | map(select(length>0) | split(" "))
        | map({code: .[0], num: (.[1]|tonumber)})
        | map(select(.code==$code))
        | .[0].num);

    [ .[]
      | .title as $t
      | ($t | capture("^(?<code>S[0-9]+-[0-9]{2})").code) as $c
      | .number as $n
      | {code:$c, number:$n, state, title, body, url, canonical: canon_num($c)}
      | select(.number != .canonical)
    ]
  '
)"

dup_count="$(printf '%s' "$dup_json" | jq 'length')"
echo "\nDuplicados detectados: $dup_count"
if [[ "$dup_count" -gt 0 ]]; then
  printf '%s' "$dup_json" | jq -r '.[] | "- \(.code): #\(.number) -> duplicado de #\(.canonical) (\(.state))"'
fi

# Actualiza dependencias en issues canónicos
canonical_json="$(
  printf '%s' "$filtered" | jq --arg map "$map_lines" '
    [ .[]
      | .title as $t
      | ($t | capture("^(?<code>S[0-9]+-[0-9]{2})").code) as $c
      | .number as $n
      | select(
          ($map | split("\n")
            | map(select(length>0) | split(" "))
            | map({code: .[0], num: (.[1]|tonumber)})
            | map(select(.code==$c))
            | .[0].num
          ) == $n
        )
    ]
  '
)"

canon_count="$(printf '%s' "$canonical_json" | jq 'length')"
echo "\nIssues canónicos a normalizar dependencias: $canon_count"

replace_body() {
  local body="$1"
  local updated="$body"
  while read -r code num; do
    [[ -z "${code:-}" ]] && continue
    updated="$(printf '%s' "$updated" | perl -pe "s/\\b\Q$code\E\\b/#$num/g")"
  done <<< "$map_lines"
  printf '%s' "$updated"
}

if [[ "$MODE" == "dry-run" ]]; then
  printf '%s' "$canonical_json" | jq -r '.[] | "- #\(.number) \(.title)"'
  echo "\nDry-run completado."
  exit 0
fi

# apply
while IFS= read -r item; do
  num="$(printf '%s' "$item" | jq -r '.number')"
  title="$(printf '%s' "$item" | jq -r '.title')"
  body="$(printf '%s' "$item" | jq -r '.body // ""')"
  new_body="$(replace_body "$body")"

  if [[ "$body" != "$new_body" ]]; then
    gh issue edit "$num" --body "$new_body" >/dev/null
    echo "updated deps: #$num $title"
  fi
done < <(printf '%s' "$canonical_json" | jq -c '.[]')

# Cierra duplicados abiertos
gh label create "duplicate" --color "cfd3d7" --description "Issue duplicado" >/dev/null 2>&1 || true
while IFS= read -r d; do
  num="$(printf '%s' "$d" | jq -r '.number')"
  state="$(printf '%s' "$d" | jq -r '.state')"
  can="$(printf '%s' "$d" | jq -r '.canonical')"
  if [[ "$state" == "OPEN" ]]; then
    gh issue edit "$num" --add-label "duplicate" >/dev/null || true
    gh issue close "$num" --comment "Cerrado como duplicado de #$can" >/dev/null
    echo "closed duplicate: #$num -> #$can"
  fi
done < <(printf '%s' "$dup_json" | jq -c '.[]')

echo "\nApply completado."
