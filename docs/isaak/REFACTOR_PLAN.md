# Isaak — Refactor Plan

**Última actualización**: 2026-06-04

Plan de reorganización + limpieza interna de `apps/isaak`, alineado con Plan H del master plan de ingeniería.

> Master plan estratégico: `docs/engineering/ISAAK_MASTER_PLAN.md` § Plan H.

## Principios

1. **Backwards-compat solo donde haya consumers externos** — el MCP Holded está en revisión, no se toca. El resto del código interno puede romper APIs sin avisos.
2. **El backup vive en `kiabusiness2025/verifactu-monorepo`** — el repo `kiabusiness2025/isaak` puede limpiarse sin miedo de perder histórico legacy.
3. **Cada sub-task entrega valor por sí mismo** — no hay big-bang refactor. Cada PR queda mergeable y producción sigue funcionando.

## Fase 3 — Reorganización del código

### Sub-task 3A — Reorganización de `apps/isaak/app/lib`

**Problema**: `app/lib/` tiene ~150 archivos en un solo directorio. Difícil de navegar.

**Acción**: dividir por dominio.

```
app/lib/
├── erp/              (Holded, ERPs sectoriales, factory) — temporal hasta 3F
├── aeat/             (Inspector, RAG, modelos, sede, mTLS)
├── company-intel/    (CompanyIntelligenceService + reglas + adapters)
├── chat/             (isaak-chat-stream, classifier, router, judge)
├── tools/            (isaak-tools-registry + cada tool file)
├── ledger/           (F9 ledger nativo + balances + audit)
├── auth/             (firebase admin, sessions, magic link)
├── billing/          (stripe checkout/portal/cancel)
├── integrations/     (google, microsoft, telegram, whatsapp)
├── banking/          (eb + salt-edge + reconcile)
├── artifacts/        (visual report, pdf/word/excel export)
└── ...
```

### Sub-task 3B — Split components

`apps/isaak/app/components/` tiene componentes que crecieron orgánicamente. Romper los más grandes (`IsaakChatSection`, `IsaakArtifactPanel`, `AdvisorDashboardClient`) en sub-componentes por feature.

### Sub-task 3C — Factory de modelos AEAT

Cada modelo (303/130/111/115/180/190/347/349) tiene su propio set draft/submit/export. Crear `app/lib/aeat/models/factory.ts` con interfaz común `TaxModelGenerator` y un registry — añadir un modelo nuevo (e.g. 202, 200) debería ser registrar adapter, no replicar route.

### Sub-task 3D — Test coverage

Subir cobertura unit + integración al 70% en módulos críticos:

- Inspector AEAT (51 reglas) — golden tests por regla.
- Company Intelligence (9 reglas, normalizers, scoring) — ya en 88 tests, mantener.
- Ledger F9 — hash chain + repo + importers.
- Modelos AEAT — golden tests por modelo con dataset Nova Gestión.

### Sub-task 3E — AEAT rules a JSON

Hoy las 51 reglas Inspector + 9 CI están en código TS. Migrar el cuerpo de cada regla a JSON declarativo (condición + severidad + mensaje + scope) — el motor lo carga, la lógica que no se puede expresar declarativa queda en TS pero referenciada por ID.

Ventaja: añadir/ajustar reglas sin redeploy de código.

### Sub-task 3F — Extraer `packages/erp-abstraction`

**Objetivo**: el monorepo gana un package `packages/erp-abstraction` que centraliza la abstracción multi-ERP. `apps/isaak` y `apps/isaak-mcp` (cuando exista) consumen este package en lugar de tener adapters dispersos en `app/lib/`.

**Contenido del package**:

```
packages/erp-abstraction/
├── src/
│   ├── types/
│   │   ├── canonical-contact.ts
│   │   ├── canonical-document.ts
│   │   ├── canonical-ledger-entry.ts
│   │   ├── canonical-account.ts
│   │   └── capabilities.ts          (ErpCapability flags)
│   ├── adapters/
│   │   ├── holded/
│   │   ├── hotelgest/
│   │   ├── revo/
│   │   ├── loyverse/
│   │   ├── woocommerce/
│   │   ├── prestashop/
│   │   ├── mindbody/
│   │   ├── inmovilla/
│   │   ├── nubimed/
│   │   ├── ledger/                  (ledger nativo F9 como adapter)
│   │   ├── enable-banking/
│   │   └── salt-edge/
│   ├── factory.ts                   (createErpClient({ provider, credentials }))
│   ├── erp-client.ts                (interface canónico)
│   └── index.ts
├── tests/
└── package.json
```

**Pasos** (PR por adapter, no big-bang):

