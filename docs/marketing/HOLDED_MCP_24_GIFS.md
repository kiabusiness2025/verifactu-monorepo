# Holded MCP — 24 GIFs + 1 vídeo YouTube — guiones de grabación

Fecha: 2026-05-03
Audiencia: marketing + founder (grabación)
Objetivo: 24 GIFs cortos (10-25 s cada uno) para LinkedIn / Twitter / web + 1 vídeo YouTube de 90 s.

---

## Setup común antes de grabar

1. **Cuenta Holded demo Nova Gestión** con datos limpios 2025 + 2026 (cierre fiscal en curso, Modelo IS, CCAA).
2. **Claude.ai** abierto en navegador con el conector Holded conectado (24 tools visibles bajo "Web → Holded PERSONALIZADO").
3. **Configuración de pantalla**: navegador maximizado a **1280×800** (relación cómoda para GIFs en LinkedIn). Zoom 110-120 % para que la fuente se vea grande en miniatura.
4. **Claude Settings → Display**: tema light. Esconder sidebar (collapse) para más espacio al chat.
5. **Herramienta de grabación**: Chrome MCP `gif_creator` con click indicators activados, action labels en español, watermark Verifactu si quieres branding.
6. **Cada GIF empieza** con el cursor en el input vacío. **Cada GIF acaba** cuando Claude termina de renderizar la respuesta (no esperes el "stream completado", basta con que se vea la respuesta útil).
7. **No mostrar la API key ni datos PII reales** — Nova Gestión ya tiene datos sintéticos.

---

## Cluster 1 — Estado de facturación (alto impacto comercial)

Los más demandados por autónomos y PYMES. Empiezan por aquí en LinkedIn.

### GIF 01 · Estado de cobros pendientes

- **Prompt**: `¿Qué facturas tengo pendientes de cobro? Agrúpalas por cliente y muéstrame los días vencidos.`
- **Claude muestra**: tabla markdown con cliente / nº factura / importe / días vencidos. Las que llevan >30 días en rojo o con ⚠️.
- **Tools**: `list_documents(invoice)` filtrado por status pendiente + `get_contact` por cada cliente único.
- **Caption LinkedIn**: _"Tu Holded en Claude — pregunta '¿qué facturas tengo pendientes?' y obtienes la lista agrupada por cliente con vencimientos. Sin abrir el ERP. Gratis para siempre. → holded.verifactu.business/conectores/claude"_
- **Duración**: 18-22 s

### GIF 02 · Top 5 clientes por facturación

- **Prompt**: `Top 5 clientes por facturación en 2025, con totales y % sobre el total.`
- **Claude muestra**: ranking con barra ASCII o emoji de barras (📊). Cifras en €.
- **Tools**: `list_documents(invoice, starttmp=2025-01-01, endtmp=2025-12-31)` + agregación por contactId.
- **Caption**: _"¿Qué cliente vale más para tu negocio? Pregunta a Claude y te lo dice en 5 segundos. Tu Holded sin abrir Holded."_
- **Duración**: 15-18 s

### GIF 03 · Total impagado por antigüedad

- **Prompt**: `Dame el total impagado por tramos de antigüedad: 0-30 días, 31-60, 61-90 y +90 días.`
- **Claude muestra**: tabla aging buckets con totales €. Es exactamente como el aging report de un ERP.
- **Tools**: `list_documents(invoice)` con filtro de status no pagado, agrupado en código por Claude.
- **Caption**: _"Aging report al instante. Pídeselo a Claude conectado a Holded — sin extracción, sin Excel, sin stress."_
- **Duración**: 18-22 s

### GIF 04 · Histórico de un cliente concreto

- **Prompt**: `Histórico completo con Kappa Digital Zaragoza: facturas, importes y estado de cobro.`
- **Claude muestra**: línea temporal de facturas + total facturado + total cobrado + saldo pendiente.
- **Tools**: `list_contacts` (buscar Kappa) + `list_documents(invoice, contactId=...)`
- **Caption**: _"Llamada de un cliente preguntando por su histórico. Pregunta a Claude antes de coger el teléfono. Holded + Claude = atención al cliente sin esfuerzo."_
- **Duración**: 20-25 s

### GIF 05 · PDF de factura para enviar al cliente

