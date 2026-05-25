# Isaak — Roadmap Post-Manifiesto: El Robot Contable

**Versión:** 1.0  
**Fecha:** 2026-05-25  
**Estado:** Planificación activa  
**Autor:** Equipo Verifactu (20 años de experiencia en gestorías tradicionales)

---

## Visión fundacional

> *"Isaak es el primer Robot Contable autónomo: el empresario SOLO opera a través de Isaak — Isaak gestiona, decide, alerta y ejecuta. No hay ERP detrás del que preocuparse, no hay asesor que llame a la AEAT. Isaak es la mano derecha del empresario."*

### Los 3 principios irrenunciables

1. **Cliente only-via-Isaak** — El empresario introduce datos, hace preguntas y recibe informes únicamente a través de Isaak. No toca registros contables directamente.
2. **Isaak como fuente de verdad** — Isaak Ledger (Postgres interno) es el libro de cuentas oficial. El Excel es solo una vista de lectura exportada por Isaak; el cliente no lo edita.
3. **Isaak como Inspector AEAT preventivo** — Antes de cualquier acción fiscal o contable relevante, Isaak verifica contra 80-100 reglas AEAT hardcodeadas + RAG legal sobre el BOE. Las dudas complejas se escalan automáticamente como consulta vinculante vía TEAR.

### Por qué esto tiene sentido ahora

- El 95% de errores fiscales típicos están ya codificables en reglas explícitas.
- Los modelos LLM actuales tienen capacidad real de interpretar normativa si se les da el contexto correcto (RAG sobre BOE).
- La infraestructura del manifiesto F1-F8 ya está operativa: tool-calling, sub-agentes, streaming, memoria, RAG, juez GPT-4o-mini.
- 20 años de experiencia gestorial interna permiten hardcodear esas 80-100 reglas con precisión clínica.

---

## Estado actual (post-manifiesto F1-F8)

| Feature | Estado | PR |
|---------|--------|----|
| F1 — Memoria + clarify-first + métricas + harness | ✅ Merged | #119 |
| F2 — Tool-calling read (27 tools) | ✅ Merged | #121 |
| F3 — Router multi-proveedor (Haiku classifier) | ✅ Merged | #123 |
| F4a — Judge GPT-4o-mini (gate writes) | ✅ Merged | #125 |
| F4b — Vision OCR (GPT-4o facturas) | ✅ Merged | #127 |
| F5 — Streaming SSE (/api/chat/stream) | ✅ Merged | #129 |
| F6a+b — Long-term memory + RAG (pgvector) | ✅ Merged | #131 |
| F7 — Feedback loop (thumbs-up → few-shot) | ✅ Merged | #131 |
| F8a+b+c — Sub-agentes fiscal/banking/gestion | ✅ Merged | #133 |

**Deuda técnica identificada:** La arquitectura Holded como fuente de verdad es un techo de cristal. El siguiente gran paso es construir Isaak Ledger nativo y desacoplar la dependencia de Holded.

---

## Track A — Roadmap Técnico (F9–F20)

### F9 — Isaak Ledger: contabilidad nativa en Postgres

**Objetivo:** Crear el libro mayor interno de Isaak. Holded pasa de "fuente de verdad" a "origen de importación inicial" y opcionalmente "destino de sincronización en espejo".

**Estructura del Ledger:**
```
IsaakLedgerEntry
  id              UUID PK
  tenantId        UUID FK (aislamiento estricto)
  date            Date
  docNumber       String        -- factura, asiento, etc.
  docType         Enum          -- invoice_in, invoice_out, expense, payroll, journal
  counterparty    String?       -- NIF/CIF del tercero
  amount          Decimal(12,2)
  taxBase         Decimal(12,2)?
  vatRate         Decimal(5,2)?
  vatAmount       Decimal(12,2)?
  accountDebit    String        -- PGC código cuenta (debe)
  accountCredit   String        -- PGC código cuenta (haber)
  description     String
  attachmentUrl   String?       -- factura escaneada / OCR
  sourceSystem    String        -- 'holded', 'manual', 'ocr', 'banking'
  holdedId        String?       -- para reconciliación bidireccional opcional
  hash            String        -- SHA-256(prev_hash + entry_data) — cadena inmutable
  prevHash        String?       -- hash del asiento anterior (para auditoría)
  verifactuRef    String?       -- referencia SOAP AEAT tras declaración
  createdAt       DateTime
  createdBy       String        -- userId o 'isaak-auto'
```

