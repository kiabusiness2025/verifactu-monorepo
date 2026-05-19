# Anthropic Software Directory Policy — Checklist

Verificación punto a punto del [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy).

## ✅ Safety & Security

- [x] **Endpoint ownership:** `claude-holded.verifactu.business`, `holded.verifactu.business`, `app.verifactu.business` son propiedad de Verifactu Business (registrados en el mismo dominio raíz `verifactu.business`)
- [x] **HTTPS everywhere:** TLS 1.2+ en todos los endpoints
- [x] **OAuth correcto:** OAuth 2.1 + PKCE S256, redirect URI allowlist estricto (`claude.ai`, `app.claude.ai`)
- [x] **No credenciales en URLs:** API keys nunca viajan en query strings ni en logs
- [x] **Origin-header validation:** CORS estricto solo permite orígenes Claude
- [x] **Rate limiting:** `apiRateLimit` con config externa
- [x] **No leak de stack traces:** errores 500 devuelven `Internal server error. Reference: <uuid>`

## ✅ Helpful & Harmless

- [x] **Tool descriptions claras y honestas:** las 8 tools expuestas (submission v2 `submission_v1` preset) tienen descripción en inglés explicando qué hacen. Las otras 16 del catálogo siguen implementadas pero no registradas en `tools/list` (reactivables vía `HOLDED_MCP_TOOL_PRESET=full` para submission v3)
- [x] **No tools destructivas expuestas:** ni delete, ni send, ni pay están en el set público de Claude (solo `create_invoice_draft` que crea borrador con `approveDoc=false` forzado)
- [x] **Human confirmation para writes:** la única tool de escritura tiene wording explícito sobre confirmación humana
- [x] **No PII innecesaria:** el connector solo accede a los datos del usuario autenticado, no de terceros
- [x] **No scraping ni open-world:** todas las tools tienen `openWorldHint: false` — solo tocan la cuenta Holded del usuario autenticado

## ✅ Tool Annotations (TOP 1 de rechazos — 30%)

Definidas centralmente en `apps/holded-mcp/src/tools/policy.ts`:

```ts
export const READ_ONLY_TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const CREATE_INVOICE_DRAFT_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false, // crea DRAFT — usuario debe aprobar manualmente
  idempotentHint: false,
  openWorldHint: false,
};
```

- [x] **Cada tool tiene `readOnlyHint` o `destructiveHint`:** 23 readOnlyHint + 1 con ambos explícitos
- [x] **`openWorldHint: false`** en todas: no hay acceso a web externa, solo a la cuenta del usuario
- [x] **`title` en cada tool:** sí, descripción human-readable en inglés

## ✅ Privacy & Compliance (rechazo INMEDIATO si falta)

- [x] **Privacy Policy URL público:** `https://holded.verifactu.business/conectores/claude/privacy`
- [x] **Terms of Service URL público:** `https://holded.verifactu.business/conectores/claude/terms`
- [x] **DPA URL público:** `https://holded.verifactu.business/conectores/claude/dpa`
- [x] **Privacy policy completa:** explica qué datos se recogen, cómo se procesan, sub-procesadores, derechos GDPR, contacto DPO
- [x] **GDPR Article 28 compliance:** DPA firmable con sub-procesadores listados (Vercel, Render, CockroachDB, Holded)
- [x] **Data retention:** definida (30 días para tokens, 90 días audit logs)
- [x] **Right to delete:** revocación inmediata desde panel admin

## ✅ Documentation

- [x] **Docs URL público:** `https://holded.verifactu.business/conectores/claude/docs`
- [x] **Cómo conectar:** instrucciones paso a paso con screenshots
- [x] **Tool catalog:** lista de tools con qué hace cada una
- [x] **Troubleshooting:** errores comunes y cómo resolverlos
- [x] **Soporte:** `https://holded.verifactu.business/conectores/claude/soporte` + email `soporte@verifactu.business`
- [x] **FAQ:** preguntas frecuentes sobre seguridad, precios, integración

## ✅ Testing & Quality

- [x] **Standard testing account:** preparada (ver `test-account.md`)
- [x] **3+ working example prompts:** documentados (ver `test-account.md`)
- [x] **Production-ready (NO beta):** desplegado y en uso real desde abril 2026
- [x] **Mantenimiento activo:** issues respondidos en ≤48h
- [x] **CI/CD verde:** tests pasando en main

## ✅ Branding & Identity

- [x] **Logo SVG cuadrado:** `https://claude-holded.verifactu.business/holded-diamond-logo.png` (512×512)
- [x] **Favicon:** `https://claude-holded.verifactu.business/favicon.ico`
- [x] **Branding consistente:** mismo logo + colores en consent screen, landing, docs
- [x] **No claims falsos:** no nos atribuimos endorsement de Anthropic en marketing

## ✅ Directory Terms acceptance

- [x] **[Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms):** leídos y aceptados
- [x] **Design guidelines:** seguidas (consent screen estilo Claude, fonts/colors apropiados)
- [x] **Compromiso de mantenimiento:** Verifactu Business se compromete a mantener el connector activo y resolver issues

---

## Causas comunes de rechazo — estado nuestro

| Causa rechazo                     | % rechazos        | Estado nuestro                  |
| --------------------------------- | ----------------- | ------------------------------- |
| Missing tool annotations          | 30%               | ✅ Resuelto                     |
| Missing/incomplete privacy policy | rechazo inmediato | ✅ Resuelto                     |
| OAuth callback URL errors         | alto              | ✅ Resuelto                     |
| Incomplete documentation          | medio             | ✅ Resuelto                     |
| Beta servers                      | alto              | ✅ En producción                |
| Endpoint not owned by submitter   | rechazo inmediato | ✅ Todo en `verifactu.business` |

---

## Auto-test pre-submission

```bash
# 1. Verificar tool annotations
curl -s https://claude-holded.verifactu.business/.well-known/oauth-protected-resource | jq

# 2. Verificar OAuth discovery
curl -s https://claude-holded.verifactu.business/.well-known/oauth-authorization-server | jq

# 3. Verificar páginas legales públicas (no auth required)
for url in \
  https://holded.verifactu.business/conectores/claude/terms \
  https://holded.verifactu.business/conectores/claude/privacy \
  https://holded.verifactu.business/conectores/claude/dpa \
  https://holded.verifactu.business/conectores/claude/docs; do
  echo "$url: $(curl -s -o /dev/null -w '%{http_code}' "$url")"
done
# Esperado: todos devuelven 200
```
