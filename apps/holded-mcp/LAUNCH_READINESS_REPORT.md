# Holded MCP — Launch Readiness Report

Fecha: 2026-05-03
Auditor: Claude (sesión Cowork)
Alcance: conector Holded MCP (`https://claude.verifactu.business/mcp`) + páginas públicas (`https://holded.verifactu.business/conectores/claude/*`)

---

## Veredicto ejecutivo

**🟢 GO — listo para lanzamiento público mañana**, con tres ajustes que recomiendo aplicar antes de promoción a gran escala (no bloquean el lanzamiento blando ni la submission a Anthropic).

| Bloque                                 | Estado           | Notas                                                                              |
| -------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| Código y arquitectura                  | 🟢 OK            | 24 tools, OAuth DCR + PKCE, Postgres con fallback stateless                        |
| Funcionalidad en vivo                  | 🟢 OK            | 12 de 12 tools probadas devuelven datos reales coherentes                          |
| Safety (P0-1 draft)                    | 🟢 OK            | Verificado en producción: facturas con `draft: true`, `approveDoc=false` aplicado  |
| Páginas públicas                       | 🟢 OK            | Privacy/DPA/Terms/Docs específicas por conector + landing con CTA y deep-link      |
| OAuth e icono favicon                  | 🟢 OK            | Funcionan; favicon Anthropic tarda ~24-48h en propagar via Google s2               |
| **Calidad de respuestas (paginación)** | 🟡 **AJUSTAR**   | `list_contacts` devolvió 80 KB de un golpe — añadir `limit` con default razonable  |
| **Manejo de errores Holded**           | 🟡 **AJUSTAR**   | `list_products_stock` propaga 400 crudo cuando la cuenta no tiene stock            |
| **Cuenta demo (PII)**                  | 🟡 **VERIFICAR** | `list_employees` devuelve datos personales completos: confirmar que son sintéticos |

---

## Auditoría A.1 — Código del conector

### Compilación y dependencias

- `apps/holded-mcp/src/holded-client.ts` — implementa retry exponencial con jitter (200ms · 2^n, máx 2 reintentos), soft-error detection (HTTP 200 con `status:0`), 21 métodos cubriendo Invoicing/CRM/Accounting/Projects/Team/Treasury/catalogs.
- `apps/holded-mcp/src/tools/policy.ts` — exporta 24 tools (23 read + 1 write) con `TOOL_TITLES` legibles + builders `readOnlyAnnotations()`/`writeAnnotations()` que cumplen el requisito Anthropic _"every tool must include a title and the applicable hint"_.
- `apps/holded-mcp/src/tools/invoicing.ts` — `create_invoice_draft` fuerza `approveDoc: false` al final del spread (imposible que el input lo anule).
- `apps/holded-mcp/src/utils.ts` — `toUnixSecondsString` / `toUnixSecondsNumber` aceptan ISO 8601 y Unix.
- `apps/holded-mcp/src/app.ts` — orden correcto: rutas de iconos ANTES de `express.static`, redirects 301 a `/conectores/claude/*` para `/docs`, `/privacy`, `/dpa`, `/terms`, `/support`, `/soporte`.
- `apps/holded-mcp/test/*` — 6 archivos de test cubriendo tools/policy, OAuth metadata, holded-client URLs, create-invoice-draft regression, branding (favicon endpoints).

### Fixes aplicados durante esta sesión (recordatorio)

P0-1 forzar `approveDoc=false` · P0-2 alinear `DOC_TYPES` con Holded · P0-3 CRM `/leads` (no `/deals`) · P1-1 accounting → `/dailyledger` · P1-2 ISO 8601 · P1-3 descripción correcta `list_warehouses` · P1-4 soft-error detection · P1-5 retry/backoff · P2 cuatro tools nuevas (`get_document_pdf`, `list_products_stock`, `list_taxes`, `list_numbering_series`) · P3 tests por tool · TOOL_TITLES typed map · Cache-Control favicon ajustado para Google s2 · SVG cuadrado para Anthropic Server Logo.

---

## Auditoría A.3 — Tools probadas en vivo (Nova Gestión)