- **Prompt**: `Dame el PDF de la factura F0030 para enviarla por email.`
- **Claude muestra**: confirma que tiene el PDF de la factura específica, descripción del documento + tamaño en KB (en realidad vuelve un base64 que Claude no enseña entero, pero confirma).
- **Tools**: `list_documents(invoice)` para encontrar el ID de F0030 + `get_document_pdf(invoice, ID)`.
- **Caption**: _"Factura emitida = PDF disponible. Pídeselo a Claude y lo tienes en segundos. Sin abrir Holded ni buscar."_
- **Duración**: 12-15 s

---

## Cluster 2 — Visualización e informes (MUY alto impacto)

Lo que pediste: dashboard, gráficos, balances, informes. Claude renderiza tablas markdown y gráficos ASCII/emoji que son super virales en LinkedIn.

### GIF 06 · Mini-dashboard de ventas mensual

- **Prompt**: `Hazme un mini dashboard de ventas mensual de 2025: total facturado, número de facturas, ticket medio, mes mejor y mes peor.`
- **Claude muestra**: 4 KPI cards markdown + tabla mes-a-mes + identificación de mejor/peor mes.
- **Tools**: `list_documents(invoice, starttmp=2025-01-01, endtmp=2025-12-31)` con agrupación por mes.
- **Caption**: _"Dashboard de ventas en lenguaje natural. Sin Power BI. Sin abrir el ERP. Holded + Claude."_
- **Duración**: 22-25 s

### GIF 07 · Comparativa interanual 2024 vs 2025

- **Prompt**: `Compara mi facturación 2024 vs 2025 mes a mes y dime el % de crecimiento.`
- **Claude muestra**: tabla 2 columnas + columna de % crecimiento (con flecha verde/roja según signo).
- **Tools**: `list_documents(invoice)` para los dos años.
- **Caption**: _"¿Estás creciendo? Pregúntaselo a Claude. Con Holded conectado, las respuestas son tuyas en 10 segundos."_
- **Duración**: 22-25 s

### GIF 08 · Cuenta de pérdidas y ganancias simplificada

- **Prompt**: `Hazme una PyG simplificada de 2025: ingresos por ventas, gastos por compras, margen bruto, total impuestos y resultado estimado.`
- **Claude muestra**: bloque tipo PyG con líneas Ingresos / Gastos / EBITDA / Resultado. **Avisa que es estimación basada en datos disponibles**.
- **Tools**: `list_documents(invoice)` + `list_documents(purchase)` + `get_journal` para cuentas de gastos.
- **Caption**: _"PyG en 30 segundos preguntando a Claude. Sin filtros, sin tablas dinámicas. Solo Holded + Claude."_
- **Duración**: 25-30 s

### GIF 09 · Tesorería actual

- **Prompt**: `¿Cuánto tengo en cada cuenta bancaria ahora mismo? Dame el total.`
- **Claude muestra**: tabla de cuentas con saldos + total agregado al final.
- **Tools**: `list_treasury_accounts`.
- **Caption**: _"Saldo total en bancos al instante. Sin abrir Holded. Pregúntaselo a Claude."_
- **Duración**: 10-12 s

### GIF 10 · Top productos vendidos

- **Prompt**: `¿Cuáles son los productos o servicios que más he facturado en 2025? Dame el top 5 con unidades y total facturado.`
- **Claude muestra**: ranking de productos con barras ASCII y unidades + €.
- **Tools**: `list_documents(invoice, starttmp=2025-01-01, endtmp=2025-12-31)` agrupado por nombre de producto.
- **Caption**: _"Tu producto estrella en una pregunta. Holded + Claude — el ERP en lenguaje natural."_
- **Duración**: 18-22 s

---

## Cluster 3 — Interpretación fiscal (diferencial vs competidores)

Aquí Claude no solo lista — interpreta. Es lo que distingue Claude de cualquier dashboard estático.

### GIF 11 · Estimación de IVA del trimestre (Modelo 303)

- **Prompt**: `Estima mi IVA del último trimestre: IVA repercutido vs IVA soportado y resultado a ingresar o devolver.`
- **Claude muestra**: tabla con desglose IVA repercutido / soportado por tipo + resultado neto + recordatorio "esto es estimación, comprobar antes de presentar 303".
- **Tools**: `list_documents(invoice)` + `list_documents(purchase)` últimos 3 meses.
- **Caption**: _"Estimación del Modelo 303 en 20 segundos. Confirmamos en Isaak la presentación oficial. Holded → Claude → IVA al día."_
- **Duración**: 25-30 s

### GIF 12 · Previsión de Impuesto de Sociedades 2025

