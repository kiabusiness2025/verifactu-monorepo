# Verifactu Monorepo — Memoria del proyecto

## Apps

- **`apps/isaak`** — Producto principal: copiloto fiscal y contable IA (`isaak.verifactu.business` / `isaak.app`)
- **`apps/holded-mcp`** — Conector Claude.ai (MCP) — **🔒 NO TOCAR** (en revisión Anthropic)
- **`apps/app`** — Conector ChatGPT — **🔒 NO TOCAR** rutas `/api/mcp` (en revisión OpenAI)
- **`apps/api`** — API Verifactu (registro AEAT, certs mTLS)
- **`apps/landing`** — Landing público + pricing
- **`apps/holded`** — Site Holded Connectors

## Reglas críticas

- **MCP connectors** (`apps/holded-mcp` y `apps/app/api/mcp`) están en revisión OpenAI/Anthropic. **Nada de tools nuevas, cambios de URL, ni cambios de comportamiento** hasta aprobación.
- **PAT de GitHub** se pasa solo como `https://x-access-token:<PAT>@github.com/...` en el push URL. **Nunca** en commits, PR bodies, código ni artefactos del repo.
- **El identificador del modelo** (`claude-opus-4-7[1m]` etc.) **nunca** se incluye en commits, PRs ni código.

## Plan Maestro

- **Ingeniería**: `docs/engineering/ISAAK_MASTER_PLAN.md`
- **Producto**: `docs/product/ISAAK_MASTER_PLAN.md`
- **Sesiones de trabajo**: `docs/engineering/sessions/`

## Stack

- Next.js 15 (App Router) · Prisma + Postgres · Tailwind · Vercel
- IA: Anthropic Claude (primario) + OpenAI GPT (fallback automático)
- Auth: Firebase Admin + cookies httpOnly de sesión
- Email: Resend
- Pagos: Stripe (4 planes: Free/Starter/Pro/Business)

## Integraciones operativas

| Integración | Estado | Notas |
|---|---|---|
| Holded (ERP directo) | ✅ Producción | API key cifrada AES-256-GCM |
| Google (Calendar/Gmail/Drive) | ✅ Producción | OAuth, 8 LLM tools |
| Microsoft 365 (Outlook/Calendar/OneDrive) | ✅ Producción | OAuth multi-tenant, 9 LLM tools |
| Stripe billing | ✅ Producción | 4 planes + portal cliente |
| Verifactu (AEAT SOAP mTLS) | ✅ Producción | P12 → PEM-JSON cifrado |
| Salt Edge (Open Banking) | ✅ Producción | Fallback no-PSD2 |
| **Enable Banking (PSD2 AIS)** | ✅ Producción (2026-05-23) | App prod `73fbe5d2-b322-4d71-ba5d-223be78df437` |
| WhatsApp Business | ✅ Producción | Phone `1068988046305906` |
| Chift (ERP aggregator) | 🔄 Bloqueado | Pendiente activación cuenta Chift |
| GoCardless BD | ⚠️ Sunset | Cerró nuevos registros → migrado a Enable Banking |

## Convenciones

- **Migraciones Prisma** se aplican automáticamente en Vercel build via `prisma migrate deploy`
- **Crons Vercel** invocan **GET** (no POST) → todas las rutas cron exportan `GET` con auth via `CRON_SECRET`
- **Secretos** se cifran con AES-256-GCM usando `CERT_MASTER_KEY` (certs) o `HOLDED_KEY_SECRET` (API keys)
- **Banking discriminator**: `SeConnection.provider ∈ {'saltedge', 'gcbd', 'enablebanking'}`
- **Banking transaction ID**: `entry_reference` (NO `transaction_id` que es session-scoped)

## Entorno remoto (Claude Code on the web)

- Contenedor efímero — todo lo no commiteado se pierde
- Sin acceso a `gh` CLI → usar `mcp__github__*` o `curl` con PAT
- Push: `git push https://x-access-token:<PAT>@github.com/kiabusiness2025/verifactu-monorepo.git <branch>`
