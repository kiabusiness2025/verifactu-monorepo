#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dry-run}" # dry-run | apply

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI no está instalado." >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

ensure_label() {
  local name="$1" color="$2" desc="$3"
  if gh label list --search "$name" --json name -q '.[].name' | grep -Fxq "$name"; then
    return 0
  fi
  if [[ "$MODE" == "apply" ]]; then
    gh label create "$name" --color "$color" --description "$desc" >/dev/null
  fi
  echo "label: $name"
}

ensure_milestone() {
  local title="$1"
  if gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title' | grep -Fxq "$title"; then
    return 0
  fi
  if [[ "$MODE" == "apply" ]]; then
    gh api "repos/$REPO/milestones" -f title="$title" >/dev/null
  fi
  echo "milestone: $title"
}

create_issue() {
  local title="$1" labels="$2" milestone="$3" body="$4"
  if [[ "$MODE" == "apply" ]]; then
    gh issue create \
      --title "$title" \
      --label "$labels" \
      --milestone "$milestone" \
      --body "$body" >/dev/null
    echo "created: $title"
  else
    echo "---"
    echo "title: $title"
    echo "labels: $labels"
    echo "milestone: $milestone"
  fi
}

read -r -d '' LABELS <<'EOF' || true
area:web|0ea5e9|Web pública/landing
area:app|3b82f6|Frontend app
area:backend|6366f1|Backend/API
area:db|8b5cf6|Data/Prisma
area:integrations|0f766e|Integraciones API
feature|22c55e|Nueva capacidad
enhancement|84cc16|Mejora incremental
tech-debt|64748b|Deuda técnica
priority:P0|dc2626|Máxima prioridad
priority:P1|f59e0b|Prioridad alta
sprint:0|a855f7|Sprint 0
sprint:1|9333ea|Sprint 1
sprint:2|7c3aed|Sprint 2
sprint:3|6d28d9|Sprint 3
EOF

while IFS='|' read -r name color desc; do
  [[ -z "$name" ]] && continue
  ensure_label "$name" "$color" "$desc"
done <<< "$LABELS"

ensure_milestone "Sprint 0 — Planes + Copy + Flags"
ensure_milestone "Sprint 1 — AEAT Excel + Integración (guardar API key)"
ensure_milestone "Sprint 2 — Sync unidireccional (Empresa/PRO)"
ensure_milestone "Sprint 3 — Presupuestos bidireccional + conflictos"

issue_body() {
  cat <<'EOF'
## Description
__DESCRIPTION__

## Problem It Solves
__PROBLEM__

## Proposed Solution
__SOLUTION__

## Additional Context
- Dependencies: __DEPENDENCIES__

## Checklist
__TASKS__

## Acceptance Criteria
__ACCEPTANCE__
EOF
}

build_body() {
  local description="$1" problem="$2" solution="$3" dependencies="$4" tasks="$5" acceptance="$6"
  local description_esc problem_esc solution_esc dependencies_esc tasks_esc acceptance_esc
  description_esc="$(printf '%s' "$description" | sed -e 's/[\\&|]/\\&/g')"
  problem_esc="$(printf '%s' "$problem" | sed -e 's/[\\&|]/\\&/g')"
  solution_esc="$(printf '%s' "$solution" | sed -e 's/[\\&|]/\\&/g')"
  dependencies_esc="$(printf '%s' "$dependencies" | sed -e 's/[\\&|]/\\&/g')"
  tasks_esc="$(printf '%s' "$tasks" | sed -e 's/[\\&|]/\\&/g')"
  acceptance_esc="$(printf '%s' "$acceptance" | sed -e 's/[\\&|]/\\&/g')"
  issue_body \
    | sed "s|__DESCRIPTION__|$description_esc|g" \
    | sed "s|__PROBLEM__|$problem_esc|g" \
    | sed "s|__SOLUTION__|$solution_esc|g" \
    | sed "s|__DEPENDENCIES__|$dependencies_esc|g" \
    | sed "s|__TASKS__|$tasks_esc|g" \
    | sed "s|__ACCEPTANCE__|$acceptance_esc|g"
}