**Invariantes críticos:**
- `hash` se calcula sobre todos los campos contables + `prevHash` → cadena inmutable (audit trail legal).
- `tenantId` SIEMPRE primer filtro en todas las queries (igual que pgvector).
- `verifactuRef` se populará cuando se decople la integración AEAT del flujo Holded.

**Estimación:** ~5 días. 1 migración Prisma + seed importador desde Holded API + tests.

---

### F10 — Excel como vista de solo lectura (exportación automática)

**Objetivo:** El empresario ya no crea ni edita Excel. Isaak genera el Excel en respuesta a peticiones en lenguaje natural.

**Flujo:**
1. Empresario: *"Dame el informe de IVA del primer trimestre"* → Isaak genera Excel con hojas: Facturas Emitidas, Facturas Recibidas, Liquidación IVA 303.
2. Isaak: *"He generado tu modelo 303 con los datos del T1 2026. Aquí tienes el Excel ← [descargar]"*
3. El Excel tiene las celdas de datos bloqueadas (solo lectura). La celda de notas del empresario sí es editable.

**Librería:** `exceljs` (MIT, sin coste). Templates predefinidos para:
- Libro diario (PGC 2007)
- Balance de sumas y saldos
- Modelo 303 (IVA trimestral)
- Modelo 130 (IRPF fraccionado)
- Modelo 111 (retenciones trabajadores)
- Libro de facturas emitidas / recibidas (SII-compatible)

**Herramienta LLM nueva:** `isaak_export_ledger_excel(reportType, dateFrom, dateTo)` — se añade al registry F2 como herramienta de solo lectura.

**Estimación:** ~3 días. Template engine + tool + tests golden.

---

### F11 — Inspector AEAT: Capa 1 — Reglas hardcodeadas

**Objetivo:** 80-100 reglas AEAT codificadas en TypeScript que se ejecutan ANTES de cualquier acción fiscal/contable relevante. Cobertura del 95% de errores típicos de autónomos y PYMEs.

**Arquitectura:**
```typescript
interface AeatRule {
  id: string;           // 'R001', 'R002', etc.
  category: AeatRuleCategory;
  severity: 'error' | 'warning' | 'info';
  description: string;
  check: (context: AeatRuleContext) => AeatRuleResult;
}

type AeatRuleCategory =
  | 'iva_deducibilidad'
  | 'irpf_retenciones'
  | 'plazos_presentacion'
  | 'contabilidad_pgc'
  | 'verifactu_obligaciones'
  | 'facturacion_electronica'
  | 'operaciones_vinculadas'
  | 'regimenes_especiales';
```

**Ejemplos de reglas (muestra de las 80-100):**

| ID | Categoría | Regla |
|----|-----------|-------|
| R001 | iva_deducibilidad | IVA de facturas de gasolina: máximo 50% deducible (salvo vehículo afecto 100%) |
| R002 | iva_deducibilidad | Gastos de restauración: IVA NO deducible (Art. 96.1.5 LIVA) |
| R003 | iva_deducibilidad | IVA de vehículo turismo: presunción 50% afectación (Art. 95 LIVA) |
| R004 | irpf_retenciones | Alquiler local: retención 19% obligatoria si arrendador es persona física |
| R005 | irpf_retenciones | Honorarios profesional: retención 15% (7% primeros 2 años) |
| R006 | plazos_presentacion | Modelo 303: días 1-20 mes siguiente al trimestre (trimestral) |
| R007 | plazos_presentacion | Modelo 130: días 1-20 abril/julio/octubre, 1-30 enero |
| R008 | plazos_presentacion | Modelo 111: días 1-20 mes siguiente (mensual) o trimestral |
| R009 | contabilidad_pgc | Factura >3.005,06€ en efectivo: prohibido (Ley 7/2012) |
| R010 | verifactu_obligaciones | Software VERI*FACTU obligatorio para facturación electrónica desde 2026 |
| R011 | facturacion_electronica | Factura simplificada: máximo 400€ (o 3.000€ en determinados casos) |
| R012 | operaciones_vinculadas | Socio >25% participación: precio mercado + documentación obligatoria |
| R013 | regimenes_especiales | Régimen simplificado IVA: módulos por actividad CNAE |
| R014 | iva_deducibilidad | Bienes de inversión: regularización si cambia % deducción en 4/9 años |
| R015 | irpf_retenciones | Dividendos: retención 19% obligatoria en el momento del pago |
| … | … | …hasta R100 |

