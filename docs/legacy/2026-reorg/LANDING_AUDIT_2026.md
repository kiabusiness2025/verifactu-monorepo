# Auditoría visual landings — Conector Holded + Isaak

Fecha: 2026-05-03
Auditor: Claude (sesión Cowork via Chrome MCP)
URLs auditadas:

- `https://holded.verifactu.business/conectores/claude`
- `https://isaak.verifactu.business/`
  Viewport: 1280×900 (desktop), tab activa.

---

## TL;DR — los 5 cambios de mayor impacto

| #     | Severidad     | Página                     | Hallazgo                                                                                                                                                                           | Impacto                                                                                         |
| ----- | ------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **1** | 🔴 BLOQUEANTE | `/conectores/claude`       | **El deploy de hoy NO está aplicado.** El banner "Plan Gratis Para Siempre" que añadí no aparece. El status sigue diciendo "Disponible en acceso controlado"                       | Misalignment entre tu mensaje de marketing y lo que ven los visitantes                          |
| **2** | 🟠 HIGH       | `/conectores/claude`       | **Logo Claude vacío** (círculo blanco) en el hero junto al rombo Holded. El asset `/brand/claude-logo.svg` no carga                                                                | Branding débil en la primera mirada                                                             |
| **3** | 🟠 HIGH       | `/conectores/claude`       | **Solo 5 capabilities visibles** (Facturas, Contactos, Cuentas, Diario, Borradores) de las 24 tools que tiene tu MCP                                                               | Vendes menos de lo que tienes — miss en stock, tesorería, CRM, proyectos, PDFs                  |
| **4** | 🟠 HIGH       | `isaak.verifactu.business` | **CTA principal "Solicitar acceso"** cierra el funnel. No hay "Probar gratis" ni mención de plan free                                                                              | Contradicción con la estrategia freemium ("free para siempre" del MCP, trial Isaak con tarjeta) |
| **5** | 🟠 HIGH       | Ambas                      | **Cross-link entre las dos landings ausente o muy débil**. Quien aterriza en `/conectores/claude` no descubre Isaak; quien aterriza en Isaak no ve el conector como entrada gratis | Funnel completamente roto entre los dos productos                                               |

---

## A. Auditoría `holded.verifactu.business/conectores/claude`

### A.1 Hero (above the fold)

**Lo que se ve:**

- Header limpio: rombo Holded rojo + "Holded — Hub vertical de conectores" + 2 CTAs ("Solicitar demo" outline / "Iniciar y conectar" rojo)
- Avatar Isaak (azul) bottom-right con widget "Claude is active in this tab group" (es la extensión Claude del navegador, no el chat de Isaak — se confunden visualmente)
- Logos: rombo Holded rojo + "+" + **círculo BLANCO VACÍO** donde debería ir el logo de Claude
- Pill "CONECTOR HOLDED PARA CLAUDE" en amber
- H1: "**Trabaja con datos clave de Holded desde Claude.**"
- Subtítulo correcto, 3 líneas
- 4 CTAs: "Conectar con Claude" (naranja, principal) / Ver demo / Cómo conectar / Soporte
- Trust chips: "Solo lectura por defecto" / "Borradores con confirmación" / "Tenant-scoped" / "Credenciales server-side"
- Footer status: "Disponible en acceso controlado"

**Problemas y fixes:**