- **Prompt**: `Hazme una previsión orientativa del Impuesto de Sociedades 2025: base imponible estimada, tipo aplicable, cuota a pagar.`
- **Claude muestra**: bloque con cálculo paso a paso + advertencia de que es estimación + sugerencia "para presentación oficial usa Isaak con todas las correcciones contables".
- **Tools**: `list_documents(invoice/purchase 2025)` + `get_journal(2025)` + `get_chart_of_accounts`.
- **Caption**: _"En plena campaña de cierre fiscal: pregúntale a Claude la previsión de tu IS 2025 antes de cerrar. Holded + Claude."_
- **Duración**: 28-32 s

### GIF 13 · Retenciones a ingresar

- **Prompt**: `¿Cuánto tengo que ingresar de retenciones IRPF a profesionales en este trimestre?`
- **Claude muestra**: lista de facturas de gasto con retención + total a ingresar.
- **Tools**: `list_documents(purchase)` con filter por tax type retención.
- **Caption**: _"Retenciones IRPF a profesionales — total al instante. Sin sumar facturas a mano. Holded + Claude."_
- **Duración**: 18-22 s

### GIF 14 · Análisis de margen por línea de producto

- **Prompt**: `¿Qué línea de producto me deja más margen en 2025? Compara precio de venta vs coste medio.`
- **Claude muestra**: tabla con producto / precio venta / coste / margen € / margen %.
- **Tools**: `list_products` + `list_documents(invoice)` agregado por producto.
- **Caption**: _"Análisis de margen por producto. En segundos. Pregunta a Claude conectado a Holded."_
- **Duración**: 22-25 s

---

## Cluster 4 — Documentos, libros y exportación

Lo que pediste: emisión PDF, descarga libros emitidas/recibidas.

### GIF 15 · Libro de facturas emitidas listo para revisar

- **Prompt**: `Lista todas las facturas emitidas de marzo 2025 con número, fecha, cliente, base imponible, IVA y total.`
- **Claude muestra**: tabla tipo libro registro AEAT (es el formato que la PYME conoce) con todas las facturas del mes.
- **Tools**: `list_documents(invoice, starttmp=2025-03-01, endtmp=2025-03-31)`.
- **Caption**: _"Libro de facturas emitidas formato AEAT en 5 segundos. Tu asesoría te lo agradece. Holded + Claude."_
- **Duración**: 22-25 s

### GIF 16 · Libro de facturas recibidas

- **Prompt**: `Hazme el libro de facturas recibidas del primer trimestre 2025 con proveedor, fecha, base, IVA soportado.`
- **Claude muestra**: tabla idéntica a la anterior pero para `purchase` documents.
- **Tools**: `list_documents(purchase, Q1-2025)`.
- **Caption**: _"Libro de gastos del Q1 al instante. Para tu asesoría, para el 303, para tu paz mental."_
- **Duración**: 22-25 s

### GIF 17 · Buscar una factura concreta y descargar PDF

- **Prompt**: `Busca la factura del cliente Theta Export del mes de marzo y dame el PDF.`
- **Claude muestra**: identifica la factura → llama `get_document_pdf` → confirma PDF disponible.
- **Tools**: `list_contacts` + `list_documents` + `get_document_pdf`.
- **Caption**: _"Factura específica + PDF en una sola conversación. Sin clicks. Pregunta y la tienes."_
- **Duración**: 18-22 s

### GIF 18 · Catálogo de productos y servicios

- **Prompt**: `Lista todo mi catálogo de productos y servicios con su precio y SKU.`
- **Claude muestra**: tabla del catálogo Holded.
- **Tools**: `list_products`.
- **Caption**: _"Catálogo en una pregunta. Tu Holded en Claude. Gratis para siempre."_
- **Duración**: 12-15 s

---

## Cluster 5 — Crear borradores y operativa de ventas

### GIF 19 · Borrador de factura básico

- **Prompt**: `Prepara un borrador de factura para Kappa Digital: 8 horas de consultoría a 90€/h con IVA 21%.`
- **Claude muestra**: borrador creado en Holded en estado **Draft**, con número, total, recordatorio "revísalo en Holded antes de aprobar".
- **Tools**: `list_contacts` (buscar Kappa) + `list_taxes` + `create_invoice_draft`.
- **Caption**: _"Borrador de factura listo en 10 segundos — pero NO se emite hasta que tú lo apruebas. Seguro por diseño. Holded + Claude."_
- **Duración**: 22-25 s

### GIF 20 · Pipeline CRM activo

- **Prompt**: `Estado de mi pipeline CRM: leads por etapa, total estimado de oportunidades.`
- **Claude muestra**: lista por etapa del embudo con count y suma de € estimado.
- **Tools**: `list_crm_funnels` + `list_leads`.
- **Caption**: _"Pipeline comercial al instante. Sin Salesforce. Holded + Claude bastan."_
- **Duración**: 18-22 s