**Integración con Isaak:**
- Las reglas se ejecutan automáticamente cuando Isaak detecta intención de crear factura, registrar gasto, etc.
- Resultado: alerta preventiva antes de ejecutar la acción.
- Ejemplo: *"⚠️ Este gasto de restaurante (120€) tiene IVA NO deducible según el Art. 96.1.5 LIVA. ¿Deseas registrarlo de todas formas como gasto sin IVA?"*

**Estimación:** ~8 días. 80-100 reglas + motor de evaluación + integración en tool-loop + tests unitarios para cada regla.

---

### F12 — Inspector AEAT: Capa 2 — LLM contextual (Claude)

**Objetivo:** Para preguntas que superan las reglas hardcodeadas pero no requieren consulta legal profunda, Claude responde con razonamiento fiscal contextual.

**Trigger:** Cuando Capa 1 no encuentra una regla exactamente aplicable pero detecta keywords fiscales.

**System prompt especializado (Inspector AEAT):**
```
Eres el Inspector AEAT preventivo de Isaak. Tu rol es detectar potenciales errores 
fiscales y contables ANTES de que ocurran. Razonas como un inspector de Hacienda 
con 20 años de experiencia pero desde el lado del contribuyente.

PRINCIPIOS:
- Siempre cita el artículo concreto de la ley o reglamento aplicable
- Si no estás seguro al 90%, escala a Capa 3 (RAG BOE) o consulta vinculante
- NUNCA des una respuesta fiscal definitiva sin citar jurisprudencia o normativa
- Usa el tono de un asesor fiscal profesional, no de un chatbot
```

**Estimación:** ~2 días. Nuevo sub-agente 'inspector' en el registry + system prompt + golden tests.

---

### F13 — Inspector AEAT: Capa 3 — RAG sobre BOE y doctrina AEAT

**Objetivo:** Base de conocimiento vectorial con la normativa fiscal española actualizada. El Inspector consulta esta base cuando las capas 1-2 no son suficientes.

**Fuentes de datos:**
- BOE: LIVA, LIRPF, LIS, LGT, Reglamentos de facturación
- Doctrina AEAT: Consultas vinculantes DGT (base V- más relevantes)
- Manual IRPF AEAT (edición anual)
- Reglamento Facturación (RD 1619/2012)
- Reglamento VERI*FACTU (RD 1007/2023)

**Arquitectura:**
- Misma infraestructura pgvector de F6 (IsaakLongTermMemory con factType='legal_boe')
- Ingesta: job offline de chunking + embedding de documentos BOE
- Retrieval: minSimilarity=0.65, topK=5, siempre filtrado por tenantId='system' (namespace público)
- Formato de chunk: incluye "Fuente: BOE-A-XXXX-XXXX, Art. XX" en metadata para citar correctamente

**Nueva tool LLM:** `inspector_search_legal_boe(query)` — permite al sub-agente inspector buscar en la base BOE.

**Estimación:** ~5 días. Pipeline de ingesta BOE + retrieval + integración en sub-agente inspector + golden tests con preguntas de normativa real.

---

### F14 — Consulta Vinculante TEAR automática

**Objetivo:** Para casos que superan los 3 niveles del Inspector, Isaak genera automáticamente el borrador de una consulta vinculante dirigida a la Dirección General de Tributos (DGT/TEAR).

