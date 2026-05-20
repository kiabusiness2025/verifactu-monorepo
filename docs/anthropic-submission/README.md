# Anthropic Connectors Directory — Submission Package

**Connector:** Holded for Claude
**App name (Anthropic form):** `Holded for Claude`
**Submitter:** Verifactu Business
**Email de contacto:** soporte@verifactu.business
**Email de escalation Anthropic:** partnerships@anthropic.com
**Form URL:** https://claude.com/docs/connectors/building/submission (la página linkea al Google Form actual)

## ⚠️ Submission v2 desde nuevo subdominio (2026-05-19)

Esta es una **nueva entrada** en el Anthropic Connectors Directory, con un subdominio nuevo (`holded-claude.verifactu.business`) y un nombre de app nuevo (`Holded for Claude`). **No es un update de la submission v1 — es una entry paralela.**

Razón del reset (documentada en detalle en [`apps/holded-mcp/CLAUDE_CONNECTOR_RESET_RUNBOOK.md`](../../apps/holded-mcp/CLAUDE_CONNECTOR_RESET_RUNBOOK.md) sección 10):

Anthropic / Claude.ai cachearon server-side dos iconos legacy de cuando el servicio se brandeaba como Verifactu Business (la "V" y el "escudo azul con check"). Los archivos llevan 5+ meses devueltos como 404 en nuestro origen, pero Claude.ai no re-scrapea conectores custom no aprobados en el directorio — sirve la copia cacheada. Migrar a un subdominio nuevo es la única forma garantizada de que Anthropic indexe el branding correcto sin cache previo.

## Estado actual (2026-05-19, submission v2 lista para enviar)

- ✅ MCP server desplegado en subdominio nuevo: `https://holded-claude.verifactu.business/mcp` (mismo build que el legacy `claude.verifactu.business`, alias en Vercel)
- ✅ Subdominio legacy `claude.verifactu.business` sigue funcionando en paralelo (no se rompen conexiones existentes — si las hay)
- ✅ OAuth 2.1 + PKCE funcional, redirect URIs allowlist (`claude.ai`, `app.claude.ai`)
- ✅ Consent screen propio con scopes humanos + links legales
- ✅ **8 tools expuestas** (preset `submission_v1`), todas con `readOnlyHint` o write annotation correcta. Las otras 16 tools del catálogo siguen implementadas pero no se registran (reactivables con `HOLDED_MCP_TOOL_PRESET=full` para submission v3 post-aprobación).
- ✅ Solo 1 tool de escritura: `create_invoice_draft` (forced `approveDoc=false`)
- ✅ Alineación funcional 1:1 con el conector ChatGPT (10 tools en ChatGPT vs 8 en Claude, la diferencia es solo de naming: Claude usa `list_documents` polimórfico)
- ✅ Privacy policy + Terms + DPA publicados — DPA actualizado con sub-procesadores reales (Vercel Frankfurt EU + Neon Frankfurt EU)
- ✅ Fixes del PR #88: brotli silent decoding, paginación client-side, default `endtmp`, `$ref` schema dedup
- ✅ Branding correcto en el nuevo dominio: `favicon.ico` ya regenerado (MD5 `d23f99ae`, rombo Holded multi-res), `manifest.json` purgado de colores Verifactu (`theme_color: "#FF5460"`, `background_color: "#ffffff"`)
- ⏳ Pendiente: enviar form de Remote MCP Submission con la URL nueva y app name nuevo

## Submission v1 (histórica, no actuar sobre ella)

Submission v1 fue enviada con app name `Holded` y MCP URL `https://claude.verifactu.business/mcp`. No recibimos email de confirmación. Posibles causas: form rellenado parcialmente, confirmación a spam, form movido a otra surface, o Anthropic no envía confirmación automática para submissions parciales.

**No la reactivar.** La submission v2 (`Holded for Claude` desde `holded-claude.verifactu.business`) es la canónica de aquí en adelante. Si Anthropic responde sobre v1, indicar amablemente que la solicitud activa es v2 y enlazar al form nuevo.

## Plan de acción

1. **Verificar antes de re-enviar:** todos los archivos en este folder cubren los campos del form
2. **Re-enviar** con el paquete completo (ver `submission-form-answers.md`)
3. **Email fallback** a partnerships@anthropic.com referenciando la primera submission con el connector name + URL
4. **Esperar** revisión manual (~2 semanas según docs oficiales)

## Archivos

| File                         | Propósito                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `submission-form-answers.md` | Respuestas literales para cada campo del form                                      |
| `tools-manifest.md`          | Lista de las **8 tools expuestas (submission v2)** con annotations + descripciones |
| `oauth-flow.md`              | Detalle técnico OAuth 2.1 + PKCE + scopes                                          |
| `test-account.md`            | Cuenta sandbox + API key de testing + 3 prompts de ejemplo                         |
| `branding-assets.md`         | Logos, favicon, screenshots — links a CDN                                          |
| `compliance-checklist.md`    | Punto por punto el Anthropic Software Directory Policy                             |
| `escalation-email.md`        | Template del email a partnerships@anthropic.com si el form falla                   |

## Causas top de rechazo según docs oficiales (priorizadas)

1. **Missing tool annotations** — 30% de rechazos. ✅ Resuelto (ver `tools-manifest.md`)
2. **Missing or incomplete privacy policies** — rechazo inmediato. ✅ Resuelto (privacy URL pública)
3. **OAuth callback URL errors** — ✅ Resuelto (allowlist claude.ai)
4. **Incomplete documentation** — ✅ Resuelto (`/conectores/claude/docs`)
5. **Submitting servers en beta** — ✅ Producción desde abril 2026

## Referencias

- [Submitting to the Connectors Directory](https://claude.com/docs/connectors/building/submission)
- [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy)
- [Remote MCP Server Submission Guide](https://support.claude.com/en/articles/12922490-remote-mcp-server-submission-guide)
- [Connectors Directory FAQ](https://support.claude.com/en/articles/11596036-anthropic-connectors-directory-faq)
