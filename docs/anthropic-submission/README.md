# Anthropic Connectors Directory — Submission Package

**Connector:** Holded × Claude
**Submitter:** Verifactu Business
**Email de contacto:** soporte@verifactu.business
**Email de escalation Anthropic:** partnerships@anthropic.com
**Form URL:** https://claude.com/docs/connectors/building/submission (la página linkea al Google Form actual)

## Estado actual (2026-05-19, submission v2 lista para enviar)

- ✅ MCP server desplegado: `https://claude.verifactu.business/mcp`
- ✅ OAuth 2.1 + PKCE funcional, redirect URIs allowlist (`claude.ai`, `app.claude.ai`)
- ✅ Consent screen propio con scopes humanos + links legales
- ✅ **8 tools expuestas** (preset `submission_v1`), todas con `readOnlyHint` o write annotation correcta. Las otras 16 tools del catálogo siguen implementadas pero no se registran (reactivables con `HOLDED_MCP_TOOL_PRESET=full` para submission v3 post-aprobación).
- ✅ Solo 1 tool de escritura: `create_invoice_draft` (forced `approveDoc=false`)
- ✅ Alineación funcional 1:1 con el conector ChatGPT (10 tools en ChatGPT vs 8 en Claude, la diferencia es solo de naming: Claude usa `list_documents` polimórfico)
- ✅ Privacy policy + Terms + DPA publicados — DPA actualizado con sub-procesadores reales (Neon Frankfurt EU + Vercel + Railway)
- ✅ Fixes del PR #88: brotli silent decoding, paginación client-side, default `endtmp`, `$ref` schema dedup
- ✅ Landing Claude refresca: `ConnectorRequirementsCard` con cláusula de licencia Claude Pro/Team/Enterprise, aviso explícito "Inicia sesión en claude.ai antes de pulsar Añadir a Claude", y enlaces externos a Claude.ai/Holded (PR #94).
- ✅ Hub `/conectores` ready for public/social-share (OG/Twitter metadata + "Requisitos previos" block — PR #94).
- ⏳ Pendiente: enviar form de Remote MCP Submission

## Submission previa

El usuario ya envió **una vez** el Google Form de submission, pero **no recibió email de confirmación**.

Posibles causas:

1. Form rellenado parcialmente o con campo obligatorio incorrecto (los reviewers no responden si la submission no pasa los checks automáticos iniciales)
2. Confirmación a spam
3. Form movido a otra surface (la doc oficial dice que se está moviendo a Claude.ai native)
4. Anthropic no envía confirmación automática para submissions parciales

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
