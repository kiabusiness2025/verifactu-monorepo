# Isaak — Plan Maestro de Evolución

**Última actualización**: 2026-05-16  
**Visión**: Isaak como genio de contabilidad y asistencia fiscal que opera con datos reales de ambos conectores (ChatGPT + Claude), genera reportes, lee documentos, emite presupuestos/facturas y aprende de cada interacción.

---

## Estado actual

| Componente                                                                        | Estado    | Notas                              |
| --------------------------------------------------------------------------------- | --------- | ---------------------------------- |
| IsaakDock (widget flotante)                                                       | ✅ activo | Solo admin, respuestas texto plano |
| POST /api/admin/isaak/chat                                                        | ✅ activo | Claude Haiku + 3 tools de BD       |
| Tools admin: `get_activity_stats`, `list_dormant_tenants`, `get_connector_errors` | ✅ activo | Consultas BD en tiempo real        |
| Smoke tests + fixtures                                                            | ✅ activo | Modos Live y Fixture, 5 casos      |
| Markdown rendering                                                                | ⬜ G3     | Próxima sesión                     |
| Sistema de feedback                                                               | ⬜ G1     | Próxima sesión                     |

---

## Fase G — Aprendizaje continuo y respuestas ricas (PRÓXIMA)

> Objetivo: Isaak aprende de interacciones reales y responde con contenido visualmente estructurado.

| ID  | Tarea                                                                   | Esfuerzo | Estado |
| --- | ----------------------------------------------------------------------- | -------- | ------ |
| G1  | `isaak_feedback` — thumbs up/down en dock → tabla BD                    | 1h       | ⬜     |
| G2  | Top-rated responses visibles en `/connectors/isaak-tests`               | 30 min   | ⬜     |
| G3  | Markdown rendering en IsaakDock (react-markdown + remark-gfm)           | 30 min   | ⬜     |
| G4  | SYSTEM_PROMPT mejorado: instrucciones para usar tablas, negrita, listas | 10 min   | ⬜     |

**Ciclo de mejora continua:**

```
Interacción real → thumbs up/down → top-rated → few-shot en SYSTEM_PROMPT → mejor respuesta → repeat
```

---

## Fase H — Datos, exportaciones y gráficos

> Objetivo: Isaak puede exportar cualquier dato a Excel y mostrar gráficos de tendencias.

| ID  | Tarea                                                                  | Esfuerzo | Dependencia |
| --- | ---------------------------------------------------------------------- | -------- | ----------- |
| H1  | Tool `get_activity_timeline` — actividad diaria últimos 30d por tenant | 1h       | —           |
| H2  | Bloque estructurado `{ type: 'chart', ... }` en respuestas Isaak       | 2h       | H1          |
| H3  | Renderer de gráfico de barras/línea en IsaakDock (recharts)            | 2h       | H2          |
| H4  | Tool `export_to_excel` — genera XLSX de cualquier dataset en BD        | 2h       | —           |
| H5  | Botón "Descargar Excel" en respuestas con tablas                       | 1h       | H4          |
| H6  | Bloque estructurado `{ type: 'table', headers, rows }` con sort/filter | 2h       | —           |

---

## Fase I — Lectura y análisis de documentos

> Objetivo: Isaak puede leer facturas, tickets y documentos PDF para extraer datos y analizarlos.

| ID  | Tarea                                                                                | Esfuerzo | Dependencia |
| --- | ------------------------------------------------------------------------------------ | -------- | ----------- |
| I1  | Upload de PDF en IsaakDock (drag & drop, máx 10MB)                                   | 2h       | —           |
| I2  | Extracción de texto de PDF server-side (pdf-parse o similar)                         | 1h       | I1          |
| I3  | Tool `analyze_document` — envía texto extraído a Claude como contexto                | 2h       | I2          |
| I4  | Tool `extract_invoice_data` — extrae importes, fecha, proveedor, IVA de un documento | 3h       | I3          |
| I5  | Vision API para documentos con imágenes/escaneos (Claude vision)                     | 3h       | I1          |

---

## Fase J — Acciones contables (asientos, presupuestos, facturas)

> Objetivo: Isaak puede generar asientos contables, presupuestos y facturas directamente desde la conversación.