| #     | Hallazgo                                                                                                     | Fix                                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A.1.1 | Banner "Plan Gratis Para Siempre" añadido hoy en código NO está aplicado. Falta `git push` + redeploy Vercel | Tú: ejecuta el push pendiente                                                                                                                                             |
| A.1.2 | Logo Claude vacío. `cfg.logoSrc = '/brand/claude-logo.svg'` apunta a un asset que no existe o no carga       | Verificar existencia de `apps/holded/public/brand/claude-logo.svg`. Si falta, descargar de https://www.anthropic.com/brand y subirlo. Probable que falte en Vercel deploy |
| A.1.3 | Status "Disponible en acceso controlado" contradice el mensaje "free para siempre"                           | Cambiar `process.env.NEXT_PUBLIC_HOLDED_CLAUDE_CONNECTOR_STATUS` a `"Disponible — Plan gratis para siempre durante el lanzamiento"` o similar                             |
| A.1.4 | Hero no contiene la palabra "GRATIS" — clave para conversion en ESP                                          | Añadir como subtítulo o chip muy visible: "Sin tarjeta · Sin límites en lanzamiento · Gratis para siempre"                                                                |
| A.1.5 | "Conectar con Claude" suena raro al visitante que no está en Claude todavía                                  | Cambiar a "Conectar mi Holded con Claude — gratis" o "Probar gratis en Claude"                                                                                            |

### A.2 Sección "Alcance validado" (capabilities)

**Lo que se ve:** 5 cards con icono + título + descripción + nombres de tools por debajo.

| Capability            | Tools mostradas                  |
| --------------------- | -------------------------------- |
| Facturas              | `list_documents`, `get_document` |
| Contactos             | `list_contacts`, `get_contact`   |
| Cuentas contables     | `get_chart_of_accounts`          |
| Diario contable       | `get_journal`, `get_daily_book`  |
| Borradores de factura | `create_invoice_draft`           |

**Total: 8 tools de 24.**

**Las 16 tools ocultas** (tu inventario real):

- `get_document_pdf` (la más viral en LinkedIn según tu pista de marketing)
- `list_products`, `get_product`, `list_products_stock`, `list_warehouses`
- `list_treasury_accounts`
- `list_taxes`, `list_numbering_series`
- `list_projects`, `get_project`, `list_project_tasks`, `list_time_records`
- `list_employees`, `get_employee`
- `list_crm_funnels`, `list_leads`

**Fix recomendado:** ampliar `CAPABILITIES` en `apps/holded/app/components/ConnectorLandingClient.tsx` a 9-10 cards organizadas en 2 filas de grid 5×2:

| Fila 1 — operativa diaria                                                       | Fila 2 — análisis y avanzado                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Facturas (list_documents, get_document, get_document_pdf)                       | Stock e inventario (list_products_stock, list_warehouses)                |
| Contactos y CRM (list_contacts, get_contact, list_crm_funnels, list_leads)      | Tesorería (list_treasury_accounts)                                       |
| Productos (list_products, get_product)                                          | Proyectos y horas (list_projects, list_project_tasks, list_time_records) |
| Cuentas contables y diario (get_chart_of_accounts, get_journal, get_daily_book) | Equipo (list_employees, get_employee)                                    |
| Borradores de factura (create_invoice_draft, list_taxes, list_numbering_series) | Configuración fiscal (list_taxes, list_numbering_series) — opcional      |

### A.3 Sección "Cómo funciona"

**Lo que se ve:** 3 pasos numerados (01 Abre la documentación / 02 Autoriza la conexión / 03 Pregunta con control) con iconos y descripciones cortas.

**Fortalezas:** estructura impecable, lenguaje claro.

**Mejora menor:** el paso 01 dice "Sigue el flujo del conector Holded para Claude. Cada página mantiene enlaces exclusivos a su propia documentación, soporte y demo." — es meta, no acción. Mejor: "Abre Claude.ai → Settings → Connectors → Add custom connector → pega `claude.verifactu.business/mcp`."

### A.4 Sección "Seguridad y alcance"

**Lo que se ve:** título "Solo lectura por defecto. Borradores con confirmación." + 4 puntos check (tenant-scoped, credenciales server-side, solo lectura, no envía/cobra/elimina).

**Fortaleza:** vendor positioning de seguridad muy fuerte. Es lo que necesita un fiscalista para autorizar.

### A.5 Sección "Soporte"

**Lo que se ve:** 3 vías separadas: Chat con Isaak / Formulario autenticado / Email directo.

**Fortaleza:** Chat con Isaak es el primer cross-link a Isaak — bien.

