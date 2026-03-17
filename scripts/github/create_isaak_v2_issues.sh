#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dry-run}" # dry-run | apply

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI no está instalado" >&2
  exit 1
fi

if [[ "$MODE" != "dry-run" && "$MODE" != "apply" ]]; then
  echo "Uso: $0 [dry-run|apply]" >&2
  exit 1
fi

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"

  if [[ "$MODE" == "dry-run" ]]; then
    echo "would create: $title"
    echo "labels: $labels"
    return 0
  fi

  gh issue create \
    --title "$title" \
    --label "$labels" \
    --body "$body"
}

create_issue \
  "[FEATURE] Isaak v2 — Normalización de gastos a esquema canónico (docType/taxCategory/AEAT fields)" \
  "feature,priority:P1,area:app,area:backend,area:integrations" \
$'## Description\nAdaptar Isaak para que siempre produzca salida canónica de gasto independiente del plan y del motor de salida (AEAT/API).\n\n## Problem It Solves\nEvita retrabajo y divergencias entre motor AEAT y motor de integración API. Garantiza consistencia de datos para export/sync.\n\n## Proposed Solution\n- [ ] Implementar contrato canónico documentado en `docs/isaak/expense_schema.md`\n- [ ] Incluir siempre: `docType`, `taxCategory`, `aeatConcept/aeatKey` (si aplica), `confidence` por campo, `warnings`\n- [ ] Reglas duras:\n  - [ ] No inventar NIF/CIF/VAT\n  - [ ] IVA=0 en `bank_fee`/`payroll`/sin IVA\n  - [ ] Si se estima base/IVA, marcar `estimated` + `warnings`\n  - [ ] Resolver fecha con prioridad emisión > cargo (con warning)\n- [ ] Salida dual de Isaak:\n  - [ ] JSON validable (Zod)\n  - [ ] Resumen humano corto para UI\n\n### Acceptance Criteria\n- [ ] Todas las sugerencias de gasto producen payload canónico válido\n- [ ] Export AEAT no revienta con datos incompletos; aparecen `warnings`\n- [ ] El payload sirve tanto para Motor A (AEAT) como Motor B (API)\n\n## Alternative Solutions\nMantener lógica distinta por motor -> descartado (duplica reglas y aumenta errores).\n\n## Mockups or Examples\nVer `docs/isaak/expense_schema.md`.\n\n## Additional Context\nEpic: #68\nContrato base en repo: `docs/isaak/expense_schema.md`.'

create_issue \
  "[FEATURE] UI Confirmación gasto — campos fiscales + warnings + estimado" \
  "feature,priority:P1,area:app,area:backend" \
$'## Description\nAñadir flujo mínimo de confirmación de gasto para validar propuesta de Isaak antes de guardar como source of truth.\n\n## Problem It Solves\nReduce errores contables y permite operar con todo tipo de empresa sin bloquear por incertidumbre del OCR/IA.\n\n## Proposed Solution\n- [ ] En pantalla de gasto confirmar:\n  - [ ] proveedor\n  - [ ] fecha\n  - [ ] base / IVA / tipo\n  - [ ] `docType` + `taxCategory`\n  - [ ] `aeatConcept` opcional\n- [ ] Mostrar `warnings` y flags de `estimated`\n- [ ] Si deducibilidad incierta, pedir confirmación explícita\n- [ ] Persistir el resultado confirmado como fuente oficial\n\n### Acceptance Criteria\n- [ ] Usuario puede corregir propuesta de Isaak antes de guardar\n- [ ] Los campos confirmados se reflejan en libros/export y en sync\n- [ ] Casos `bank_fee`/`payroll`/`other` quedan clasificados sin bloquear\n\n## Alternative Solutions\nAuto-guardado sin confirmación -> descartado (riesgo fiscal).\n\n## Mockups or Examples\nRuta sugerida: `Gastos -> detalle gasto` con panel de confirmación.\n\n## Additional Context\nEpic: #68\nDepende del contrato canónico de Isaak v2.'

echo "Done ($MODE)."
