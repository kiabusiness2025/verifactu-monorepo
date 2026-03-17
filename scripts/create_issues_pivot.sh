#!/usr/bin/env bash
set -euo pipefail

create () {
  local title="$1"
  local labels="$2"
  local milestone="$3"
  local body="$4"

  gh issue create \
    --title "$title" \
    --label "$labels" \
    --milestone "$milestone" \
    --body "$body"
}

echo "==> Repo: $(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "==> Listando plantillas de Issues..."
if [ -d ".github/ISSUE_TEMPLATE" ]; then
  ls -la .github/ISSUE_TEMPLATE
else
  echo "WARN: No existe .github/ISSUE_TEMPLATE en esta ruta. ¿Estás en la raíz del repo?"
fi

echo "==> Buscando cheatsheet..."
if [ -f "docs/GITHUB_CHEATSHEET.md" ]; then
  echo "Encontrado: docs/GITHUB_CHEATSHEET.md"
  echo "----"
  sed -n '1,200p' docs/GITHUB_CHEATSHEET.md
  echo "----"
else
  echo "WARN: No existe docs/GITHUB_CHEATSHEET.md"
fi

echo "==> Sugerencia: usar milestones para sprints"
echo "Milestones a crear:"
cat <<'EOF'
- Sprint 0 — Planes + Copy + Flags
- Sprint 1 — AEAT Excel + Integración (guardar API key)
- Sprint 2 — Sync unidireccional (Empresa/PRO)
- Sprint 3 — Presupuestos bidireccional + conflictos (Empresa/PRO)
EOF

# Milestones
(gh api repos/:owner/:repo/milestones -f title="Sprint 0 — Planes + Copy + Flags" >/dev/null) || true
(gh api repos/:owner/:repo/milestones -f title="Sprint 1 — AEAT Excel + Integración (guardar API key)" >/dev/null) || true
(gh api repos/:owner/:repo/milestones -f title="Sprint 2 — Sync unidireccional (Empresa/PRO)" >/dev/null) || true
(gh api repos/:owner/:repo/milestones -f title="Sprint 3 — Presupuestos bidireccional + conflictos (Empresa/PRO)" >/dev/null) || true

# Labels
(gh label create "area:web" --color "1D76DB") || true
(gh label create "area:app" --color "1D76DB") || true
(gh label create "area:backend" --color "1D76DB") || true
(gh label create "area:db" --color "1D76DB") || true
(gh label create "area:integrations" --color "1D76DB") || true

(gh label create "sprint:0" --color "C2E0C6") || true
(gh label create "sprint:1" --color "C2E0C6") || true
(gh label create "sprint:2" --color "C2E0C6") || true
(gh label create "sprint:3" --color "C2E0C6") || true

(gh label create "priority:P0" --color "B60205") || true
(gh label create "priority:P1" --color "D93F0B") || true

(gh label create "feature" --color "5319E7") || true
(gh label create "enhancement" --color "84B6EB") || true
(gh label create "tech-debt" --color "FBCA04") || true

# Sprint 0
create \
  "S0-01 — Eliminar menciones a marcas y dejar copy genérico" \
  "feature,priority:P0,sprint:0,area:web,area:app" \
  "Sprint 0 — Planes + Copy + Flags" \
$'## Contexto\nEliminar referencias a marcas en web/app. Usar copy genérico: “Integración con tu programa de contabilidad vía API”.\n\n## Tasks\n- [ ] Buscar y eliminar strings: Holded/holded y equivalentes\n- [ ] Sustituir por copy genérico (web + app)\n- [ ] Revisar landing, /planes, /integraciones, app Integraciones, tooltips, emails/plantillas, docs\n\n## Acceptance Criteria\n- [ ] Búsqueda global de “Holded/holded” devuelve 0 resultados en código y textos visibles\n\n## Dependencies\n- None\n'

create \
  "S0-02 — Actualizar matriz de planes y feature flags" \
  "feature,priority:P0,sprint:0,area:web,area:app,area:backend" \
  "Sprint 0 — Planes + Copy + Flags" \