# Sprint 0
b="$(build_body \
'Eliminar referencias de marca y usar copy genérico de integración por API en web + app + docs.' \
'Evitar dependencia de marca y alinear posicionamiento del producto.' \
'Búsqueda global, reemplazo de copy, revisión de superficies visibles al usuario.' \
'None' \
'- [ ] Buscar y eliminar strings Holded/holded y equivalentes\n- [ ] Sustituir por copy genérico\n- [ ] Revisar landing, /planes, /integraciones, app, tooltips, emails y docs' \
'- [ ] `rg -n "Holded|holded"` devuelve 0 en código/copy visible')"
create_issue "S0-01 — Eliminar menciones a marcas y dejar copy genérico" "feature,priority:P0,sprint:0,area:web,area:app" "Sprint 0 — Planes + Copy + Flags" "$b"

b="$(build_body \
'Actualizar matriz de planes y flags: AEAT Excel para todos; API y bidireccional solo Empresa/PRO.' \
'Garantizar permisos coherentes en web, app y backend.' \
'Implementar/validar flags y gating en UI/API.' \
'Blocked by S0-01' \
'- [ ] canExportAeatBooks=true en todos\n- [ ] canUseAccountingApiIntegration=true en Empresa/PRO\n- [ ] canBidirectionalQuotes=true en Empresa/PRO\n- [ ] Actualizar tabla pública de planes\n- [ ] Aplicar gating en app' \
'- [ ] BÁSICO exporta AEAT y no conecta API\n- [ ] Empresa sí conecta API')"
create_issue "S0-02 — Actualizar matriz de planes y feature flags (AEAT Excel en todos; API solo Empresa/PRO)" "feature,priority:P0,sprint:0,area:web,area:app,area:backend" "Sprint 0 — Planes + Copy + Flags" "$b"

# Sprint 1
b="$(build_body \
'Añadir TenantProfile para perfil fiscal mínimo sin tipar rígidamente empresa.' \
'Permitir cualquier tipo de empresa con datos fiscales mínimos.' \
'Crear modelo + migración + backfill básico para tenants existentes.' \
'None' \
'- [ ] Modelo TenantProfile\n- [ ] Migración\n- [ ] Backfill razonable' \
'- [ ] Tenant almacena perfil fiscal sin forzar autónomo/SL')"
create_issue "S1-01 — Prisma: TenantProfile (perfil fiscal mínimo)" "feature,priority:P1,sprint:1,area:db" "Sprint 1 — AEAT Excel + Integración (guardar API key)" "$b"

b="$(build_body \
'Base de integración genérica: TenantIntegration + SyncLog.' \
'Habilitar conexión API por tenant con observabilidad básica.' \
'Crear modelos y cifrar apiKeyEnc con secret de entorno.' \
'None' \
'- [ ] TenantIntegration provider=accounting_api\n- [ ] SyncLog\n- [ ] Cifrado apiKeyEnc' \
'- [ ] Empresa/PRO guarda API key cifrada y ve status')"
create_issue "S1-02 — Prisma: TenantIntegration genérica + SyncLog" "feature,priority:P1,sprint:1,area:db,area:backend,area:integrations" "Sprint 1 — AEAT Excel + Integración (guardar API key)" "$b"

b="$(build_body \
'Extender Expense para clasificación fiscal y export AEAT robusto.' \
'Cubrir casos no-factura y reglas de deducibilidad.' \
'Agregar docType, taxCategory, aeatConcept y aeatKey.' \
'None' \
'- [ ] Expense.docType\n- [ ] Expense.taxCategory\n- [ ] Expense.aeatConcept/aeatKey opcionales' \
'- [ ] Confirmación de gasto guarda docType/taxCategory y se usa en export')"
create_issue "S1-03 — Prisma: Extender Expense para clasificación fiscal/export" "enhancement,priority:P1,sprint:1,area:db,area:backend" "Sprint 1 — AEAT Excel + Integración (guardar API key)" "$b"

b="$(build_body \
'Exportar libros AEAT ventas/recibidas en XLSX.' \
'Necesario para cumplimiento y control en todos los planes.' \
'Endpoints de libros + generación XLSX estable + warnings.' \
'Depends on S1-03' \
'- [ ] GET /api/aeat/books/sales?from&to&format=xlsx\n- [ ] GET /api/aeat/books/purchases?from&to&format=xlsx\n- [ ] Columna warnings\n- [ ] Tests básicos IVA/exento/no deducible/suplidos/no-factura' \
'- [ ] Cualquier plan descarga XLSX sin errores fatales')"
create_issue "S1-04 — Backend: Export libros AEAT (Excel) ventas/recibidas" "feature,priority:P0,sprint:1,area:backend" "Sprint 1 — AEAT Excel + Integración (guardar API key)" "$b"

