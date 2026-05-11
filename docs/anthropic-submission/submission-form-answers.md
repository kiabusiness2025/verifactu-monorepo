# Anthropic Remote MCP Submission — Respuestas literales del form

> Esto es lo que hay que pegar campo por campo. El form de Anthropic está en https://claude.com/docs/connectors/building/submission (linkea al Google Form).

---

## Server basics

**Server name:** `Holded`

**Server URL (MCP endpoint):** `https://claude.verifactu.business/mcp`

**Tagline (≤80 chars):**
`Habla con tu Holded desde Claude: facturas, contactos, contabilidad y borradores.`

**Description (250-500 chars):**
`Holded es el sistema de gestión empresarial todo-en-uno usado por más de 100.000 PYMEs en España y Europa para facturación, contabilidad, CRM, proyectos e inventario. Este conector permite a Claude leer datos de Holded en lenguaje natural — facturas, contactos, contabilidad, proyectos — y crear borradores de factura con tu confirmación explícita. Los borradores nunca se emiten, envían ni cobran automáticamente: tú revisas y apruebas en la UI de Holded antes de cualquier efecto legal.`

**Categoría primaria:** `Productivity > Accounting & Finance`

**Categorías secundarias:** `Business Tools`, `CRM`

**Use cases (3-5):**

1. "Cuánto facturé en marzo? Quién son mis top 3 clientes?"
2. "Trae el detalle del cliente Acme S.L. — CIF, email, pendiente de cobro"
3. "Crea un borrador de factura para Beta Studios por 1.500 € + IVA"
4. "Resumen del diario contable de febrero — ingresos, gastos, IVA"
5. "Estado de mis proyectos activos y horas registradas"

---

## Connection details

**Auth type:** `OAuth 2.1 with PKCE (S256)`

**Transport protocol:** `Streamable HTTP (MCP spec 2025-03-26)`

**Read capabilities:** Yes — 23 read tools (facturas, contactos, productos, proyectos, CRM, contabilidad, tesorería, etc.)

**Write capabilities:** Yes — 1 write tool (`create_invoice_draft`) que crea borradores con `approveDoc=false` forzado a nivel servidor. Sin operaciones destructivas (delete/send/pay) expuestas.

**Connection requirements:**

- Usuario necesita una cuenta activa en Holded (https://holded.com)
- Necesita generar una API key de Holded desde el panel de Holded (Configuración > Desarrolladores > API)
- El consent screen explica los scopes y pide aceptación T&C/Privacy/DPA

**Authorization endpoint:** `https://claude.verifactu.business/oauth/authorize`
**Token endpoint:** `https://claude.verifactu.business/oauth/token`
**Registration endpoint:** `https://claude.verifactu.business/oauth/register`
**Discovery metadata:** `https://claude.verifactu.business/.well-known/oauth-authorization-server`
**Protected resource metadata:** `https://claude.verifactu.business/.well-known/oauth-protected-resource`

**Scopes exposed:** `holded:read` (lectura), `holded:write` (crear borradores)

---

## Data & compliance

**Data hosting region:** EU (Vercel Frankfurt + Render Frankfurt)
**Encryption in transit:** TLS 1.2+
**Encryption at rest:** AES-256 (CockroachDB encrypted columns)
**Data retention:** Holded API keys cifradas con AES-256-GCM. Audit logs 90 días. Sesiones OAuth 30 días con rotación.
**Sub-procesadores:** Vercel (frontend hosting), Render (MCP server hosting), Holded (data source, NO procesa para Anthropic), CockroachDB (database).
**GDPR Article 28:** Sí — DPA pública firmable.
**Data deletion:** Usuario puede revocar acceso desde su panel `/admin` o por email. Eliminación efectiva en ≤30 días.

**Privacy policy URL:** `https://holded.verifactu.business/conectores/claude/privacy`
**Terms of Service URL:** `https://holded.verifactu.business/conectores/claude/terms`
**DPA URL:** `https://holded.verifactu.business/conectores/claude/dpa`

---

## Tools list

Ver `tools-manifest.md` para la lista completa con annotations. Resumen: **24 tools** = 23 read-only + 1 write con confirmación humana explícita.

---

## Documentation link

`https://holded.verifactu.business/conectores/claude/docs`

Cubre: cómo conectar, lista de tools, scopes, troubleshooting, contacto soporte, FAQ.

---

## Branding materials

- **Logo (SVG):** Ver `branding-assets.md` (rombo Holded, 512×512)
- **Favicon:** `https://claude.verifactu.business/favicon.ico`
- **Logo URL:** `https://claude.verifactu.business/holded-diamond-logo.png?v=holded-diamond-2026-05-03`
- **Promotional screenshots:** Ver `branding-assets.md` (3 screenshots del connector funcionando en Claude)

---

## Allowed origins (para deep-links)

Solo dominios de propiedad nuestra:

- `https://holded.verifactu.business`
- `https://claude.verifactu.business`
- `https://app.verifactu.business`

---

## Pre-submission checklist

- [x] OAuth funcional con PKCE S256
- [x] Redirect URIs allowlist (claude.ai + app.claude.ai)
- [x] Todas las tools con `readOnlyHint` o `destructiveHint`
- [x] Privacy + T&C + DPA URLs públicos
- [x] Docs URL público
- [x] HTTPS (TLS 1.2+) en todos los endpoints
- [x] Origin-header validation en CORS
- [x] No está en beta — producción desde abril 2026
- [x] Standard testing account preparada (ver `test-account.md`)
- [x] 3+ working example prompts (ver `test-account.md`)
- [x] Logo SVG cuadrado
- [x] Screenshots promocionales