$'## Contexto\nExport AEAT (Excel) disponible en TODOS los planes. Integración contable vía API solo en Empresa/PRO.\n\n## Tasks\n- [ ] Implementar flags:\n  - [ ] canExportAeatBooks=true en todos los planes\n  - [ ] canUseAccountingApiIntegration=true solo Empresa/PRO\n  - [ ] canBidirectionalQuotes=true solo Empresa/PRO\n- [ ] Web pública: tabla de planes\n  - [ ] Todos: “Libros oficiales (Excel) compatibles AEAT”\n  - [ ] Empresa/PRO: “Integración con tu programa de contabilidad vía API”\n- [ ] App: aplicar gating según flags\n\n## Acceptance Criteria\n- [ ] Tenant BÁSICO exporta AEAT Excel y NO puede conectar API\n- [ ] Tenant Empresa/PRO puede conectar API\n\n## Dependencies\n- Blocked by: S0-01\n'

# Sprint 1
create \
  "S1-01 — Prisma: TenantProfile (perfil fiscal mínimo)" \
  "feature,priority:P1,sprint:1,area:db" \
  "Sprint 1 — AEAT Excel + Integración (guardar API key)" \
$'## Contexto\nAñadir perfil fiscal mínimo para aceptar todo tipo de empresa sin hardcodear “autónomo/SL”.\n\n## Tasks\n- [ ] Crear modelo TenantProfile (country, taxId, legalName, tradeName?, fiscalAddress JSON, taxRegime?)\n- [ ] Migración + backfill razonable\n\n## Acceptance Criteria\n- [ ] Tenant puede almacenar perfil fiscal sin forzar tipo de empresa\n\n## Dependencies\n- None\n'

create \
  "S1-02 — Prisma: TenantIntegration genérica + SyncLog" \
  "feature,priority:P1,sprint:1,area:db,area:backend,area:integrations" \
  "Sprint 1 — AEAT Excel + Integración (guardar API key)" \
$'## Contexto\nBase de integración contable genérica (provider=accounting_api) + logs. Sin sincronización aún.\n\n## Tasks\n- [ ] Crear TenantIntegration (apiKeyEnc, status, lastSyncAt, lastError)\n- [ ] Crear SyncLog\n- [ ] Cifrado apiKeyEnc (env var/wrapper existente)\n\n## Acceptance Criteria\n- [ ] Empresa/PRO puede guardar API key cifrada y ver status\n\n## Dependencies\n- None\n'

create \
  "S1-03 — Prisma: Extender Expense para clasificación fiscal/export" \
  "enhancement,priority:P1,sprint:1,area:db,area:backend" \
  "Sprint 1 — AEAT Excel + Integración (guardar API key)" \
$'## Contexto\nAñadir campos para export AEAT robusto y soportar gastos “no factura”.\n\n## Tasks\n- [ ] Expense.docType (invoice/ticket/receipt/bank_fee/payroll/other)\n- [ ] Expense.taxCategory (iva_deducible/iva_no_deducible/suplido/exento/...)\n- [ ] Expense.aeatConcept / Expense.aeatKey (opcionales)\n\n## Acceptance Criteria\n- [ ] Gasto confirmado guarda docType/taxCategory y se refleja en export\n\n## Dependencies\n- None\n'

create \
  "S1-04 — Backend: Export libros AEAT (Excel) ventas/recibidas" \
  "feature,priority:P0,sprint:1,area:backend" \
  "Sprint 1 — AEAT Excel + Integración (guardar API key)" \
$'## Contexto\nGenerar Excel descargable para libros de ventas y recibidas para TODOS los planes.\n\n## Endpoints\n- GET /api/aeat/books/sales?from&to&format=xlsx\n- GET /api/aeat/books/purchases?from&to&format=xlsx\n\n## Tasks\n- [ ] Dataset canónico (ventas/gastos)\n- [ ] XLSX estable + columna warnings si faltan datos\n- [ ] Tests (IVA, exento, no deducible, suplidos, no-factura)\n\n## Acceptance Criteria\n- [ ] Cualquier plan descarga XLSX sin errores fatales; warnings en filas incompletas\n\n## Dependencies\n- Depends on: S1-03\n'

