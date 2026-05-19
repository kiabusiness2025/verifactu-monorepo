# Branding Assets — Holded × Claude

## Logo principal

**URL público:** `https://claude-holded.verifactu.business/holded-diamond-logo.png?v=holded-diamond-2026-05-18`

**Características:**

- Formato: PNG con fondo transparente
- Dimensiones: 512×512
- Forma: rombo Holded (diamond) en color corporativo `#FF5460`
- Variantes en repo:
  - `apps/holded-mcp/public/holded-diamond-logo.png`
  - `apps/holded/public/brand/holded/holded-diamond-logo.png`

## Logo SVG (recomendado para Anthropic)

**Status:** PENDIENTE — Anthropic prefiere SVG. Hay que extraer/convertir el PNG a SVG vectorial.

**Plan:**

1. Pedir a diseño el SVG original del logo Holded (no rasterizado)
2. Sanitizar: sin scripts, sin gradients custom, viewBox cuadrado `0 0 512 512`
3. Subir a `apps/holded-mcp/public/holded-diamond-logo.svg`
4. Validar que se renderiza igual que el PNG en Anthropic's preview

**Workaround temporal:** Si no hay SVG disponible, usar el PNG de 512×512 actual — el form acepta ambos.

## Favicon

**URL:** `https://claude-holded.verifactu.business/favicon.ico`

**Características:**

- 32×32 ICO multi-resolución (16, 32, 48 px)
- Mismo diamond pero simplificado para renderizar bien a tamaño pequeño

## Promotional screenshots (3-5)

Anthropic exige screenshots del connector "in action" en Claude. Plan:

### Screenshot 1 — Consent screen

**URL temporal:** `outputs/hero_preview/b-auth-apikey.png` (del hero mock)

Mostrar: usuario pega API key, ve el consent screen "Conecta Holded con Claude" con los 6 permisos en lenguaje humano.

### Screenshot 2 — Tool call (read)

Mostrar: Claude responde a "¿Cuánto facturé en marzo?" usando `list_documents`, con el resultado renderizado (bar chart Top 3 clientes).

### Screenshot 3 — Confirmation flow (write)

Mostrar: Claude muestra el resumen del borrador a crear, usuario confirma "Sí", luego "✓ Borrador F0031 creado".

### Screenshot 4 — Tool catalog

Mostrar: las 8 tools del catálogo (submission v2) listadas en `/conectores/claude/docs`.

### Screenshot 5 — Multi-tool use case

Mostrar: Claude combinando `get_contact` + `list_documents` para responder "Cuánto me debe Kappa Digital?".

## Sources reutilizables (ya generados para ChatGPT)

En el folder `outputs/hero_preview/` tenemos screenshots del hero mock animation que pueden adaptarse. **Solo necesitamos los que cubren las 8 tools de submission v2**; los demás stills se reservan para submission v3:

| File                   | Tool                                   | Submission v2 |
| ---------------------- | -------------------------------------- | ------------- |
| `b-auth-apikey.png`    | OAuth consent screen (no es tool)      | ✅ usar       |
| `d-invoices.png`       | `list_documents`                       | ✅ usar       |
| `e-contact.png`        | `get_contact`                          | ✅ usar       |
| `g-ledger.png`         | `get_journal` (era `get_daily_book`)   | ✅ usar       |
| `j-draft-confirm.png`  | `create_invoice_draft` confirmation    | ✅ usar       |
| `f-products-stock.png` | `list_products_stock` (no expuesta)    | reservado v3  |
| `h-treasury.png`       | `list_treasury_accounts` (no expuesta) | reservado v3  |
| `i-projects.png`       | `list_projects` (no expuesta)          | reservado v3  |

**Acción recomendada:** Re-grabar el hero mock con branding Claude (orange `#d97757` en vez de ChatGPT green) y exportar los stills equivalentes a `outputs/hero_preview_claude/`.

## Hero video mock

**ChatGPT version (ya existe):** `outputs/hero-mock-chatgpt.mp4` (1.7 MB, 39s)

**Claude version (pendiente):** Re-grabar con:

- Cambiar `chatgpt-logo.png` → `claude-logo.svg` (existe en `apps/holded/public/brand/claude-logo.svg`)
- Cambiar verdes (`#10a37f`) → orange Claude (`#d97757`)
- Cambiar URL "chatgpt.com/connectors" → URL Claude equivalente
- Outro tagline: "Holded · Claude — Conecta tu cuenta en menos de 2 minutos"

**Lugar de despliegue:** `apps/holded/public/demo/hero-mock-claude.mp4`

## Colors

| Uso                               | Hex       | Donde                                 |
| --------------------------------- | --------- | ------------------------------------- |
| Holded primary (rojo coral)       | `#FF5460` | Logo, accent en consent screen Claude |
| Claude primary (orange Anthropic) | `#d97757` | Botones de acción en consent screen   |
| Anthropic warm beige              | `#f5f0e8` | Backgrounds suaves                    |
| Texto principal                   | `#0f172a` | Headlines                             |
| Texto secundario                  | `#64748b` | Sub-texto, hints                      |

## Submission delivery

Para el form de Anthropic:

- **Logo URL:** pegar `https://claude-holded.verifactu.business/holded-diamond-logo.png?v=holded-diamond-2026-05-18`
- **Logo SVG:** subir el archivo si lo conseguimos
- **Screenshots:** subir 3-5 imágenes PNG/JPG, ≤2MB cada una, 1920×1080 o 1280×800

## Acción inmediata pendiente

- [ ] Verificar que el SVG del Holded diamond está disponible (preguntar a diseño)
- [ ] Re-grabar hero mock con branding Claude (re-uso del script `record_parts.js`)
- [ ] Exportar 3-5 screenshots PNG a `outputs/hero_preview_claude/`
- [ ] Subir a CDN público si se requieren URLs (Vercel + apps/holded/public/demo-anthropic/)