| ID  | Tarea                                                                                       | Esfuerzo | Dependencia |
| --- | ------------------------------------------------------------------------------------------- | -------- | ----------- |
| J1  | Tool `suggest_accounting_entry` — genera asiento contable desde factura/ticket extraído     | 3h       | I4          |
| J2  | Tool `create_holded_estimate` — crea presupuesto en Holded desde Isaak                      | 2h       | MCP write   |
| J3  | Export presupuesto como PDF (react-pdf o puppeteer)                                         | 3h       | J2          |
| J4  | Tool `create_holded_invoice_draft` — envuelve `create_invoice_draft` MCP con contexto Isaak | 1h       | MCP write   |
| J5  | Validación Verifactu: check de datos obligatorios antes de emitir                           | 2h       | J4          |
| J6  | Generación de QR Verifactu en PDF de factura                                                | 2h       | J5          |

---

## Fase K — Multi-conector e inteligencia fiscal

> Objetivo: Isaak combina datos de ambos conectores (ChatGPT + Claude MCP) y actúa como asesor fiscal proactivo.

| ID  | Tarea                                                                      | Esfuerzo | Dependencia |
| --- | -------------------------------------------------------------------------- | -------- | ----------- |
| K1  | Tool `get_holded_data` en Isaak admin — proxy al conector MCP de ChatGPT   | 3h       | —           |
| K2  | Isaak accede a facturas, contactos, proyectos del tenant vía K1            | 1h       | K1          |
| K3  | Análisis fiscal automatizado: IVA trimestral, retenciones, modelo 303      | 4h       | K2          |
| K4  | Comparativa mensual/anual: "Este trimestre vs. el anterior"                | 2h       | K2          |
| K5  | Alerta proactiva: "Tienes 3 facturas sin contabilizar con vencimiento hoy" | 2h       | K2          |

---

## Fase L — Isaak público con aprendizaje por tenant

> Objetivo: Isaak disponible para usuarios finales (no admin) con contexto personalizado por empresa.

| ID  | Tarea                                                                          | Esfuerzo | Dependencia |
| --- | ------------------------------------------------------------------------------ | -------- | ----------- |
| L1  | Feature flag `ISAAK_PUBLIC_ENABLED` por tenant (admin lo activa manualmente)   | 1h       | —           |
| L2  | Onboarding usuario: consentimiento explícito de acceso a datos                 | 2h       | L1          |
| L3  | Isaak usa `IsaakConversation` del tenant para contexto personalizado           | 3h       | L2          |
| L4  | SYSTEM_PROMPT personalizado por tenant: nombre empresa, sector, régimen fiscal | 2h       | L3          |
| L5  | Few-shot examples por tenant: aprende del historial de cada empresa            | 3h       | G1, L3      |
| L6  | Panel admin: métricas uso Isaak por tenant (preguntas/día, satisfacción)       | 2h       | G1, L1      |

---

## Orden de ejecución recomendado

```
G (aprendizaje + visuals)  ←── PRÓXIMA SESIÓN
H (datos + exports)
I (documentos)
J (acciones contables)       ←── alto valor producto, requiere I
K (multi-conector + fiscal)  ←── diferenciador clave
L (Isaak público)            ←── cuando K esté validado
```

---

## Stack técnico por fase

| Fase | Librerías nuevas                | Notas                              |
| ---- | ------------------------------- | ---------------------------------- |
| G    | `react-markdown`, `remark-gfm`  | Ya en node_modules                 |
| H    | `recharts`, `xlsx` (SheetJS)    | XLSX ya usado en admin exports     |
| I    | `pdf-parse` o `pdfjs-dist`      | Server-side only                   |
| J    | `@react-pdf/renderer` o `jsPDF` | Para PDF client/server             |
| K    | —                               | Usa MCP tools existentes via proxy |
| L    | —                               | Usa infraestructura existente      |

---

## Decisiones de arquitectura

- **Modelo**: Claude Haiku para respuestas rápidas en el dock. Escalar a Sonnet para análisis fiscal complejos (Fases J/K).
- **Contexto por tenant**: `SYSTEM_PROMPT` base + sección dinámica con datos del tenant (empresa, sector, régimen).
- **Aprendizaje**: few-shot examples añadidos manualmente desde top-rated feedback (Fase G) → automatizado por tenant en Fase L5.
- **Structured responses**: formato `{ type: 'text'|'table'|'chart'|'excel_link'|'pdf_link', ... }` dentro del texto de respuesta como bloques JSON fenced.
- **Seguridad**: todas las tools de escritura (J2-J4) requieren confirmación explícita del usuario antes de ejecutar.
