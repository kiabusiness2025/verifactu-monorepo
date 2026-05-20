# Guía de submission — Holded MCP → Anthropic Connectors Directory

Fuente oficial: https://claude.com/docs/connectors/building/submission, /authentication, /review-criteria, /testing.

Producto: Remote MCP Server (no MCP App, no Desktop extension).

Formulario: **https://clau.de/mcp-directory-submission**.
Si el formulario está bloqueado por firewall corporativo: escribir a **[email protected]**.

---

## Parte 1 — Pre-vuelo (hacer antes de tocar el formulario)

### 1.1. Aplicar los fixes pendientes del audit

En orden:

1. P0-1, P0-2, P0-3, P1-1 a P1-5, P2 ya están en código (ver `HOLDED_MCP_AUDIT.md`).
2. Ejecutar localmente:
   ```bash
   cd apps/holded-mcp
   npm install
   npx tsc --noEmit --pretty false
   npm test
   ```
   Cualquier fallo bloquea la submission. Especialmente verificar que `test/create-invoice-draft.test.ts` pasa — es el que protege la promesa "draft only".
3. Desplegar a Vercel. Confirmar:
   - `https://claude.verifactu.business/health` → 200 con `{status:"ok"}`
   - `https://claude.verifactu.business/.well-known/oauth-authorization-server` responde en **<5 s** (importante, lo dice la doc de testing).
   - `https://claude.verifactu.business/.well-known/oauth-protected-resource` idem.
   - `https://claude.verifactu.business/favicon.png` devuelve `Content-Type: image/png` con el rombo (no la "V").

### 1.2. Allowlist de red en Vercel / WAF / CDN

La doc de testing es explícita: si tu CDN o WAF bloquea Anthropic, los tools fallan con 403 antes de llegar a Express y el servidor nunca lo ve.

> _"Allowlist Anthropic's egress range (`160.79.104.0/21`) in your WAF or CDN configuration."_

Acción: en Vercel no hay WAF por defecto, así que normalmente no aplica. Pero si tienes Cloudflare delante de `claude.verifactu.business` o reglas custom de Helmet/rate-limit, **comprobar que no bloquean por IP origen ni por User-Agent**. Tu `apiRateLimit` de express-rate-limit puede ser un problema si Anthropic genera ráfagas durante review — considera elevar `RATE_LIMIT_MAX_REQUESTS` para `/mcp` durante la ventana de revisión.

### 1.3. Probar end-to-end como custom connector tú mismo

> _"Test your server against the real Claude client before submitting. There is no separate staging environment—you test in production using a custom connector."_

Pasos (siguiendo tu propio CLAUDE_CONNECTOR_RESET_RUNBOOK.md):

1. `claude.ai` → Settings → Connectors → Add custom connector → URL: `https://claude.verifactu.business/mcp`.
2. Completar el OAuth con tu API key de Holded.
3. Verificar que aparecen las 24 tools (23 read-only + `create_invoice_draft`).
4. Probar cada tool con datos reales:
   - `list_contacts`, `get_contact` con un ID real
   - `list_documents` con cada `docType` (los 10)
   - `get_document_pdf` para una factura real → debe devolver bytes válidos
   - `list_taxes`, `list_numbering_series` → sirven para resolver IDs antes del draft
   - `create_invoice_draft` → confirmar que en Holded UI aparece como **Borrador** (no como factura emitida con número)
5. Verificar el panel de permisos por tool: read-only tools deben aparecer auto-aprobables; `create_invoice_draft` debe pedir confirmación cada vez.

### 1.4. MCP Inspector

> _"Use the MCP Inspector to verify protocol compliance, exercise your auth flow, and inspect tool schemas before connecting to Claude."_

```bash
npx @modelcontextprotocol/inspector https://claude.verifactu.business/mcp
```

Comprobar: `tools/list` devuelve los nombres exactos, cada tool con su `description` ≤ 64 chars en `name`, `annotations.readOnlyHint`/`destructiveHint` correctos.

### 1.5. Cuenta de prueba para los reviewers

> _"Test credentials are required and must be a fully populated account. Provide a fully populated account—not an empty shell—so reviewers can exercise real functionality (list real records, search real data, exercise write tools on real resources). Include step-by-step setup instructions for someone unfamiliar with your service."_

Acción: crear una cuenta Holded de demo con:

- Mínimo 5 contactos (mezcla cliente/proveedor)
- Mínimo 5 productos con stock en al menos 1 almacén
- Mínimo 5 facturas en distintos estados (borrador, emitida, pagada)
- Algún presupuesto, albarán, ticket
- Al menos 1 funnel CRM con 3 leads
- Asientos contables del último mes