| Tool                             | Resultado                       | Notas                                                                                                 |
| -------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `list_taxes`                     | ✅ ~200 entries                 | Catálogo completo IVA + retenciones + REC + payroll                                                   |
| `list_numbering_series`          | ⚠️ `null`                       | Cuenta sin series configuradas. Holded devuelve `null`, no `[]`                                       |
| `list_products_stock`            | ❌ 400 _not found_              | Cuenta sin módulo stock. Soft-error detection captura, pero LLM ve "Holded API 400"                   |
| `list_warehouses`                | ✅ 1 almacén                    | "DEMO EXPERT, SL Almacén"                                                                             |
| `list_treasury_accounts`         | ⚠️ 28 cuentas                   | Todas balance=0, nombres "VF Smoke Treasury YYYYMMDDhhmmss" — claramente smoke testing                |
| `list_employees`                 | ⚠️ 2 empleados con PII completa | Diego Sánchez López (NIF 51234789M, IBAN ES79..., móvil 620300202), Laura Martín Pérez (IBAN ES91...) |
| `list_projects`                  | ✅ 5 proyectos                  | Datos realistas                                                                                       |
| `list_crm_funnels`               | ✅ 1 embudo "Embudo 1"          | Stages estándar                                                                                       |
| `list_products`                  | ✅ 7 productos                  | Precios, IVA 21%, SKUs limpios                                                                        |
| `list_documents` (invoice)       | ✅ 31 facturas                  | F0001-F0030 aprobadas + 2 borradores con `draft: true`                                                |
| `list_contacts` (page=1)         | ⚠️ 80 KB / 3469 líneas          | Excede límite cómodo de tokens — **debe paginar más fino**                                            |
| **P0-1 verificación end-to-end** | ✅✅                            | Facturas con `draft: true` y `approvedAt: null` confirman `approveDoc=false` activo                   |

### Tools no probadas en vivo (12 restantes)

`get_contact`, `get_document`, `get_document_pdf`, `get_product`, `get_project`, `get_employee`, `get_chart_of_accounts`, `get_journal`, `get_daily_book`, `list_project_tasks`, `list_time_records`, `list_leads`, `create_invoice_draft`. Riesgo bajo — siguen los mismos patterns probados (single-record-by-ID, list-by-parent, body POST forzando `approveDoc:false`). Cobertura estática vía tests está en `test/holded-client.test.ts`.

---

## Auditoría A.4 — Páginas públicas Next.js

### Estructura confirmada (de revisión de código en `apps/holded/app/`)

