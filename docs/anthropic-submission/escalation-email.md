# Email de escalation a partnerships@anthropic.com

> Usar si: (1) el form de Anthropic está bloqueado por firewall/tenant restriction, (2) ya enviaste una vez sin confirmación >7 días, (3) el form actual no está disponible.

---

**Para:** partnerships@anthropic.com
**CC:** (interno: tu copia)
**Asunto:** Remote MCP Submission — Holded × Claude (Verifactu Business)

---

Hola equipo de Anthropic,

Soy [tu nombre] de **Verifactu Business** y os escribo para reenviar la submission de nuestro Remote MCP server **Holded** al Connectors Directory. Ya rellené el Google Form de submission hace [X] días pero no recibimos confirmación, por lo que sigo el fallback indicado en la documentación oficial.

## Resumen del connector

- **Nombre:** Holded
- **MCP endpoint:** https://claude-holded.verifactu.business/mcp
- **Tagline:** "Habla con tu Holded desde Claude: facturas, contactos, contabilidad y borradores."
- **Categoría:** Productivity → Accounting & Finance, Business Tools, CRM
- **Estado:** En producción desde abril 2026, no es beta
- **Usuarios objetivo:** PYMEs y autónomos en España/Europa que usan Holded (>100 000 empresas)

## Cumplimiento del policy

He revisado el [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) y el [Submission Guide](https://claude.com/docs/connectors/building/submission). Todos los puntos están cubiertos:

- ✅ **Tool annotations:** 8 tools expuestas (preset `submission_v1`), todas con `readOnlyHint` o `destructiveHint` correcto (causa #1 de rechazos, ya cerrada). Las otras 16 del catálogo siguen implementadas pero no se registran en `tools/list` (reactivables vía env var para submission v3 post-aprobación).
- ✅ **Privacy Policy:** https://holded.verifactu.business/conectores/claude/privacy
- ✅ **Terms of Service:** https://holded.verifactu.business/conectores/claude/terms
- ✅ **DPA:** https://holded.verifactu.business/conectores/claude/dpa
- ✅ **Documentation:** https://holded.verifactu.business/conectores/claude/docs
- ✅ **OAuth 2.1 + PKCE S256** con redirect URI allowlist (claude.ai, app.claude.ai)
- ✅ **HTTPS TLS 1.2+** en todos los endpoints
- ✅ **Standard testing account + 3 working example prompts** preparados
- ✅ **Sub-procesadores documentados** (Vercel, Render, CockroachDB, Holded)
- ✅ **GDPR Article 28** — DPA firmable
- ✅ **Endpoint ownership** — todo bajo `verifactu.business` (registro a nombre de Verifactu Business S.L.)

## Tool surface (submission v2)

- **8 tools expuestas en producción:**
  - 7 read-only: `list_documents` (cubre facturas de venta + compra + otros docs comerciales vía `docType`), `get_document`, `get_document_pdf`, `list_contacts`, `get_contact`, `get_chart_of_accounts`, `get_journal` (libro diario contable con rango de fechas obligatorio).
  - 1 write: `create_invoice_draft` con `approveDoc=false` forzado a nivel servidor — la factura siempre queda como borrador editable en Holded, nunca se emite/envía/cobra/transmite a AEAT sin acción explícita del usuario en la UI nativa de Holded.

Alineado funcionalmente 1:1 con el conector ChatGPT-Holded (que expone 10 tools por usar `list_invoices`/`list_documents` separadas en vez del `list_documents` polimórfico de Claude).

## Cuenta de testing

Tenemos una cuenta sandbox de Holded con datos seed (5 clientes, 12 facturas, 8 productos, 4 proyectos, 30 asientos contables). **Si me pasáis un email `@anthropic.com` del reviewer, le doy acceso inmediato con API key dedicada para validar el flujo end-to-end.**

## Submission previa

Envié el Google Form el [fecha aproximada] desde el email `soporte@verifactu.business`. No recibimos email de confirmación, por lo que asumo:

- Bien la submission no llegó (problema de form/spam)
- Bien fue rechazada silenciosamente por algún campo faltante

¿Podríais confirmar si encontráis el registro en vuestro tracker? Si está rechazada me indicáis el motivo y reenvío corregida; si no llegó, adjunto el paquete completo a este email.

## Adjuntos disponibles bajo request

Tengo preparado un paquete `docs/anthropic-submission/` en nuestro repo con:

- `submission-form-answers.md` — respuestas literales del form
- `tools-manifest.md` — las 8 tools expuestas con annotations (+ tabla de las 16 reservadas para v3)
- `oauth-flow.md` — detalle técnico OAuth
- `compliance-checklist.md` — punto por punto del policy
- `test-account.md` — credenciales sandbox + 3 prompts
- `branding-assets.md` — logo SVG, screenshots, favicon

Os los paso por el canal que prefiráis (este email, drive compartido, etc.).

Quedo atento a cualquier pregunta.

Saludos,

[Tu nombre]
[Tu cargo]
Verifactu Business
soporte@verifactu.business
https://verifactu.business

---

## Notas internas (NO incluir en el email)

- Empezar con tono cordial pero específico — Anthropic suele responder más rápido a emails que demuestran que se leyó la doc
- Si en 2 semanas no responden, reenviar con un bump "wanted to follow up on the submission below"
- Nunca atacar ni pasivo-agresivo — la review es manual y los reviewers son personas
- Si te piden cambios, hacerlos en <48h y responder con changelog claro
- Si te aprueban: aparece en https://claude.ai/directory tras unos días
