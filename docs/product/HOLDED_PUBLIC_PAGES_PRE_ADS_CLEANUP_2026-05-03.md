# Holded public pages pre-ads cleanup - 2026-05-03

## Alcance revisado

- `https://verifactu.business`
- `https://holded.verifactu.business/`
- `https://holded.verifactu.business/conectores`
- `https://holded.verifactu.business/conectores/claude`
- `https://holded.verifactu.business/conectores/chatgpt`

## Cambios aplicados

- `apps/holded` ya publica `robots.txt` con sitemap canonico.
- `apps/holded` elimina el canonical global a `/conectores`; cada pagina clave mantiene su canonical propio.
- `apps/holded` amplia `sitemap.ts` con root, legales, soporte, demo y rutas canonicas de conectores.
- `apps/holded` alinea privacidad/terminos genericos con ChatGPT y Claude, no solo ChatGPT.
- `scripts/qa-holded-landings.mjs` valida la landing Claude con tools Claude (`list_documents`) y no con nomenclatura ChatGPT.
- `apps/holded` tests de handoff OAuth quedan alineados con el dominio publico `holded.verifactu.business`.
- `apps/holded-mcp` tests y HTML de iconos quedan alineados con `favicon.ico` real (`image/x-icon`).
- `apps/app` cambia el preset publico por defecto a `holded_public_campaign_v1`, limitado a facturas, contactos, cuentas, diario y borrador de factura.
- `apps/app` mantiene `holded_priority1`, `openai_review_v2`, `holded_phase2_accounting`, `readonly`, `invoicing_accounting` y `full` como presets explicitos.
- `apps/app` corrige rutas `api/v1/invoices/[id]/*` al contrato `params: Promise<...>` requerido por Next 15.

## Verificacion local

- `pnpm --filter verifactu-holded test -- --runInBand` -> OK, 79 tests.
- `pnpm --filter verifactu-holded build` -> OK.
- `pnpm --filter verifactu-landing build` -> OK.
- `pnpm --filter holded-mcp-server test` -> OK, 17 tests.
- `pnpm --filter holded-mcp-server build` -> OK.
- `pnpm --filter holded-mcp-server validate-branding` -> OK, 34 checks.
- `pnpm holded:qa:landings -- --base-url=https://holded.verifactu.business` -> OK en desktop y mobile contra produccion actual.
- `pnpm --filter verifactu-app test -- --runInBand lib/oauth/mcp.test.ts lib/integrations/holdedMcpScopes.test.ts app/api/mcp/holded/route.test.ts` -> OK, 24 tests.
- `pnpm --filter verifactu-app test -- --runInBand lib/integrations/holdedMcpTools.test.ts` -> OK, 30 tests.
- `pnpm --filter verifactu-app build` -> OK.
- `node scripts/check-text-encoding.js apps/holded apps/holded-mcp apps/app/README.md docs/openai-submission docs/product` -> OK.

## Pendientes antes de publicidad

- Renovar el certificado SSL de `https://verifactu.business`; el 2026-05-03 sigue fallando con `SEC_E_CERT_EXPIRED`.
- Desplegar los cambios y verificar que `https://holded.verifactu.business/robots.txt` deja de responder 404.
- Tras deploy de `apps/app`, verificar que `POST /api/mcp/holded` `tools/list` anonimo devuelve solo el preset `holded_public_campaign_v1`.
- Configurar `OPENAI_APPS_CHALLENGE` si OpenAI lo exige para la verificacion publica.
- Revisar las imagenes eliminadas localmente en `apps/holded/public/assistant/`; estan referenciadas por onboarding.
- Resolver vulnerabilidades de `pnpm audit --prod --audit-level high` antes de una campana de pago sostenida; el 2026-05-03 siguen saliendo 42 vulnerabilidades: 2 critical, 20 high, 19 moderate y 1 low.