---

## Cluster 6 — Proyectos, equipo y operaciones

### GIF 21 · Tareas de un proyecto

- **Prompt**: `Tareas pendientes del proyecto X y horas registradas hasta ahora.`
- **Claude muestra**: lista de tareas con estado + total horas registradas.
- **Tools**: `list_projects` + `list_project_tasks` + `list_time_records`.
- **Caption**: _"Estado de proyecto en una pregunta. Holded + Claude — control total sin abrir 5 pantallas."_
- **Duración**: 20-22 s

### GIF 22 · Empleados activos

- **Prompt**: `Lista los empleados activos con su puesto.`
- **Claude muestra**: tabla de empleados.
- **Tools**: `list_employees`.
- **Caption**: _"Tu equipo, en una línea. Holded conectado a Claude."_
- **Duración**: 10-12 s

### GIF 23 · Plan contable del tenant

- **Prompt**: `Dame el plan contable de mi empresa con las cuentas principales agrupadas por tipo.`
- **Claude muestra**: árbol de cuentas (1-Capital, 2-Inmovilizado, 4-Acreedores/Deudores, 6-Compras/Gastos, 7-Ventas/Ingresos).
- **Tools**: `get_chart_of_accounts`.
- **Caption**: _"Plan contable en 5 segundos. Lo que tu asesoría tarda 5 minutos en exportar. Holded + Claude."_
- **Duración**: 18-22 s

### GIF 24 · Asientos del libro diario en un periodo

- **Prompt**: `Muéstrame los asientos del libro diario de febrero 2025 con cuenta debe, cuenta haber e importe.`
- **Claude muestra**: tabla tipo libro diario.
- **Tools**: `get_journal(starttmp=2025-02-01, endtmp=2025-02-28)`.
- **Caption**: _"Libro diario en lenguaje natural. Para tu asesoría, para tu auditoría, para ti. Holded + Claude."_
- **Duración**: 20-22 s

---

## Vídeo YouTube — 90 segundos · 5 escenas

Concepto: "**Tu Holded, ahora dentro de Claude — gratis para siempre**" — montaje rápido de los 5 GIFs más impactantes con narración o subtítulos en español.

| Tiempo  | Escena                                                                                | Texto en pantalla / narración                        |
| ------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 0-5 s   | Apertura: logo Verifactu + "Conector Holded para Claude" + "Plan gratis para siempre" | Hook visual + claim                                  |
| 5-22 s  | GIF 01 — Estado de cobros pendientes                                                  | "¿Qué facturas tengo pendientes?" → tabla            |
| 22-40 s | GIF 06 — Mini dashboard de ventas                                                     | "Dashboard de ventas mensual" → KPIs en 4 cards      |
| 40-58 s | GIF 11 — Estimación IVA del trimestre                                                 | "Mi IVA del último trimestre" → desglose             |
| 58-72 s | GIF 19 — Crear borrador de factura                                                    | "Borrador de factura para Kappa" → seguro por diseño |
| 72-85 s | GIF 05 — PDF de factura concreta                                                      | "Dame el PDF de la F0030" → factura lista para email |
| 85-90 s | Cierre: CTA "Conéctalo gratis en holded.verifactu.business/conectores/claude" + logo  | Call-to-action final                                 |

**Cómo grabar el vídeo YouTube** (después de tener los 5 GIFs):

1. Usar Descript / CapCut / DaVinci Resolve free
2. Importar los 5 GIFs como clips
3. Añadir cards de transición de 2 s entre cada uno con título de la sección
4. Voz en off opcional (la usuaria con buen audio + script de los textos en pantalla)
5. Subtítulos quemados en español (LinkedIn premia subtítulos sin sonido)
6. Resolución 1280×720 mínimo, 1920×1080 ideal
7. Exportar 30 fps, MP4 H.264

---

## Plan de publicación de los 24 GIFs

| Frecuencia              | Plan                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| **Día 1 (lanzamiento)** | Vídeo YouTube + GIF 01 + GIF 06 + GIF 19 (los 3 más virales) en LinkedIn |
| **Día 2 a 14**          | 1 GIF al día en LinkedIn / Twitter, alternando clusters                  |
| **Día 15-24**           | Los 10 restantes a un ritmo de 1 cada 2-3 días                           |
| **Mes 2**               | Re-publicar los top 5 con nueva caption A/B test                         |