create \
  "S1-05 — Backend: Export 303/130 + preview (Excel)" \
  "feature,priority:P1,sprint:1,area:backend" \
  "Sprint 1 — AEAT Excel + Integración (guardar API key)" \
$'## Contexto\nEndpoints de export e información previa (preview) para 303/130.\n\n## Endpoints\n- GET /api/aeat/export/303?period&format=xlsx\n- GET /api/aeat/export/130?period&format=xlsx\n- GET /api/aeat/preview/303?period\n- GET /api/aeat/preview/130?period\n\n## Tasks\n- [ ] Preview con totales\n- [ ] Export coherente con preview\n\n## Acceptance Criteria\n- [ ] Preview coincide con export (totales)\n\n## Dependencies\n- Depends on: S1-04\n'

create \
  "S1-06 — App: Pantalla Impuestos (export AEAT Excel para todos)" \
  "feature,priority:P0,sprint:1,area:app" \
  "Sprint 1 — AEAT Excel + Integración (guardar API key)" \
$'## Contexto\nUI para exportar 303/130 y/o libros, disponible en todos los planes.\n\n## Tasks\n- [ ] Menú Impuestos (303/130)\n- [ ] Selector periodo + export XLSX\n- [ ] Mostrar preview\n\n## Acceptance Criteria\n- [ ] Usuario BÁSICO puede exportar desde UI\n\n## Dependencies\n- Depends on: S1-05\n'

create \
  "S1-07 — App: Integración Programa contable (API) (solo Empresa/PRO)" \
  "feature,priority:P1,sprint:1,area:app,area:integrations" \
  "Sprint 1 — AEAT Excel + Integración (guardar API key)" \
$'## Contexto\nPantalla para conectar API key (sin sync en Sprint 1). Sin menciones de marcas.\n\n## Tasks\n- [ ] Pantalla Integraciones → Programa contable (API)\n- [ ] Empresa/PRO: guardar API key + status\n- [ ] BÁSICO/PYME: upsell/disabled\n\n## Acceptance Criteria\n- [ ] Solo Empresa/PRO puede guardar API key\n\n## Dependencies\n- Depends on: S1-02, S0-02\n'

# Sprint 2
create \
  "S2-01 — Prisma: IntegrationMap + SyncOutbox" \
  "feature,priority:P0,sprint:2,area:db,area:integrations" \
  "Sprint 2 — Sync unidireccional (Empresa/PRO)" \
$'## Contexto\nAñadir mapeo remoto/local e outbox para sync.\n\n## Tasks\n- [ ] Crear IntegrationMap (hash, lastPushedAt)\n- [ ] Crear SyncOutbox (status/attempts/nextRunAt + índices)\n\n## Acceptance Criteria\n- [ ] Migración aplicada\n\n## Dependencies\n- Depends on: S1-02\n'

create \
  "S2-02 — Backend: Worker Outbox + retries + idempotencia (Empresa/PRO)" \
  "feature,priority:P0,sprint:2,area:backend,area:integrations" \
  "Sprint 2 — Sync unidireccional (Empresa/PRO)" \
$'## Contexto\nProcesar outbox con reintentos, idempotencia y logs.\n\n## Tasks\n- [ ] Worker pending→done/error\n- [ ] Backoff retries\n- [ ] Hash idempotencia\n- [ ] Escribir SyncLog\n- [ ] Gating Empresa/PRO\n\n## Acceptance Criteria\n- [ ] No duplica; errores reintentan\n\n## Dependencies\n- Depends on: S2-01\n'

create \
  "S2-03 — Backend: Encolar outbox en contactos/productos/facturas/gastos (Empresa/PRO)" \
  "feature,priority:P1,sprint:2,area:backend,area:integrations" \
  "Sprint 2 — Sync unidireccional (Empresa/PRO)" \