Generar:

- API key de la cuenta (read+write)
- Documento `.txt` con: usuario/email demo, contraseña Holded (si los reviewers necesitan ver el ERP), API key, y guion paso a paso "para alguien que nunca ha visto Holded": "abre Claude.ai → Settings → Connectors → Add custom connector → pega https://claude.verifactu.business/mcp → autoriza con esta API key → pídele a Claude 'lista mis facturas del último mes' → debería devolver la lista".

### 1.6. Documentación pública

> _"Documentation link — must be public by your publish date (a blog post or help-center article is sufficient)."_

Tu repo ya tiene:

- `https://claude.verifactu.business/docs` (servida desde `public-pages.ts`)
- `https://claude.verifactu.business/privacy`
- `https://claude.verifactu.business/dpa`

**Verificar antes de submitir** que las tres responden con HTML válido (no 404 ni placeholder vacío) y que `/privacy` cubre los puntos exigidos:

> _"Data collection practices / Usage and storage / Third-party sharing / Data retention / Contact information"_

> ⚠️ _"Missing or incomplete privacy policies result in immediate rejection."_ — único rechazo declarado como "inmediato" en toda la doc.

### 1.7. Logo y favicon

> _"server logo (URL or SVG upload), favicon verification"_

URL del logo a usar en el formulario: `https://claude.verifactu.business/holded-diamond-logo.png?v=holded-diamond-2026-05-03`

Favicon: `https://www.google.com/s2/favicons?domain=claude.verifactu.business&sz=64` debe mostrar el rombo.

**Importante:** Si Claude.ai muestra un icono inesperado, comprueba primero si coincide con el _antiguo_ icono azul personalizado de la primera versión de este conector. Si coincide, trátalo como metadatos en caché — no como fallback genérico de Claude. Para limpiarlo:

1. Desinstala el conector desde Claude.ai
2. Si usas Claude Team/Enterprise, elimínalo también en Organization Settings → Connectors
3. Limpia tu sesión de Claude: cierra sesión, borra la caché del navegador, vuelve a entrar
4. Reinstala en `https://claude.verifactu.business/mcp`
5. Verifica que las URLs públicas de icono son correctas: `https://claude.verifactu.business/holded-diamond-logo.png`, `/favicon.ico`, `/icon.png`
6. Comprueba la caché de favicon de Google: `https://www.google.com/s2/favicons?domain=claude.verifactu.business`
7. Solo trátalo como fallback genérico de Claude si el icono mostrado no coincide con ningún asset antiguo Y todas las URLs públicas de branding devuelven el rombo de Holded

### 1.8. Auditoría final de tools (review criteria)

Ejecutar mentalmente el checklist literal de Anthropic contra tu set de 24 tools:

- ✅ "Separate read and write tools": OK, todas tus tools son read-only excepto `create_invoice_draft`. Ningún `api_request` genérico con `method` parámetro.
- ✅ "readOnlyHint / destructiveHint annotations": OK, ya las tienes en `policy.ts`.
- ✅ "Tool name length ≤ 64 chars": OK, la más larga es `list_numbering_series` (21).
- ✅ "Descriptions match actual behavior": OK tras P0-1 (ahora `create_invoice_draft` realmente crea borradores).
- ✅ "Reference API docs in tool descriptions if freeform": no aplica — ninguna de tus tools acepta endpoints freeform.
- ⚠️ "Validate inputs and return actionable error messages": revisar que zod produce mensajes legibles. Si `list_documents` con `docType:"foo"` devuelve un error críptico, el reviewer puede marcarlo. Tu zod enum lo cubrirá automáticamente — verificar con MCP Inspector.
- ⚠️ "Generic 'Internal Server Error' fails review": tu `HoldedClient.request` lanza `HoldedApiError` con detalle del status y body — bien. El catch genérico en `app.ts:174-178` devuelve `{error: 'internal_error', message: err.message}` — aceptable porque incluye `err.message`.
- ✅ "Do not query Claude's memory, chat history, conversation summaries, or user files": no aplica.
- ✅ "Transfer money / cryptocurrency": **NO aplica — verificar bien**. Holded en sí es un ERP, las tools no mueven dinero. `create_invoice_draft` crea un documento administrativo, no ejecuta pagos. La tool `list_treasury_accounts` solo **lee** saldos. No hay riesgo de rechazo por esta categoría.
- ✅ "AI image/video/audio generation": no aplica.
- ⚠️ "API ownership / domain match": `claude.verifactu.business` proxying `api.holded.com`. Esto es lo más sensible. Anthropic acepta "APIs you legitimately proxy". Hay que **declararlo explícitamente en el formulario** y ser transparente: el conector lo opera Verifactu (tercera parte) sobre la API pública de Holded usando una API key que el propio usuario provee. Recomendable adjuntar/linkar evidencia: una declaración pública en `/docs` o `/privacy` que explique la relación.