**Flujo:**
1. Inspector Capa 3 no encuentra respuesta con confianza ≥ 0.85
2. Isaak presenta al empresario: *"Este caso tiene matices que requieren criterio oficial. Tengo dos opciones: (A) Te genero el borrador de consulta vinculante para la DGT, o (B) lo escalo a tu asesor fiscal. ¿Qué prefieres?"*
3. Si elige A → Isaak genera el documento estructurado según el formulario oficial DGT:
   - Identificación del consultante
   - Descripción de los hechos
   - Cuestión planteada
   - Normativa aplicable (generada por Capa 3)
4. Empresario revisa → Isaak envía por email o descarga como PDF firmado digitalmente.

**Plantilla consulta vinculante:**
```
CONSULTA TRIBUTARIA
Dirección General de Tributos
Ministerio de Hacienda

Datos del consultante:
  NIF/CIF: [del tenant]
  Nombre/Razón social: [del tenant]
  Actividad económica: [CNAE detectado]
  Régimen fiscal: [detectado por Isaak]

Hechos:
  [generados por LLM con precisión notarial]

Cuestión planteada:
  [reformulada por LLM en términos jurídicos precisos]

Normativa que se considera aplicable:
  [extraída por RAG BOE, con artículos concretos]

[Lugar], [Fecha]
Firmado: [Nombre empresario]
```

**Estimación:** ~3 días. Template + LLM generation + PDF export + integración en Inspector.

---

### F15 — Integraciones: Telegram + WhatsApp Business (ampliación)

**Objetivo:** Isaak accesible desde Telegram (nuevo canal) y WhatsApp mejorado con contexto contable nativo.

**Telegram Bot:**
- Comandos: `/consulta`, `/factura`, `/saldo`, `/alertas`
- Mismo pipeline que /api/chat: auth vía OTP vinculado a tenantId → token de sesión
- Streaming simulado (Telegram no soporta SSE nativo → actualización de mensaje cada 500ms)
- Soporte de imágenes → OCR F4b para facturas enviadas por foto

**WhatsApp (mejora):**
- Ya operativo (Phone `1068988046305906`)
- Añadir: soporte de imágenes adjuntas → OCR F4b
- Añadir: respuestas estructuradas con formato tabla (markdown → texto plano formateado)
- Añadir: alerta proactiva semanal del estado fiscal

**Estimación:** ~4 días. Telegram bot + mejoras WhatsApp + shared message handler.

---

### F16 — Integraciones: Slack + Microsoft Teams

**Objetivo:** Isaak en el workplace del empresario. Especialmente útil para empresas con equipo.

**Slack App:**
- Slash command: `/isaak [pregunta]`
- Shortcut en mensajes: "Consultar a Isaak sobre esto"
- Canal dedicado `#isaak-contable`: Isaak publica alertas fiscales automáticamente
- Auth: Slack OAuth → mapeo a tenantId Isaak

**Microsoft Teams Bot:**
- Ya tenemos integración OAuth Microsoft 365 (F2, 9 tools)
- Teams Bot Framework → conversación directa con Isaak
- Adaptive Cards para respuestas estructuradas (facturas, saldos, alertas)
- Notificaciones proactivas en canal de contabilidad

**Estimación:** ~5 días. Slack app + Teams bot + auth mapping + tests.

---

### F17 — Integraciones: Airtable + Notion + Trello (gestión operativa)

**Objetivo:** Isaak sincroniza datos operativos con las herramientas de gestión que ya usa el empresario.

**Airtable:**
- `airtable_sync_invoices(baseId, tableId)` → exporta facturas del Ledger a tabla Airtable
- `airtable_import_expenses(baseId, tableId)` → importa gastos categorizados desde Airtable
- Webhook bidireccional: cambios en Airtable → Isaak valida y contabiliza

**Notion:**
- `notion_export_report(pageId, reportType)` → crea página en Notion con informe mensual
- `notion_import_clients(databaseId)` → importa CRM básico de Notion como contactos Holded/Ledger
- Plantilla Notion "Gestión Financiera" que Isaak popula automáticamente

**Trello:**
- `trello_create_fiscal_card(boardId, listId)` → crea tarjeta con fecha límite para cada obligación fiscal
- Calendario fiscal automático: Isaak crea tarjetas para 303, 130, 111, 180, etc.

**Estimación:** ~4 días. Conectores REST + tools LLM + golden tests.

---

