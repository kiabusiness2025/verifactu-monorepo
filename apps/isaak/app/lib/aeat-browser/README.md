# AEAT Browser — Envío automático modelo 303 a AEAT

Foundation v1 para automatizar la presentación del modelo 303 a AEAT
vía navegador headless (Playwright). Decisión arquitectónica: AEAT no
publica WSDL público para "presentación de declaraciones tributarias"
del 303, así que la única vía de automatización (sin acuerdo de
gestoría colaboradora con AEAT) es navegador automatizado.

## Arquitectura

```
┌─────────────────┐     ┌────────────────────┐     ┌──────────────┐
│ User confirma   │ →   │ IsaakAeatSubmission │ →   │ Worker       │
│ borrador 303    │     │ (status=pending)    │     │ (Playwright) │
└─────────────────┘     └────────────────────┘     └──────────────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │ Portal AEAT  │
                                                   │ (sede)       │
                                                   └──────────────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │ CSV justific.│
                                                   │ → audit-log  │
                                                   └──────────────┘
```

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `index.ts` | `submitModelo303(input, adapter)` — orquestador puro. Parsers de CSV/errores AEAT. |
| `adapters/mock.ts` | `MockBrowserAdapter` — para tests, simula respuestas. |
| `adapters/playwright-stub.ts` | `PlaywrightBrowserAdapter` — stub con selectores TODO. |
| `submission-worker.ts` | `processPendingSubmissions()` — lee `pending_aeat` de DB, procesa batch. |

## Limitaciones de v1

1. **Vercel serverless NO puede correr Playwright** (~300MB con
   binarios). El worker debe correr en un host con disco persistente.
2. **Selectores AEAT no validados** — el `PlaywrightBrowserAdapter`
   tiene los URLs pero los selectores son guesses. Requiere acceso a
   pre-producción AEAT para inspeccionar el DOM real.
3. **AEAT puede cambiar el portal** sin aviso. Mantenimiento continuo
   esperado.
4. **Cert mTLS via Playwright**: usa `clientCertificates` en
   `browser.newContext()`. Requiere Playwright ≥ 1.46.
5. **Solo modelo 303** en v1. Los otros modelos siguen el mismo patrón
   pero requieren un nuevo adapter (mismo concepto, distinta página).

## Cómo deployar el worker

### Opción A: Local CLI (para el pilot inicial)

```bash
# Una sola vez:
pnpm add -D playwright
npx playwright install chromium

# Cada vez que quieras procesar pendientes:
AEAT_ENVIRONMENT=pre CERT_MASTER_KEY=... DATABASE_URL=... \
  pnpm tsx apps/isaak/app/lib/aeat-browser/cli.ts
```

(El `cli.ts` no está implementado todavía — es la siguiente iteración.)

### Opción B: Cloud Run / Fly.io

1. Dockerfile basado en Playwright official image:
   ```dockerfile
   FROM mcr.microsoft.com/playwright:v1.48.0-jammy
   WORKDIR /app
   COPY . .
   RUN pnpm install
   CMD ["pnpm", "tsx", "apps/isaak/app/lib/aeat-browser/cli.ts"]
   ```
2. Cron en Cloud Run Scheduler que invoque cada N minutos.

### Opción C: GitHub Actions (cron)

Workflow en `.github/workflows/aeat-submission-worker.yml`:

```yaml
on:
  schedule:
    - cron: '*/15 * * * *'
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: npx playwright install chromium
      - run: pnpm tsx apps/isaak/app/lib/aeat-browser/cli.ts
        env:
          CERT_MASTER_KEY: ${{ secrets.CERT_MASTER_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          AEAT_ENVIRONMENT: pre
```

## Variables de entorno

| Var | Default | Uso |
|---|---|---|
| `AEAT_SUBMISSION_WORKER_ENABLED` | `false` | Activa el cron worker. Solo `true` cuando estés listo. |
| `AEAT_ENVIRONMENT` | `pre` | `pre` (sandbox) o `prod`. |
| `AEAT_WORKER_BATCH_SIZE` | `5` | Cuántas submissions procesa por corrida. |
| `CERT_MASTER_KEY` | (obligatorio) | AES-256 key (64-char hex) para descifrar P12. |

## Tests

Cobertura completa con `MockBrowserAdapter` — orquestación, parsers,
status promotion, error handling. **NO tests contra AEAT real** desde
el repo (requeriría credenciales sandbox).

## Disclaimer legal

La automatización del portal AEAT usando el certificado del propio
contribuyente es legítima — no estás suplantando a nadie. Pero conviene
revisar los términos de uso del portal AEAT antes de uso a gran
escala. Para volúmenes altos, lo correcto es solicitar acuerdo de
colaboración como gestoría → autorización al "Servicio Web de
Presentación de Declaraciones Masivas".