**Fix:** el chat actual es la **extensión Claude del navegador**, no Isaak. La card "Chat con Isaak" abre `/support/chat?source=claude_connector&prompt=...` que es la app interna de Isaak. Confusión visible: hay TRES chats compitiendo por atención (extensión Claude + widget Isaak floating + card del soporte). Recomendación: ocultar el widget floating de Isaak en esta página específica para no canibalizar el flujo de "soporte por chat".

### A.6 Footer / CTA final

**Lo que se ve:**

- Badge "Operado por Verifactu Business - no por Anthropic ni Holded" — perfecto disclaimer
- H2: "Conecta tu cuenta de Holded con Claude."
- 3 CTAs (Conectar / Ver demo / Documentación)
- Sub-footer links: Docs / Privacidad / DPA / Soporte / Aviso legal
- Footer principal con 3 columnas: CONECTORES / SOPORTE / LEGAL

**Fortaleza:** disclaimer de no-afiliación es exactamente lo que Anthropic quiere ver.

**Fixes:**

| #     | Hallazgo                                                                                                                          | Fix                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A.6.1 | Footer no tiene CTA fuerte hacia Isaak                                                                                            | Añadir bloque "¿Te gusta el conector? Lo que ofrece Isaak es 10× más → isaak.verifactu.business" |
| A.6.2 | Footer link "Aviso legal" apunta a `/legal` (genérico). Mejor `/conectores/claude/terms` para mantener especificidad por conector | Cambiar el href en `ConnectorLandingClient.tsx`                                                  |
| A.6.3 | No hay "Hub de conectores" en sub-footer                                                                                          | Sí está en footer principal — OK, pero podría duplicarse en sub-footer para más visibilidad      |

---

## B. Auditoría `isaak.verifactu.business/`

### B.1 Hero (above the fold)

**Lo que se ve:**

- Header con avatar Isaak azul + "Isaak — Orquestador empresarial"
- Nav: Producto / Modo Excel / Conectores / Developers / Asesorías / Seguridad/permisos / Solicitar acceso
- 2 CTAs en header: "Solicitar acceso" (outline) + "Abrir Isaak" (azul fuerte)
- Pill "ORQUESTADOR EMPRESARIAL" (light blue)
- H1 muy potente: "**Habla con tu empresa. Entiende tus datos. Ejecuta con control.**"
- Subtítulo claro 2 párrafos
- Diferenciación explícita: "Isaak no es otro ERP. Es la capa inteligente..."
- 4 CTAs hero: Solicitar acceso / Ver modo Excel / Conectar herramientas / Soy asesoría

**Fortalezas:**

- H1 entre los mejores que he visto en SaaS español B2B
- Diferenciación inmediata
- Tono confiado, no defensivo

**Problemas:**

| #     | Hallazgo                                                                                                                                               | Fix                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B.1.1 | CTA principal "Solicitar acceso" cierra el funnel. Da idea de waitlist o lead capture, NO de producto disponible                                       | Si Isaak ya está disponible: cambiar a "**Empieza gratis 14 días**" (CTA azul) + secundario "Ver demo". Si todavía es waitlist, mantener — pero entonces aclarar fechas |
| B.1.2 | "Abrir Isaak" en el header sugiere que ya hay app pública, pero la conversion principal está bloqueada por "Solicitar acceso" — mensaje contradictorio | Decidir entre: (a) Self-service real con sign-up + Stripe checkout / (b) Waitlist con fecha de GA. Hoy el visitante no entiende cuál de los dos eres                    |
| B.1.3 | NO hay mención del conector Holded MCP gratuito como entrada                                                                                           | Añadir en hero o sub-hero: "¿No quieres comprometerte aún? Prueba primero nuestro **conector Holded gratis en Claude** → /conectores/claude"                            |
| B.1.4 | NO hay pricing visible. Para tomar decisión de compra el visitante necesita ver tiers                                                                  | Crear `/pricing` con los 4 tiers (Free MCP / Starter €9 / Pro €29 / Empresa €79) tipo grid o pricing table                                                              |