b="$(build_body \
'Exportar modelos 303/130 y previews del periodo.' \
'Dar resumen previo consistente con el archivo exportado.' \
'Endpoints de preview y export con misma fuente de cálculo.' \
'Depends on S1-04' \
'- [ ] GET /api/aeat/export/303?period&format=xlsx\n- [ ] GET /api/aeat/export/130?period&format=xlsx\n- [ ] GET /api/aeat/preview/303\n- [ ] GET /api/aeat/preview/130' \
'- [ ] Preview coincide con export en totales')"
create_issue "S1-05 — Backend: Export 303/130 + preview" "feature,priority:P1,sprint:1,area:backend" "Sprint 1 — AEAT Excel + Integración (guardar API key)" "$b"

b="$(build_body \
'Pantalla de Impuestos en app con export y preview para todos los planes.' \
'Exponer capacidad AEAT sin gating por plan.' \
'UI de periodos, preview y descarga XLSX.' \
'Depends on S1-05' \
'- [ ] Menú Impuestos (303/130)\n- [ ] Selector periodo + export XLSX\n- [ ] Preview previo\n- [ ] Sin gating' \
'- [ ] Usuario BÁSICO exporta 303/130 desde UI')"
create_issue "S1-06 — Frontend App: Pantalla Impuestos (export para todos)" "feature,priority:P0,sprint:1,area:app" "Sprint 1 — AEAT Excel + Integración (guardar API key)" "$b"

b="$(build_body \
'Pantalla Integraciones para conectar API contable en Empresa/PRO.' \
'Permitir configuración opcional de integración según plan.' \
'UI con estado, guardado de key y upsell para planes sin permiso.' \
'Depends on S1-02, S0-02' \
'- [ ] Menú Integraciones → Programa contable (API)\n- [ ] Empresa/PRO: input API key + guardar + status\n- [ ] BÁSICO/PYME: upsell/disabled' \
'- [ ] Solo Empresa/PRO puede guardar API key')"
create_issue "S1-07 — Frontend App: Integración “Programa contable vía API” (Empresa/PRO)" "feature,priority:P1,sprint:1,area:app,area:integrations" "Sprint 1 — AEAT Excel + Integración (guardar API key)" "$b"

# Sprint 2
b="$(build_body \
'Crear capas de mapeo e outbox para sincronización idempotente.' \
'Preparar base técnica de sync unidireccional.' \
'Prisma: IntegrationMap + SyncOutbox con índices y estados.' \
'Depends on S1-02' \
'- [ ] IntegrationMap\n- [ ] SyncOutbox\n- [ ] Índice (tenantId, provider, status, nextRunAt)' \
'- [ ] Migración aplicada y modelos accesibles')"
create_issue "S2-01 — Prisma: IntegrationMap + SyncOutbox" "feature,priority:P0,sprint:2,area:db,area:integrations" "Sprint 2 — Sync unidireccional (Empresa/PRO)" "$b"

b="$(build_body \
'Worker outbox con retries, backoff e idempotencia por hash.' \
'Procesar eventos sin duplicados y con trazabilidad.' \
'Implementar pipeline pending→processing→done/error + logs + gating por plan.' \
'Depends on S2-01' \
'- [ ] Worker y transición de estados\n- [ ] Retries con backoff\n- [ ] Hash idempotencia\n- [ ] SyncLog\n- [ ] Gating Empresa/PRO' \
'- [ ] Evento repetido no duplica\n- [ ] Error reintenta y queda log')"
create_issue "S2-02 — Backend: Worker Outbox + retries + idempotencia" "feature,priority:P0,sprint:2,area:backend,area:integrations" "Sprint 2 — Sync unidireccional (Empresa/PRO)" "$b"