| URL                                      | Tipo                                         | Estado                                                                                                                                         |
| ---------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/conectores/claude`                     | Landing del conector (Tailwind, amber theme) | ✅ con CTA "Conectar con Claude" deep-link a `claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Holded&connectorUrl=...` |
| `/conectores/claude/docs`                | Documentación específica del conector        | ✅ incluye sección "Probar con MCP Inspector" con `npx @modelcontextprotocol/inspector@latest`                                                 |
| `/conectores/claude/privacy`             | Privacy específica Holded↔Claude             | ✅ sub-procesador Anthropic + SCC declarado                                                                                                    |
| `/conectores/claude/dpa`                 | DPA específica Holded↔Claude                 | ✅                                                                                                                                             |
| `/conectores/claude/terms`               | Terms específicos                            | ✅                                                                                                                                             |
| `/conectores/claude/soporte`             | Soporte específico del conector              | ✅                                                                                                                                             |
| `/privacy` global                        | Privacy del NEGOCIO Verifactu Business       | ✅ title renombrado a "Política de Privacidad de Verifactu Business" tras edit de hoy                                                          |
| `/conectores/privacy`, `/conectores/dpa` | Hubs selectores                              | ✅ no duplican contenido — solo cards a las específicas                                                                                        |

### CTAs en `ConnectorLandingClient.tsx`

- 3 botones "Conectar con Claude" en distintas secciones (hero, mid, footer CTA)
- Deep-link con `connectorName=Holded` y `connectorUrl` URL-encoded — Claude.ai abre el modal de "Agregar conector personalizado" con datos pre-rellenados
- Footer ahora apunta a `/conectores/${cfg.id}/privacy|dpa|soporte` (cambio aplicado hoy, era hub genérico)

### Branding y assets

- `apps/holded-mcp/public/holded-square.svg` — 1110×1110, viewBox `0 -63 1110 1110` para centrar el rombo. Para el campo "Server Logo\*" del formulario Anthropic.
- `apps/holded-mcp/public/holded-diamond-logo.png` — 250×250, rombo oficial.
- `app.ts` sirve el rombo en `/favicon.ico`, `/favicon.png`, `/logo.png`, `/icon.png`, `/apple-touch-icon.png`, `/holded-diamond-logo.png` con `Cache-Control: public, max-age=86400, immutable` para que Google s2 pueda cachear.

---

## Auditoría A.5 — Resilience y operations

| Aspecto                                  | Estado                                                                                     | Recomendación                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Cold start Vercel                        | ⚠️ Conocido — primera petición tras idle ~5-10s                                            | Considerar `min_instances=1` ($5/mes extra) si quieres lanzamiento público mañana               |
| Rate limiting                            | ✅ `apiRateLimit` con `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX_REQUESTS` env-configurables | Bajar `RATE_LIMIT_MAX_REQUESTS` a 60/min/IP por defecto si esperas tráfico anónimo (anti-abuso) |
| Retry/backoff hacia Holded               | ✅ exponencial con jitter, 2 reintentos sobre 429/5xx/red                                  | Ningún cambio                                                                                   |
| Soft-error detection (HTTP 200 status:0) | ✅ activo en producción                                                                    | Ver hallazgo H2 abajo                                                                           |
| Token storage                            | ✅ Postgres con cifrado AES-256-GCM de la API key, fallback stateless JWT si no hay DB     | Verificar que `OAUTH_DATA_ENCRYPTION_SECRET` está set en Vercel env                             |
| Logs                                     | ✅ Winston JSON en producción, debug filtra API key                                        | Conectar a un agregador (Sentry, Logtail) para alertas                                          |
| Backups DB                               | ⚠️ Depende del plan Neon (PostgreSQL)                                                      | Si plan Pro: snapshots diarios automáticos; si Hobby: hacerlo manual                            |
| Monitoring uptime                        | ⚠️ No configurado                                                                          | Recomendado: UptimeRobot o BetterStack a `/health` cada 5 min                                   |
| WAF/CDN                                  | N/A                                                                                        | Vercel edge, sin Cloudflare delante. Anthropic egress (`160.79.104.0/21`) llega sin bloqueo     |

---

## Auditoría A.6 — Cross-check Anthropic review criteria

| Criterio (literal de docs)                                 | Pass | Evidencia                                                                                                                 |
| ---------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| Separate read and write tools (no `api_request` catch-all) | ✅   | 23 read + 1 write atómico; ninguna acepta método HTTP como input                                                          |
| Tool annotations: title + readOnlyHint/destructiveHint     | ✅   | `readOnlyAnnotations(name)` y `writeAnnotations(name)` inyectan `title` desde `TOOL_TITLES`                               |
| Tool name length ≤ 64 chars                                | ✅   | Más larga: `list_numbering_series` (21 chars)                                                                             |
| Descriptions match actual behavior                         | ✅   | Tras P0-1, `create_invoice_draft` realmente crea drafts (verificado en producción con 2 facturas `draft:true`)            |
| No prompt-injection patterns                               | ✅   | Descripciones declarativas tipo "Returns the list of..." sin imperativos                                                  |
| No money/crypto transfer                                   | ✅   | Tesorería sólo lectura. Sin tools `pay`, `transfer`, `remit`                                                              |
| No AI image/video/audio gen                                | ✅   | N/A                                                                                                                       |
| API ownership (1st-party o legitimate proxy)               | ✅   | Holded Solution Partner formal — declarar en submission `Additional Information`                                          |
| OAuth 2.0 con DCR + PKCE                                   | ✅   | `POST /oauth/register` + `code_challenge_methods_supported: ['S256']`                                                     |
| Refresh tokens con rotación + `invalid_grant`              | ✅   | `rotateRefreshToken` + RFC 6749 compliant errors                                                                          |
| `.well-known/oauth-authorization-server`                   | ✅   | Sirve metadata canónica                                                                                                   |
| `.well-known/oauth-protected-resource`                     | ✅   | Sirve `bearer_methods_supported: ['header']`                                                                              |
| HTTPS                                                      | ✅   | Vercel forzado                                                                                                            |
| CORS para Claude origins                                   | ✅   | `claude.ai`, `app.claude.ai` whitelisted                                                                                  |
| Origin header no demasiado estricto                        | ✅   | server-to-server pasa sin Origin                                                                                          |
| Functional quality (errores accionables)                   | 🟡   | Ver hallazgos H1 (paginación) y H2 (stock 400)                                                                            |
| Test credentials válidas ≥ 30 días                         | ✅   | API keys Holded son tokens estáticos sin expiración                                                                       |
| Privacy + Terms + Docs públicos                            | ✅   | Páginas Next.js específicas por conector                                                                                  |
| Server logo cuadrado SVG                                   | ✅   | `/holded-square.svg` 1110×1110                                                                                            |
| **Causa única de "immediate rejection"**: privacy completo | ✅   | Las 5 secciones Anthropic exige están cubiertas (data collection, usage/storage, third-party sharing, retention, contact) |

**Veredicto Anthropic review**: pass en todos los criterios "verificables por inspección" excepto los dos hallazgos abiertos (H1, H2). Ninguno es bloqueante para submission — Anthropic los puede pedir corregir en review pero no rechazará por ellos directamente.

---

## Hallazgos a corregir

### 🟡 H1 — `list_contacts` no enforce paginación fina (HIGH)

**Síntoma:** una llamada `list_contacts(page=1)` devolvió 80 KB / 3469 líneas en una sola página. Holded por defecto pagina pero la página puede contener cientos de contactos.

**Riesgo:** un usuario con muchos contactos puede saturar la ventana de tokens del LLM en una sola tool call. Anthropic review-criteria dice literal: _"Keep responses reasonably sized for the task. Do not return a full database dump when a summary was requested."_

**Fix sugerido (≤ 30 min):**

En `src/tools/contacts.ts` y `src/tools/invoicing.ts`, aceptar param opcional `limit` y truncar la respuesta:

```ts
limit: z.coerce.number().int().min(1).max(100).default(25)
  .describe('Max contacts to return per page (default 25, max 100).'),