### B.2 Sección "DOS MODOS DE ENTRADA"

**Lo que se ve:** card "Modo in-house / Excel" — para empresas que trabajan con Excel.

**Fortaleza:** posicionamiento muy listo — alcanza a empresas que NO tienen ERP todavía. Diferencia de cualquier competidor.

**Falta ver el segundo modo** en el scroll — probablemente "Modo conectado / ERP" para los que ya tienen Holded etc.

### B.3 Sección "PERMISOS Y CONTROL"

**Lo que se ve:** título "Modo lectura, modo ejecución y permisos configurados por usuario." + 3 cards (Modo lectura / [intermedio] / Aprobación trazable).

**Fortaleza:** confirma tu B.6 ("permisos por usuario en Isaak") — diferencia de muchos SaaS que tratan a todos los usuarios igual.

**Fix:** mejorar contraste — los iconos lock azules son débiles. Mejor un visual tipo permisos matrix / RBAC.

### B.4 Sección "Casos de uso"

**Lo que se ve:** 7 chips con preguntas reales:

1. ¿Qué facturas faltan para cerrar el trimestre?
2. ¿Qué IVA aproximado llevo acumulado?
3. Prepara un resumen para mi asesoría.
4. Revisa si hay datos incompletos.
5. Genera una acción pendiente.
6. **Conecta Holded y consulta tus facturas.** ← el único que cross-linkea
7. Trabaja desde Excel sin migrar todo tu negocio.

**Fortaleza:** las preguntas concretas venden por sí solas — una lista mejor que 1000 features.

**Fix:** el chip "Conecta Holded y consulta tus facturas" debería ser CLICABLE y llevar a `/conectores/claude`. Hoy es solo texto.

### B.5 Sección "Conecta Holded y futuros sistemas sin convertir a Isaak en un plugin"

**Lo que se ve:** banner azul oscuro con explicación de la arquitectura — Holded es el primer ecosistema conectado, Isaak es la capa de interpretación.

**Fortaleza:** super honesta y clara. Posicionamiento correcto.

**Fix:** añadir CTA directo aquí: "Empieza con el conector Holded gratis → /conectores/claude" + "Ve más allá con Isaak — Empieza prueba 14 días gratis".

### B.6 Widget floating "Hablar con Isaak — Chat activo"

**Lo que se ve:** widget azul abajo a la derecha, "Chat activo" con icono.

**Fortaleza:** demo viva del producto en la propia landing — convertion booster clásico.

**Fix:** asegurar que el chat REALMENTE responda con la propuesta de valor de Isaak, no con un FAQ genérico. Si responde con "lo siento, soy un bot, escribe a soporte" → mata la demo.

### B.7 Falta auditar (queda fuera de viewport en este scroll)

- Pricing page (no la vi — probablemente no exista todavía)
- Sección Asesorías (mencionada en nav)
- Sección Developers (mencionada en nav, importante para devs MCP)
- Footer completo
- Versión mobile (no probada — viewport 1280)

---

## C. Cross-linking entre las dos landings

| Link existente                                                    | Calidad                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `/conectores/claude` → Isaak (en Soporte → "Chat con Isaak")      | 🟡 débil — solo en sección soporte, no como upsell directo |
| `/conectores/claude` → Isaak (footer)                             | ❌ ausente                                                 |
| Isaak → `/conectores/claude` (chip casos de uso "Conecta Holded") | 🟡 débil — chip no clicable                                |
| Isaak → `/conectores/claude` (nav "Conectores")                   | ✅ existe — bien                                           |
| Isaak → `/conectores/claude` (banner "ecosistema conectado")      | 🟡 débil — banner sin CTA                                  |

**Recomendación clave:** crear un cross-link STRONG en cada página:

- En `/conectores/claude` (después de capabilities): banner "🚀 ¿Quieres más? Isaak hace lo mismo + memoria + libros AEAT + sync ERP. Empieza gratis 14 días → isaak.verifactu.business"
- En Isaak (en hero o segunda fold): "👋 ¿Vienes de Holded? Empieza gratis con nuestro conector en Claude → /conectores/claude"