b="$(build_body \
'Encolar eventos outbox al crear/actualizar entidades canónicas.' \
'Activar push unidireccional solo en planes permitidos.' \
'Emitir upsert en contacts/products/invoices/expenses con payload canónico.' \
'Depends on S2-02, S0-02' \
'- [ ] Encolar contacts\n- [ ] Encolar products\n- [ ] Encolar invoices\n- [ ] Encolar expenses\n- [ ] Payload canónico estable' \
'- [ ] Empresa/PRO crea factura -> pending\n- [ ] BÁSICO/PYME no genera outbox')"
create_issue "S2-03 — Backend: Encolar Outbox en contactos/productos/facturas/gastos (Empresa/PRO)" "feature,priority:P1,sprint:2,area:backend,area:integrations" "Sprint 2 — Sync unidireccional (Empresa/PRO)" "$b"

b="$(build_body \
'UI de estado de sincronización con logs, errores y reintentos.' \
'Operar y depurar sync desde panel.' \
'Página con filtros, badges de estado y acción de requeue.' \
'Depends on S2-02' \
'- [ ] Listado SyncLog + filtros\n- [ ] Indicadores synced/pending/error\n- [ ] Reintentar errores' \
'- [ ] Usuario Empresa/PRO puede reintentar desde UI')"
create_issue "S2-04 — Frontend App: Estado de sincronización (Empresa/PRO)" "feature,priority:P1,sprint:2,area:app,area:integrations" "Sprint 2 — Sync unidireccional (Empresa/PRO)" "$b"

# Sprint 3
b="$(build_body \
'Añadir entidades Quote y SyncConflict para bidireccionalidad controlada.' \
'Base de presupuestos y resolución de conflictos.' \
'Prisma: Quote, SyncConflict y entityType quote en IntegrationMap.' \
'Depends on S2-01' \
'- [ ] Modelo Quote\n- [ ] Modelo SyncConflict\n- [ ] IntegrationMap soporta quote' \
'- [ ] CRUD quote posible en backend')"
create_issue "S3-01 — Prisma: Quote + SyncConflict" "feature,priority:P0,sprint:3,area:db,area:integrations" "Sprint 3 — Presupuestos bidireccional + conflictos" "$b"

b="$(build_body \
'CRUD de presupuestos y acción convertir a factura.' \
'Completar flujo de ventas desde presupuesto hasta factura.' \
'Endpoints quote + transiciones de estado + convert-to-invoice.' \
'Depends on S3-01' \
'- [ ] GET/POST/PATCH /api/quotes\n- [ ] POST send/accept/reject\n- [ ] POST convert-to-invoice (+ outbox en Empresa/PRO)' \
'- [ ] Quote aceptado crea invoice sin perder líneas')"
create_issue "S3-02 — Backend: CRUD Quotes + Convert-to-invoice" "feature,priority:P0,sprint:3,area:backend" "Sprint 3 — Presupuestos bidireccional + conflictos" "$b"

b="$(build_body \
'Bidireccional de quotes con detección de conflictos both_modified.' \
'Evitar sobrescrituras silenciosas entre sistema y programa contable.' \
'Pull/push con source local|remote y endpoints de conflictos.' \
'Depends on S3-02, S2-02' \
'- [ ] Pull remoto -> upsert local\n- [ ] Push local -> remoto via outbox\n- [ ] Crear SyncConflict cuando ambos cambian\n- [ ] Endpoints list/resolve conflicts' \
'- [ ] Conflictos quedan open hasta resolución manual')"
create_issue "S3-03 — Backend: Sync bidireccional Quotes + conflictos (Empresa/PRO)" "feature,priority:P0,sprint:3,area:backend,area:integrations" "Sprint 3 — Presupuestos bidireccional + conflictos" "$b"

b="$(build_body \
'UI de Presupuestos y resolución de conflictos de sync.' \
'Cierre funcional del flujo bidireccional para usuarios Empresa/PRO.' \
'Listado/detalle de presupuestos, acciones y pantalla de conflictos con comparación.' \
'Depends on S3-03' \
'- [ ] Ventas -> Presupuestos (list + detail)\n- [ ] Acciones send/accept/reject/convert\n- [ ] UI conflictos con comparación y elección de versión' \
'- [ ] Usuario Empresa/PRO resuelve conflictos desde UI')"
create_issue "S3-04 — Frontend App: Presupuestos + UI Conflictos (Empresa/PRO)" "feature,priority:P1,sprint:3,area:app,area:integrations" "Sprint 3 — Presupuestos bidireccional + conflictos" "$b"

echo "OK. Modo: $MODE"