UTM en cada caption: `?utm_source=linkedin&utm_medium=organic&utm_campaign=launch_week_gif_NN`.

---

## Notas técnicas de grabación con Chrome MCP `gif_creator`

Yo (Claude) puedo grabar via la extensión Chrome cuando la cuenta demo esté lista. Mi flujo:

1. `gif_creator(action="start_recording", tabId=X)` antes de cada interacción
2. Navegar a `claude.ai`, abrir nuevo chat, escribir el prompt
3. Esperar a que Claude termine de renderizar la respuesta
4. `gif_creator(action="stop_recording", tabId=X)` justo cuando se ve la respuesta completa
5. `gif_creator(action="export", tabId=X, download=true, options={ showClickIndicators: true, showActionLabels: true, showProgressBar: true, showWatermark: false })` — descargar GIF
6. Repetir para cada uno de los 24

**Tiempo estimado**: 24 × ~3 min = ~75 min de grabación si la cuenta demo está perfectamente preparada y las respuestas de Claude son rápidas (sin cold start de Vercel).

---

## Lista rápida de prompts (para copy/paste rápido)

```
01. ¿Qué facturas tengo pendientes de cobro? Agrúpalas por cliente y muéstrame los días vencidos.
02. Top 5 clientes por facturación en 2025, con totales y % sobre el total.
03. Dame el total impagado por tramos de antigüedad: 0-30 días, 31-60, 61-90 y +90 días.
04. Histórico completo con Kappa Digital Zaragoza: facturas, importes y estado de cobro.
05. Dame el PDF de la factura F0030 para enviarla por email.
06. Hazme un mini dashboard de ventas mensual de 2025: total facturado, número de facturas, ticket medio, mes mejor y mes peor.
07. Compara mi facturación 2024 vs 2025 mes a mes y dime el % de crecimiento.
08. Hazme una PyG simplificada de 2025: ingresos por ventas, gastos por compras, margen bruto, total impuestos y resultado estimado.
09. ¿Cuánto tengo en cada cuenta bancaria ahora mismo? Dame el total.
10. ¿Cuáles son los productos o servicios que más he facturado en 2025? Dame el top 5 con unidades y total facturado.
11. Estima mi IVA del último trimestre: IVA repercutido vs IVA soportado y resultado a ingresar o devolver.
12. Hazme una previsión orientativa del Impuesto de Sociedades 2025: base imponible estimada, tipo aplicable, cuota a pagar.
13. ¿Cuánto tengo que ingresar de retenciones IRPF a profesionales en este trimestre?
14. ¿Qué línea de producto me deja más margen en 2025? Compara precio de venta vs coste medio.
15. Lista todas las facturas emitidas de marzo 2025 con número, fecha, cliente, base imponible, IVA y total.
16. Hazme el libro de facturas recibidas del primer trimestre 2025 con proveedor, fecha, base, IVA soportado.
17. Busca la factura del cliente Theta Export del mes de marzo y dame el PDF.
18. Lista todo mi catálogo de productos y servicios con su precio y SKU.
19. Prepara un borrador de factura para Kappa Digital: 8 horas de consultoría a 90€/h con IVA 21%.
20. Estado de mi pipeline CRM: leads por etapa, total estimado de oportunidades.
21. Tareas pendientes del proyecto X y horas registradas hasta ahora.
22. Lista los empleados activos con su puesto.
23. Dame el plan contable de mi empresa con las cuentas principales agrupadas por tipo.
24. Muéstrame los asientos del libro diario de febrero 2025 con cuenta debe, cuenta haber e importe.
```

---

## Lo que NO se puede mostrar con el MCP gratuito (oportunidad de upsell a Isaak)

Para tu honestidad de marketing — algunos de los prompts que mencionaste **NO los puede hacer el conector simple**, pero sí los hace Isaak. Marca clara para diferenciar:

- **"Sube esta factura PDF y contabilízala"** — necesita OCR + reconocimiento → Isaak (`/api/expenses/intake` con `classifyExpense()`)
- **"Concilia este movimiento bancario con la factura X"** — necesita motor de matching → Isaak
- **"Genera el Modelo 303 oficial en Excel para presentar"** — necesita exportador AEAT → Isaak (`/api/aeat/export/303`)
- **"Recordarme cada lunes el estado de cobros"** — necesita memoria persistente y triggers → Isaak

Cada uno de estos 4 puede ser un GIF más, **etiquetado claramente como "powered by Isaak"**, mostrando lo que el MCP gratuito NO hace para crear el deseo de upgrade.