### F18 — Integraciones: Stripe + GoCardless (cobros y pagos)

**Objetivo:** Isaak cierra el ciclo de caja: factura → cobro → contabilización automática.

**Stripe:**
- Ya operativo como billing interno de Verifactu.
- Nueva capa: conectar Stripe del cliente (auth vía Stripe Connect)
- `stripe_list_payments(from, to)` → lista cobros para reconciliación
- `stripe_match_invoices()` → reconcilia automáticamente cobros Stripe con facturas Ledger
- Alerta: *"Tienes 3 facturas sin cobrar por importe total de 4.200€. ¿Deseas enviar recordatorio?"*

**GoCardless:**
- Open Banking: conectar cuentas bancarias del cliente para lectura de movimientos
- `gocardless_list_transactions(from, to)` → trae extracto bancario
- Reconciliación automática con Ledger
- Nota: GoCardless **no** está sunset para Open Banking (solo para nuevos registros de DD), es viable para AIS

**Estimación:** ~5 días. Stripe Connect + GoCardless AIS + reconciliación automática + tests.

---

### F19 — Integraciones: HubSpot + Odoo (ERP/CRM avanzado)

**Objetivo:** Para empresas con HubSpot CRM u Odoo ERP, Isaak actúa como puente contable.

**HubSpot:**
- `hubspot_list_deals(stage)` → pipeline de ventas → Isaak anticipa facturación futura
- `hubspot_sync_contacts()` → clientes HubSpot → contactos Ledger
- `hubspot_create_invoice_from_deal(dealId)` → cuando deal cierra → Isaak genera factura

**Odoo:**
- API REST Odoo (libre, sin coste de licencia para la integración)
- `odoo_import_chart_of_accounts()` → mapeo PGC desde Odoo
- `odoo_sync_invoices(from, to)` → importación masiva de facturas Odoo → Ledger
- Migración asistida: empresas que vienen de Odoo pueden mover su contabilidad a Isaak

**Estimación:** ~4 días. HubSpot + Odoo REST connectors + tools + tests.

---

### F20 — Integraciones: Dropbox + Google Drive (documentos)

**Objetivo:** Facturas, contratos y documentos fiscales accesibles desde Isaak con OCR automático.

**Dropbox:**
- `dropbox_list_folder(path)` → listar documentos
- `dropbox_download_and_ocr(filePath)` → descarga PDF/imagen + OCR F4b → contabiliza automáticamente
- Carpeta dedicada: `Isaak/Facturas/Pendientes/` → Isaak procesa automáticamente lo que cae aquí
- Carpeta: `Isaak/Informes/` → Isaak deposita aquí los Excel de exportación F10

**Google Drive:**
- Ya tenemos integración OAuth Google (F2, 8 tools)
- Ampliar: `google_ocr_document(fileId)` → descarga + OCR F4b
- Carpeta dedicada en Drive para el mismo flujo que Dropbox
- Integration con Google Workspace: contratos firmados → verificación y archivo automático

**Estimación:** ~3 días. Dropbox SDK + Drive OCR ampliation + auto-processing + tests.

---

## Track B — Roadmap Institucional (AEAT, AET, certificaciones)

### B1 — Verifactu AEAT: declaración SOAP nativa desde Ledger

**Estado actual:** Verifactu SOAP ya operativo pero vinculado al flujo Holded.  
**Objetivo:** Desacoplar. Isaak Ledger (F9) es la fuente. Verifactu firma y declara directamente desde el Ledger.

**Flujo nuevo:**
```
Empresario via Isaak → IsaakLedgerEntry → hash chain → Verifactu SOAP AEAT
(ya no pasa por Holded)
```

**Impacto:** Isaak puede operar sin Holded en absoluto. Holded queda como canal de importación inicial opcional.

**Estimación:** ~3 días (F9 es prerequisito).

---

### B2 — SII (Suministro Inmediato de Información)

**Objetivo:** Para empresas en SII (gran empresa, opción voluntaria), Isaak envía facturas a AEAT en tiempo real.

**Normativa:** Real Decreto 596/2016. Plazo: 4 días hábiles desde emisión/recepción.