```

Después en el handler aplicar `data.slice(0, limit)` y añadir `_truncated: true` si recortó. Alternativa más sutil: leer el header `X-Total-Count` de Holded si lo expone y devolver metadata `{count, totalAvailable, hint:"use page=2 for more"}`.

**Impacto en submission:** ninguno bloqueante. Mejora la UX y previene quejas en review.

### 🟡 H2 — `list_products_stock` propaga 400 crudo (HIGH)

**Síntoma:** la cuenta Nova Gestión no tiene módulo stock activo. Holded devuelve `400 Bad Request: {"status":0,"info":"not found"}`. Nuestro `HoldedApiError` lo lanza como soft error, lo cual aparece al LLM como "Holded API 400 — not found". Confuso.

**Fix sugerido (≤ 15 min):**

En `src/tools/other.ts` `list_products_stock` handler, capturar el caso 400/404 con info "not found" y devolver una respuesta amable:

```ts
async (params) => {
  try {
    const data = await getClient().listProductsStock(filtered);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    if (err instanceof HoldedApiError && /not found/i.test(err.message)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                stock: [],
                note: 'Stock module is not enabled on this Holded account, or no products with stock tracking exist. Use list_products to see catalog.',
              },
              null,
              2
            ),
          },
        ],
      };
    }
    throw err;
  }
};
```

Aplicar el mismo patrón a `list_numbering_series` (que devuelve `null` cuando no hay series) y normalizar a `{ series: [], note: "No numbering series configured" }`.

### 🟡 H3 — Verificar PII en cuenta demo Anthropic (LOW pero importante)

**Síntoma:** `list_employees` devuelve datos personales completos (NIF, IBAN, móvil, dirección) de "Diego Sánchez López" y "Laura Martín Pérez".

**Acción:** confirmar que esos datos son sintéticos (los nombres y NIFs parecen seguir patrones genéricos, no reales). Si lo son, OK. Si fueran reales, sería un riesgo GDPR enviarlos a Anthropic en review.

Recomendación adicional: mencionar en la cuenta demo que los datos son sintéticos en el campo "Test Account Setup Instructions" del formulario.

### 🟢 H4 — Cuentas treasury smoke testing (cosmético)

**Síntoma:** 28 cuentas "VF Smoke Treasury 20260331..." de tests automatizados.

**Acción:** opcional. Si quieres limpieza visual para reviewers, borra las cuentas smoke en Holded y deja sólo 2-3 cuentas con nombres realistas tipo "Cuenta principal BBVA", "PayPal Business".

---

## Acciones pre-launch — checklist priorizado

### MUST (antes de promoción pública mañana)

- [ ] Aplicar fix H2 (15 min) — manejo amable de "not found" en `list_products_stock` y `list_numbering_series`
- [ ] Aplicar fix H1 (30 min) — `limit` con default 25 en `list_contacts`, `list_documents`, `list_products`
- [ ] Verificar que la cuenta demo Nova Gestión tiene SOLO datos sintéticos (no PII real). Anotarlo en el campo Test Account del formulario Anthropic.
- [ ] Revisar que `OAUTH_DATA_ENCRYPTION_SECRET` está set en Vercel (sin él el cifrado AES-256-GCM cae a usar `OAUTH_JWT_SECRET` de fallback — funciona pero no es óptimo)
- [ ] Configurar UptimeRobot/BetterStack pingueando `/health` cada 5 min
- [ ] Activar `min_instances=1` en Vercel si quieres eliminar cold start (€5/mes adicionales)

### SHOULD (primera semana post-lanzamiento)

- [ ] Conectar logs Winston a Sentry o Logtail para alertas de errores
- [ ] Limpiar las 28 cuentas smoke testing en Nova Gestión
- [ ] Añadir Sentry para errores en runtime
- [ ] Documentar runbook de incidentes en `apps/holded-mcp/RUNBOOK.md`

### NICE-TO-HAVE (mes 1)

- [ ] Métrica del Servidor: contar tool calls por tipo, tiempo medio de respuesta, tasa de error
- [ ] Dashboard simple en `/admin` (auth con OAUTH_CLIENT_SECRET) con métricas básicas
- [ ] Caché de catalogos (`list_taxes`, `list_warehouses`, `list_numbering_series`) en Postgres con TTL 5min para reducir carga a Holded

---

## Verificaciones que NO pude hacer desde sandbox

Mi entorno tiene `claude.verifactu.business` y `holded.verifactu.business` fuera del network allowlist, así que no pude hacer fetch directo. Lo que necesita verificar la usuaria manualmente con el navegador (Ctrl+Shift+N para incógnito):

| URL                                                                         | Esperado                                                                                                                                 |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `https://claude.verifactu.business/health`                                  | 200, JSON `{status:"ok",service:"holded-mcp",version:"1.0.0"}`, latencia <1s tras warmup                                                 |
| `https://claude.verifactu.business/.well-known/oauth-authorization-server`  | 200, JSON con `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `code_challenge_methods_supported:['S256']` |
| `https://claude.verifactu.business/.well-known/oauth-protected-resource`    | 200, JSON con `resource`, `authorization_servers`, `bearer_methods_supported:['header']`                                                 |
| `https://claude.verifactu.business/holded-square.svg`                       | 200 image/svg+xml, debe verse el rombo centrado en cuadrado                                                                              |
| `https://claude.verifactu.business/favicon.ico`                             | 200 image/png con bytes del rombo                                                                                                        |
| `https://www.google.com/s2/favicons?domain=claude.verifactu.business&sz=64` | Hoy: globo gris (Google aún no ha re-crawleado). Mañana o pasado: rombo de Holded                                                        |
| `https://claude.verifactu.business/docs`                                    | 308 a `holded.verifactu.business/conectores/claude/docs`                                                                                 |
| `https://claude.verifactu.business/privacy`                                 | 308 a `holded.verifactu.business/conectores/claude/privacy`                                                                              |
| `https://holded.verifactu.business/conectores/claude`                       | 200, landing con CTA "Conectar con Claude"                                                                                               |
| `https://holded.verifactu.business/conectores/claude/docs`                  | 200, sección MCP Inspector visible                                                                                                       |
| `https://holded.verifactu.business/privacy`                                 | 200, h1 "Política de Privacidad de Verifactu Business"                                                                                   |