---

## Parte 2 — Rellenar el formulario

Llegas al formulario con todos los assets listos. Esto es lo que pide cada bloque y qué poner.

### Server basics

| Campo                           | Valor sugerido                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server name                     | `Holded`                                                                                                                                                                                                                                                                                                                                                                         |
| Tagline (≤ ~80 chars)           | `Read your Holded ERP — invoices, contacts, products, accounting — and create draft invoices.`                                                                                                                                                                                                                                                                                   |
| URL                             | `https://claude.verifactu.business/mcp`                                                                                                                                                                                                                                                                                                                                          |
| Description (~200-400 palabras) | Ver plantilla más abajo                                                                                                                                                                                                                                                                                                                                                          |
| Use cases                       | Tres a cinco escenarios concretos: (1) "Auditar facturas pendientes de cobro del trimestre"; (2) "Buscar contactos por NIF y revisar su histórico"; (3) "Pedir a Claude el PDF de una factura concreta para enviarla"; (4) "Resolver IDs de impuestos y series numéricas antes de redactar un borrador"; (5) "Crear borradores de factura para revisión humana antes de emitir". |

**Plantilla de descripción** (rellena tono según gusto):

> Conector oficial de Holded para Claude. Permite a Claude leer información de tu ERP Holded —facturas, presupuestos, albaranes, contactos, productos, stock, asientos contables, proyectos, empleados y tesorería— y crear borradores de factura que tú revisarás en Holded antes de emitir. Todas las herramientas de lectura son seguras y no modifican datos. La única herramienta de escritura, `create_invoice_draft`, fuerza `approveDoc=false` a nivel de servidor, garantizando que la factura nunca se emite automáticamente. La autenticación es OAuth 2.0 con tu API key personal de Holded, cifrada en reposo (AES-256-GCM) y nunca compartida con terceros. Operado por Verifactu (https://verifactu.business) sobre la API pública de Holded.

### Connection details

| Campo                   | Valor                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Auth type               | `oauth_dcr` (OAuth 2.0 con DCR — `POST /oauth/register`)                                               |
| Transport protocol      | `Streamable HTTP`                                                                                      |
| Read capabilities       | Sí                                                                                                     |
| Write capabilities      | Sí (limited — only draft creation)                                                                     |
| Connection requirements | "User must have a Holded paid plan and a personal API key (Settings → Developers → API key in Holded)" |

### Allowed link URIs

Si tu MCP no expone `ui/open-link`, dejar vacío. Tu MCP actual no lo expone, así que **omitir**.

### Data & compliance

| Campo                   | Valor                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data handling practices | Resumir desde tu privacy policy: "User-provided Holded API key encrypted at rest with AES-256-GCM. Holded data passes through the server only in-flight; not stored beyond OAuth session metadata." |
| Third-party connections | "Only Holded API (`https://api.holded.com`)."                                                                                                                                                       |
| Health data access      | No                                                                                                                                                                                                  |
| Category                | `Productivity` o `Finance & Accounting` (la doc no enumera la lista exacta — elegir el más cercano)                                                                                                 |

### Tools, resources & prompts

Listar **literalmente** los 24 nombres con sus descripciones ya en inglés y la confirmación de annotations. La fuente única ya la tienes en `src/tools/policy.ts` (`PRODUCTION_TOOL_NAMES` + `TOOL_HUMAN_DESCRIPTIONS`). Recomendable copiar el output de `tools/list` del MCP Inspector y pegarlo tal cual.

Confirmación de tool annotations: "Every tool has `readOnlyHint: true` except `create_invoice_draft`, which has `readOnlyHint: false` and `destructiveHint: false` (it creates a draft, not a destructive change)."

### Documentation & support

> Las páginas legales y de documentación **viven en la app Next.js** de
> `holded.verifactu.business/conectores/claude/*`. El servidor MCP solo
> redirige (308) hacia ahí. Submitir directamente las URLs canónicas
> Next.js — nunca las del MCP server, para evitar la indirección.

| Campo                  | Valor canónico                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Docs URL               | `https://holded.verifactu.business/conectores/claude/docs`                                          |
| Privacy policy URL     | `https://holded.verifactu.business/conectores/claude/privacy`                                       |
| Terms URL (si lo pide) | `https://holded.verifactu.business/conectores/claude/terms`                                         |
| DPA URL (si lo pide)   | `https://holded.verifactu.business/conectores/claude/dpa`                                           |
| Support channel        | `mailto:soporte@verifactu.business` o `https://holded.verifactu.business/conectores/claude/soporte` |

### Test account

Adjuntar el `.txt` con credenciales y guion preparados en 1.5.

### Launch readiness

| Campo           | Valor                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| GA date         | Fecha desde la cual está en producción estable (puede ser hoy si todo está validado). |
| Surfaces tested | Claude.ai web (mínimo). Si has probado también Desktop y mobile, mejor.               |

### Branding

| Campo                   | Valor                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Server logo             | URL: `https://claude.verifactu.business/holded-diamond-logo.png` (o subir SVG si Holded te ha pasado uno). |
| Favicon                 | URL: `https://claude.verifactu.business/favicon.ico`                                                       |
| Promotional screenshots | **No aplica** — solo se piden para "MCP Apps" (con UI interactiva). Tu MCP no expone UI custom.            |

### Policy & requirements checklists

Marcar:

- ✅ Cumple la directory policy
- ✅ OAuth 2.0 (DCR)
- ✅ HTTPS
- ✅ Origin-header validation no demasiado estricta
- ✅ Tool annotations
- ✅ Documentación pública
- ✅ Testing standards

---

## Parte 3 — Después de enviar

> _"All submissions go through one standard review process; there is no expedited track. Review times vary with queue volume."_

No hay SLA público. Mientras esperas:

1. Mantén el server estable: si el dominio cae durante la review, te rechazan.
2. Si los reviewers contactan, responde rápido por el email del support channel.
3. No publiques en redes que ya está aprobado hasta recibir confirmación oficial — Anthropic lo verifica.

Si te rechazan: lo más común son anotaciones faltantes, descripción que no coincide con comportamiento real, o privacy policy incompleta. Corrige y resubmite.

---

## Parte 4 — Riesgos específicos del Holded MCP

Cosas que un reviewer puede marcar y cómo argumentar:

**"El dominio claude.verifactu.business no es de Holded."** → Argumento: Anthropic acepta "APIs you legitimately proxy". El conector lo opera Verifactu como tercero usando la API pública documentada de Holded y la API key que el propio usuario provee. Dejar claro en la descripción que es **no oficial** si Holded no lo ha endorsado, o conseguir un endorsement de Holded antes de submitir si quieres aparecer como conector "oficial".

**"`create_invoice_draft` puede emitir facturas reales."** → Argumento: el código fuerza `approveDoc=false` a nivel de servidor (no se puede sobreescribir desde el input), y `test/create-invoice-draft.test.ts` lo verifica. Adjuntar referencia al fichero del audit.

**"El servidor cifra la API key del usuario en reposo, ¿con qué clave?"** → Argumento: AES-256-GCM con `OAUTH_DATA_ENCRYPTION_SECRET` separado del `OAUTH_JWT_SECRET`, ambos cargados de variables de entorno y no commiteados. Storage en Postgres con TTL. Documentado en el README.

**Datos personales de los contactos de Holded llegan a Claude.** → Argumento: el flujo es bajo demanda, no hay sync masivo. Cada tool call devuelve solo lo que el usuario pidió. Documentar en `/privacy` el patrón "in-transit only, no persistence beyond OAuth session metadata".

---

## Apéndice — Checklist 1 minuto antes de pulsar Submit

- [ ] `npm test` verde local
- [ ] Despliegue Vercel al día
- [ ] `/health` 200
- [ ] `/.well-known/oauth-authorization-server` y `/.well-known/oauth-protected-resource` < 5 s
- [ ] `/docs`, `/privacy`, `/dpa` HTML válido
- [ ] `/favicon.png`, `/logo.png`, `/icon.png` devuelven el rombo PNG (no la V SVG)
- [ ] Conector custom funciona end-to-end en claude.ai con cuenta demo
- [ ] `create_invoice_draft` deja documento como **Borrador** en Holded UI
- [ ] MCP Inspector: `tools/list` devuelve 24 tools, todas con annotations
- [ ] Cuenta Holded demo poblada (5+ facturas, 5+ contactos, 5+ productos, etc.)
- [ ] Privacy policy contiene los 5 puntos exigidos
- [ ] Plantilla de descripción y use cases preparada
- [ ] Branding URLs todas accesibles públicamente