**Integración:** 
- Al crear factura en Ledger → si tenant en SII → envío automático AEAT dentro del plazo
- Estado de envío reflejado en `IsaakLedgerEntry.verifactuRef`
- Alerta si envío falla o está próximo a vencer el plazo

**Estimación:** ~5 días. AEAT SII WSDL + tests con sandbox AEAT.

---

### B3 — Modelos tributarios automáticos (303, 130, 111, 180, 347)

**Objetivo:** Isaak genera y presenta los modelos tributarios trimestrales/anuales directamente, sin intervención de asesor.

| Modelo | Descripción | Periodicidad |
|--------|-------------|--------------|
| 303 | IVA trimestral | Trimestral |
| 130 | IRPF fraccionado (estimación directa) | Trimestral |
| 390 | Resumen anual IVA | Anual |
| 111 | Retenciones rendimientos trabajo | Trimestral |
| 180 | Resumen anual retenciones trabajo | Anual |
| 115 | Retenciones alquiler | Trimestral |
| 180 | Resumen anual retenciones alquiler | Anual |
| 347 | Operaciones con terceros >3.005,06€ | Anual |
| 349 | Operaciones intracomunitarias | Mensual/trimestral |

**Arquitectura:**
- `IsaakTaxReturn` tabla en Ledger con estado (borrador → revisado → presentado → aceptado)
- Pre-cumplimentación automática desde datos del Ledger
- Revisión obligatoria del empresario antes de presentar (Isaak nunca presenta sin confirmación)
- Presentación: integración con Sede Electrónica AEAT vía certificado digital del tenant

**Estimación:** ~10 días. Cálculo modelos + UI revisión + integración Sede Electrónica.

---

### B4 — Posicionamiento: gestorías + autónomos sin gestoría

**Estrategia de go-to-market:**

**Fase 1 (2026): Herramienta para gestorías**
- Isaak como "copiloto del gestor": el gestor lleva X clientes manualmente, Isaak automatiza el 80% del trabajo rutinario
- Propuesta de valor: *"Con Isaak llevas el doble de clientes con el mismo tiempo"*
- Precio: plan Business para gestorías (tarifa por cliente/mes)
- Canal: AET (Asociación Española de Asesores Fiscales), ASOFIS

**Fase 2 (2026-2027): Autónomos sin gestoría**
- Propuesta de valor: *"Tu contable por 29€/mes. Sin sorpresas, sin errores AEAT"*
- Target: autónomos en estimación directa simplificada, freelancers, microempresas (<10 empleados)
- Isaak gestiona: IVA trimestral, IRPF fraccionado, facturas, gastos, nóminas básicas

**Fase 3 (post-certificación AEAT): "No necesitas asesor"**
- Una vez obtenida certificación oficial de software fiscal homologado
- Campaña: *"¿Todavía pagas 150€/mes a tu gestor por algo que Isaak hace en 5 minutos?"*
- Legal cover: consultas vinculantes automáticas para casos edge (F14)

---

### B5 — Certificación AEAT / homologación software fiscal

**Objetivo:** Obtener reconocimiento oficial como software de contabilidad homologado.

**Pasos:**
1. Registro en el Programa de Desarrollo de Software de la AEAT (suministrador autorizado SII)
2. Certificación VERI*FACTU: ya iniciado con `apps/api` — formalizar con nueva arquitectura Ledger-nativa
3. Colaboración con AET/ASOFIS para validación de las 80-100 reglas del Inspector
4. Cobertura de Responsabilidad Civil Profesional (el 90% de asesores la niegan cuando su error está demostrado — Isaak la lleva implícita en el producto)

---

### B6 — Robot Contable: autonomía total

**Visión 2027:**
- Isaak procesa extractos bancarios de forma autónoma → categoriza → contabiliza → alerta anomalías
- Cierre contable mensual automático: Isaak genera balance y cuenta de pérdidas y ganancias
- Auditoría interna automática: Isaak verifica coherencia del Ledger mensualmente
- Informe fiscal trimestral proactivo: *"Esta semana hay que presentar el 303. Aquí tienes el borrador. ¿Lo revisamos juntos?"*
- El empresario nunca más mira un libro contable. Solo ve los reportes y dashboards que Isaak genera.