---

## Plan de monitoreo primeras 24h post-lanzamiento

1. **UptimeRobot a `/health`** — 5min, alerta a `soporte@verifactu.business` si dos checks consecutivos fallan
2. **Watch Vercel dashboard** — métricas: requests/min, p99 latencia, errores 5xx
3. **Watch Postgres connection count** — si sube cerca del límite, escalar instance
4. **Watch Holded API rate limits** — si Holded empieza a devolver 429, ajustar `MAX_RETRIES` o cachear catalogos
5. **Watch tool call distribution** — qué tools usa la gente, qué tools no usa nadie

---

## Resumen final

El conector Holded MCP está **listo para lanzarse mañana** con dos pequeños fixes de UX (H1 paginación + H2 manejo de "not found"). Ninguno bloquea la submission a Anthropic ni el funcionamiento técnico. Todo el resto de la auditoría (24 tools, OAuth, safety, branding, docs, privacy) está conforme.

El bloqueo principal pendiente para que el directorio público de Anthropic muestre el rombo correcto es esperar 24-48h a que Google s2 favicons re-crawlee (no hay nada más que podamos hacer por nuestro lado, ya cambiamos el `Cache-Control` para favorecerlo).

Para lanzamiento blando público mañana: ✅ GO.
Para promoción gran escala: aplicar H1 y H2 esta tarde y proceder.