$'## Contexto\nEmitir eventos outbox al crear/actualizar entidades canónicas.\n\n## Tasks\n- [ ] contacts/products/invoices/expenses → outbox upsert\n- [ ] Payload canónico estable\n- [ ] Gating Empresa/PRO\n\n## Acceptance Criteria\n- [ ] Empresa/PRO crea factura → outbox pending\n- [ ] BÁSICO/PYME no crea outbox\n\n## Dependencies\n- Depends on: S2-02, S0-02\n'

create \
  "S2-04 — App: Estado de sincronización (Empresa/PRO)" \
  "feature,priority:P1,sprint:2,area:app,area:integrations" \
  "Sprint 2 — Sync unidireccional (Empresa/PRO)" \
$'## Contexto\nUI de logs/errores y reintentos de sincronización.\n\n## Tasks\n- [ ] Lista SyncLog + filtros\n- [ ] Badges synced/pending/error\n- [ ] Reintentar errores\n\n## Acceptance Criteria\n- [ ] Usuario Empresa/PRO puede reintentar desde UI\n\n## Dependencies\n- Depends on: S2-02\n'

# Sprint 3
create \
  "S3-01 — Prisma: Quote + SyncConflict" \
  "feature,priority:P0,sprint:3,area:db,area:integrations" \
  "Sprint 3 — Presupuestos bidireccional + conflictos (Empresa/PRO)" \
$'## Contexto\nAñadir presupuestos y conflictos para bidireccional.\n\n## Tasks\n- [ ] Crear Quote\n- [ ] Crear SyncConflict\n- [ ] entityType quote en IntegrationMap\n\n## Acceptance Criteria\n- [ ] CRUD quotes posible\n\n## Dependencies\n- Depends on: S2-01\n'

create \
  "S3-02 — Backend: CRUD Quotes + convert-to-invoice" \
  "feature,priority:P0,sprint:3,area:backend" \
  "Sprint 3 — Presupuestos bidireccional + conflictos (Empresa/PRO)" \
$'## Contexto\nEndpoints de presupuestos y conversión a factura.\n\n## Tasks\n- [ ] CRUD + acciones send/accept/reject\n- [ ] convert-to-invoice crea invoice local + outbox (Empresa/PRO)\n\n## Acceptance Criteria\n- [ ] Quote aceptado → factura creada correctamente\n\n## Dependencies\n- Depends on: S3-01\n'

create \
  "S3-03 — Backend: Sync bidireccional Quotes + conflictos (Empresa/PRO)" \
  "feature,priority:P0,sprint:3,area:backend,area:integrations" \
  "Sprint 3 — Presupuestos bidireccional + conflictos (Empresa/PRO)" \
$'## Contexto\nBidireccional de presupuestos con resolución manual.\n\n## Tasks\n- [ ] Pull quotes remoto + upsert local\n- [ ] Push quotes local vía outbox\n- [ ] Detectar both_modified → SyncConflict open\n- [ ] Endpoints list/resolve conflicts\n\n## Acceptance Criteria\n- [ ] Conflictos no pisan datos; requieren resolución\n\n## Dependencies\n- Depends on: S3-02, S2-02\n'

create \
  "S3-04 — App: Presupuestos + UI Conflictos (Empresa/PRO)" \
  "feature,priority:P1,sprint:3,area:app,area:integrations" \
  "Sprint 3 — Presupuestos bidireccional + conflictos (Empresa/PRO)" \
$'## Contexto\nUI de presupuestos y pantalla de conflictos.\n\n## Tasks\n- [ ] Ventas → Presupuestos (list + detail)\n- [ ] Acciones + convertir a factura\n- [ ] UI Conflictos (comparar y elegir versión)\n\n## Acceptance Criteria\n- [ ] Usuario Empresa/PRO resuelve conflictos desde UI\n\n## Dependencies\n- Depends on: S3-03\n'

echo "==> Done. Revisa la salida para links de issues creados."