---

## Integraciones confirmadas (12 — sin coste de licencia)

| # | Integración | Tipo | Auth | Fase |
|---|-------------|------|------|------|
| 1 | Telegram | Mensajería | Bot Token | F15 |
| 2 | Microsoft Teams | Workplace | OAuth (ya tenemos) | F16 |
| 3 | Slack | Workplace | OAuth | F16 |
| 4 | Notion | Gestión | OAuth | F17 |
| 5 | Calendly | Scheduling | Pro (tenemos licencia) | Ya operativo via MCP |
| 6 | Stripe | Pagos | Connect OAuth | F18 |
| 7 | GoCardless | Open Banking | OAuth | F18 |
| 8 | Airtable | Datos | OAuth | F17 |
| 9 | HubSpot | CRM | OAuth | F19 |
| 10 | Odoo | ERP | REST API Key | F19 |
| 11 | Trello | Gestión | OAuth | F17 |
| 12 | Dropbox | Documentos | OAuth | F20 |

**Explícitamente descartados:**
- ~~Salt Edge~~: coste elevado, sustituido por GoCardless + Enable Banking (ya operativo)
- ~~Chift~~: cuenta bloqueada pendiente activación, coste elevado, descartado

**Notas:**
- WhatsApp Business: ya operativo (no cuenta en los 12 nuevos)
- Google Drive/Gmail/Calendar: ya operativo (no cuenta en los 12 nuevos)
- Microsoft Outlook/Calendar/OneDrive: ya operativo (no cuenta en los 12 nuevos)
- Enable Banking PSD2: ya operativo desde 2026-05-23

---

## Secuencia de implementación recomendada

```
Q2 2026 (Mayo-Junio):
  F9  — Isaak Ledger nativo            [prerequisito para B1-B3]
  F10 — Excel solo lectura             [quick win visible]
  F11 — Inspector Capa 1 (80-100 reglas) [diferenciador clave]
  B1  — Verifactu desde Ledger         [desacoplamiento Holded]

Q3 2026 (Julio-Septiembre):
  F12 — Inspector Capa 2 (LLM)
  F13 — Inspector Capa 3 (RAG BOE)
  F14 — Consulta vinculante TEAR
  F15 — Telegram + WhatsApp mejoras
  B3  — Modelos 303/130/111 automáticos [momento declaración sept]

Q4 2026 (Octubre-Diciembre):
  F16 — Slack + Teams
  F17 — Airtable + Notion + Trello
  F18 — Stripe Connect + GoCardless
  B2  — SII para grandes empresas
  B4  — Lanzamiento plan "gestorías"

Q1 2027 (Enero-Marzo):
  F19 — HubSpot + Odoo
  F20 — Dropbox + Drive OCR
  B5  — Proceso certificación AEAT
  B6  — Robot Contable v1 (autonomía total)
```

---

## Criterios de éxito del Robot Contable

| Métrica | Hoy (post F8) | Objetivo 2027 |
|---------|---------------|---------------|
| % facturas procesadas sin intervención humana | 0% | 80% |
| % declaraciones presentadas sin asesor | 0% | 70% |
| Errores AEAT detectados preventivamente | 0 | >95% cobertura |
| Tiempo para cierre mensual | N/A (manual) | <15 min review |
| NPS usuarios autónomos sin gestoría | N/A | >60 |
| Coste por cliente/mes (gestoría) | >150€ (gestor tradicional) | <29€ (Isaak) |

---

## Notas del fundador

> *"He trabajado 20 años llevando gestorías tradicionales y sé cómo es por dentro. La mayoría de asesores niegan pagar la RC incluso cuando su error está demostrado. Isaak cambia esto: el sistema tiene las reglas hardcodeadas, el audit trail es inmutable, y el empresario siempre puede ver exactamente qué decisión tomó Isaak y por qué."*

Esta experiencia de 20 años es la ventaja competitiva más difícil de replicar: las 80-100 reglas del Inspector no son genéricas — son los errores reales que ocurren en una gestoría española cada día.

---

*Documento vivo. Actualizar en cada sprint con PRs completados y cambios de prioridad.*  
*Próxima revisión: inicio de implementación F9.*