---

## D. SEO y metadata (verificación pendiente)

No pude ejecutar JS de auditoría (Chrome MCP bloquea por privacidad), pero por inspección de código puedo confirmar:

- **`/conectores/claude/page.tsx`** → metadata declarada con `title`, `description`, `canonical: '/conectores/claude'` ✅
- **`isaak.verifactu.business/`** → tab title "Isaak | Orquestador empresarial inteligente" ✅
- **Falta verificar manualmente** en navegador: og:image (necesario para LinkedIn previews), JSON-LD structured data, sitemap.xml, robots.txt

**Recomendación:** ejecutar audit Lighthouse desde DevTools de Chrome en cada landing y compartir el JSON. Te puedo ayudar a interpretar.

---

## E. Plan de fixes priorizado

### MUST (antes de empujar tráfico mañana)

- [ ] **`git push`** de los commits ya pendientes — el banner "Plan Gratis Para Siempre" debe aparecer en la landing
- [ ] **Subir el SVG del logo Claude** a `apps/holded/public/brand/claude-logo.svg` — descargar de https://www.anthropic.com/brand y subir
- [ ] **Cambiar status de la landing** de "Disponible en acceso controlado" a "Plan gratis para siempre · sin límites en lanzamiento"
- [ ] **CTA hero más fuerte**: añadir chip o subtítulo con "Sin tarjeta · Sin límites · Gratis para siempre"
- [ ] **Verificar Lighthouse** en ambas landings (mobile + desktop)

### SHOULD (esta semana)

- [ ] **Ampliar capabilities** de 5 a 9-10 en `ConnectorLandingClient.tsx` — incluir Stock, Tesorería, CRM, Proyectos, PDF
- [ ] **Cross-link strong** desde `/conectores/claude` hacia Isaak (banner con CTA después de capabilities)
- [ ] **Cross-link strong** desde Isaak hacia `/conectores/claude` (sub-hero "¿Vienes de Holded?")
- [ ] **Decidir Isaak: self-service vs waitlist** y alinear CTA principal acordemente
- [ ] **Crear `/pricing`** en Isaak con grid 4 tiers (Free MCP / Starter / Pro / Empresa)

### NICE-TO-HAVE (mes 1)

- [ ] **Versión vídeo demo** embebida en hero (los GIFs del doc 24-GIFs sirven)
- [ ] **Logos de clientes / testimonios** una vez tengas 5+ usuarios reales
- [ ] **Calculadora de ROI** ("Ahorra X horas/mes vs Excel manual")
- [ ] **A/B test del CTA principal** (Probar gratis vs Conectar con Claude vs Empieza ahora)
- [ ] **Ocultar el widget Isaak floating** en `/conectores/claude` para no canibalizar el chat de la página de soporte

---

## F. Resumen ejecutivo

| Página                         | Estado                                 | Acción inmediata                                                      |
| ------------------------------ | -------------------------------------- | --------------------------------------------------------------------- |
| **`/conectores/claude`**       | 🟡 80% lista                           | Push del deploy + cargar logo Claude + ampliar capabilities a 10      |
| **`isaak.verifactu.business`** | 🟢 90% lista en mensaje, 60% en funnel | Decidir self-service vs waitlist + crear /pricing + cross-link al MCP |
| **Cross-link entre las dos**   | 🔴 funnel roto                         | Banner upsell desde MCP → Isaak Y banner entrada desde Isaak → MCP    |

Las dos landings son **muy buenas individualmente** pero **NO funcionan como funnel conjunto**. El visitante de Isaak no descubre el conector gratuito (debería ser tu hook principal porque es lo que tienes ya) y el visitante del conector no descubre Isaak (perdiendo el upsell que es el motor de ingresos del plan).

Arreglar el cross-link es **el cambio individual de mayor ROI** que puedes hacer mañana — son 4 ediciones de copy + 2 botones nuevos, y duplicas la conversion del funnel completo.