1. Crear scaffolding `packages/erp-abstraction` con `ErpClient` + tipos canónicos + factory vacía.
2. Migrar `holded-erp-client.ts` → `adapters/holded/` + test parity.
3. Por cada sectorial, repetir: migrar adapter → test parity → eliminar archivo viejo.
4. `apps/isaak` re-importa desde `@verifactu/erp-abstraction`.
5. Eliminar `app/lib/erp-client*.ts` y archivos sectoriales sueltos.
6. Auditar que la única lógica fuera del package es el wiring de credenciales (encrypt/decrypt).

**Capability flags por adapter**:

```ts
interface ErpCapabilities {
  readContacts: boolean;
  readSalesDocuments: boolean;
  readPurchaseDocuments: boolean;
  readDocumentPdf: boolean;
  readAccounts: boolean;
  readLedger: boolean;
  createInvoiceDraft: boolean;
  createInvoiceFinal: boolean;
  webhookEvents: ErpWebhookEvent[];
}
```

El chat route y los LLM tools consultan capabilities antes de exponer una acción al modelo — si un sectorial no soporta `createInvoiceDraft`, esa tool no se muestra para tenants con ese backend.

## Fase 4 — Limpieza de repo

### 4.1 — Frozen connectors

`apps/holded-mcp/` y `apps/app/api/mcp/holded/` siguen en revisión Anthropic/OpenAI. Documentar como frozen en README de cada app + en `CLAUDE.md` global. **Ninguna PR puede tocarlos sin aprobación explícita**.

### 4.2 — Chift suspendido

- Mover `apps/isaak/app/lib/chift-client.ts` + `chift-erp-client.ts` + rutas `/api/isaak/chift/*` + workspace page `(workspace)/chift/page.tsx` a `docs/legacy/CHIFT_ARCHIVE/` como referencia.
- Eliminar imports + entradas `'chift'` en el `ErpProvider` enum.
- Eliminar sección Chift de `IsaakHomeLanding.tsx`.

### 4.3 — Consolidación landing

Hoy hay 3 surfaces landing: `apps/landing` (Verifactu), `apps/holded` (Holded Connectors), `apps/isaak/app/p/[slug]` (Isaak Público). Evaluar consolidación bajo un solo target con sub-rutas. Pendiente decisión.

### 4.4 — Secrets

- Rotar `HOLDED_TEST_API_KEY` post-aprobación OpenAI/Anthropic.
- Auditar `git log -p | grep -E '(token|key|secret|PAT)'` para confirmar que ningún PAT GitHub o API key Holded quedó en histórico.
- Verificar que `CERT_MASTER_KEY` y `HOLDED_KEY_SECRET` sólo viven como env vars Vercel.

### 4.5 — Docs orphans

`docs/` tiene archivos sueltos sin index claro. Definir política única en `docs/README.md`:

- `docs/engineering/` — planes técnicos vivos.
- `docs/product/` — planes de producto.
- `docs/isaak/` — docs específicas del producto Isaak.
- `docs/openai-submission/` + `docs/anthropic-submission/` — compliance MCP.
- `docs/ops/` — runbooks operacionales.
- `docs/legacy/` — todo lo histórico (Chift archive, V2 deprecated, etc.).

### 4.6 — Tests E2E MCP

Cuando arranque `apps/isaak-mcp` (Plan H.2), replicar el harness `scripts/test-*.sh` que ya existe en `apps/holded-mcp/` — golden tests sobre los 10 tools del connector con respuestas snapshot.

## Orden recomendado de ejecución

| Sprint | Sub-task                                          | Dependencia |
| ------ | ------------------------------------------------- | ----------- |
| R1     | 3F.1 — scaffolding `packages/erp-abstraction`     | —           |
| R1     | 4.2 — eliminar Chift code path                    | —           |
| R1     | 4.4 — auditoría secrets                           | —           |
| R2     | 3F.2 — migrar Holded adapter                      | R1          |
| R2     | 3A — reorganizar `app/lib` por dominio            | —           |
| R3     | 3F.3 — migrar adapters sectoriales (uno por PR)   | R2          |
| R3     | 3B — split components grandes                     | —           |
| R4     | 3C — factory modelos AEAT                         | 3A          |
| R4     | 3D — subir test coverage                          | —           |
| R5     | 3E — AEAT rules → JSON                            | 3D          |
| R5     | 4.5 — docs orphans + policy `docs/README.md`      | —           |
| Cuando | 4.1 — documentar frozen connectors                | Hoy mismo   |
| Cuando | 4.3 — consolidación landing                       | Decisión    |
| Cuando | 4.6 — tests E2E Isaak MCP                         | Plan H.2    |
