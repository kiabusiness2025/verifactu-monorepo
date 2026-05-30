# E2E — Verifactu Business

Suite de tests end-to-end con Playwright que prueba los flujos de auth, formularios y endpoints contra los dev servers reales (`apps/landing` puerto 3001, `apps/isaak` puerto 3012).

## Correr local

```bash
# 1. Stubs de Firebase para que la UI cargue sin pegar a Firebase real
cp e2e/.env.local.example apps/landing/.env.local
echo "NEXT_PUBLIC_ISAAK_V1_LAUNCH=true" > apps/isaak/.env.local

# 2. Arrancar ambos servers en otra terminal
pnpm --filter verifactu-landing dev &
pnpm --filter verifactu-isaak dev &

# 3. Esperar a que ambos respondan y correr la suite
node e2e/auth-flows.mjs
node e2e/landing-flows.mjs
```

Los stubs hacen que `isFirebaseConfigComplete` sea `true` y la UI cargue. Los endpoints fallan en último paso (sin claves reales de Firebase Admin ni Resend) — el test verifica que la **validación previa funciona** (whitelist de origen, regex de email, shape del form).

## Tests incluidos

| Script | Verifica |
|---|---|
| `auth-flows.mjs` | `/auth/isaak` carga con Google + Microsoft + magic link · POST `/api/auth/magic-link` acepta `isaak.chat` (status 503 vs 400) · click Google dispara error de Firebase legible |
| `landing-flows.mjs` | Pricing menciona "Requiere licencia de Holded" · FAQ enlaza a holded.com · Form `/api/holded-trial` valida nombre/email/size · Badge "Holded Solution Partner" visible |

## CI

El workflow `.github/workflows/e2e.yml` permite disparar la suite manualmente (`workflow_dispatch`) o nightly. No se corre en cada PR para no añadir 5-8min al ciclo.

## Por qué Playwright

- Reusa el Chromium 1194 ya instalado en el entorno (`/opt/pw-browsers/chromium-1194`).
- `bypassCSP: true` en el contexto evita que la CSP de dev (que bloquea `unsafe-eval` necesario para HMR) tumbe los tests.
- Captura console errors + network requests para diagnóstico cuando algo falla.
