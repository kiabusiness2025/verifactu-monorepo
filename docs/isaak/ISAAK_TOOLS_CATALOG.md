# ISAAK — Catálogo de Tools por Fase

> Última actualización: 2026-04-28

Todas las tools siguen el formato de Anthropic `tool_use` / OpenAI `tool_calls`.
Cada tool tiene nombre, descripción, parámetros JSON Schema y el conector que la ejecuta.

---

## FASE 1 — Tools Holded ERP

Ya construidas parcialmente en `apps/holded-mcp/src/holded-client.ts`.
Necesitan ser adaptadas al formato de tool_use para la llamada directa a Claude API.

### Facturación y documentos

```typescript
// list_documents — lista facturas emitidas/recibidas
{
  name: 'holded_list_documents',
  description: 'Lista facturas emitidas o recibidas de Holded con filtros por tipo, estado, fecha, cliente e importe.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['invoice', 'purchase', 'estimate', 'proforma'] },
      status: { type: 'string', enum: ['pending', 'paid', 'overdue', 'all'] },
      dateFrom: { type: 'string', description: 'ISO date YYYY-MM-DD' },
      dateTo: { type: 'string', description: 'ISO date YYYY-MM-DD' },
      contactId: { type: 'string' },
      limit: { type: 'number', default: 20 },
    },
    required: ['type'],
  },
}

// get_document — detalle completo de una factura
{
  name: 'holded_get_document',
  description: 'Obtiene el detalle completo de una factura: líneas, importes, IVA, vencimiento, estado de cobro.',
  input_schema: {
    type: 'object',
    properties: {
      documentId: { type: 'string' },
      type: { type: 'string', enum: ['invoice', 'purchase'] },
    },
    required: ['documentId', 'type'],
  },
}

// create_invoice_draft — crea borrador (NUNCA envía sin confirmación)
{
  name: 'holded_create_invoice_draft',
  description: 'Crea un BORRADOR de factura en Holded. El usuario debe revisarlo y confirmarlo explícitamente antes de que se guarde.',
  input_schema: {
    type: 'object',
    properties: {
      contactId: { type: 'string' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'number' },
            price: { type: 'number' },
            tax: { type: 'number', description: 'Tipo IVA en %: 21, 10, 4, 0' },
          },
          required: ['description', 'quantity', 'price'],
        },
      },
      date: { type: 'string' },
      dueDate: { type: 'string' },
      notes: { type: 'string' },
    },
    required: ['contactId', 'lines'],
  },
}
```

### Contabilidad

```typescript
// get_balance_sheet — balance de situación
{
  name: 'holded_get_balance_sheet',
  description: 'Obtiene el balance de situación (activo, pasivo, patrimonio neto) para un periodo.',
  input_schema: {
    type: 'object',
    properties: {
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
    },
  },
}

// get_profit_loss — cuenta de pérdidas y ganancias (PyG)
{
  name: 'holded_get_profit_loss',
  description: 'Obtiene la cuenta de resultados (PyG) del ejercicio o del periodo indicado.',
  input_schema: {
    type: 'object',
    properties: {
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
    },
  },
}

// get_daily_book — diario contable
{
  name: 'holded_get_daily_book',
  description: 'Obtiene los asientos del diario contable en el rango de fechas indicado.',
  input_schema: {
    type: 'object',
    properties: {
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
      accountCode: { type: 'string', description: 'Filtrar por cuenta del PGC (opcional)' },
    },
    required: ['dateFrom', 'dateTo'],
  },
}

// get_chart_of_accounts — plan de cuentas
{
  name: 'holded_get_chart_of_accounts',
  description: 'Obtiene el plan de cuentas completo o filtrado por tipo.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['all', 'income', 'expense', 'asset', 'liability'] },
    },
  },
}

// get_tax_summary — resumen de IVA
{
  name: 'holded_get_tax_summary',
  description: 'Calcula el resumen de IVA repercutido, soportado y cuota neta para el trimestre o periodo.',
  input_schema: {
    type: 'object',
    properties: {
      period: { type: 'string', description: 'Ej: Q1-2026, Q2-2026, 2026, 2026-01' },
    },
    required: ['period'],
  },
}

// list_treasury_accounts — cuentas de tesorería
{
  name: 'holded_list_treasury_accounts',
  description: 'Lista las cuentas bancarias y de tesorería registradas en Holded con sus saldos.',
  input_schema: { type: 'object', properties: {} },
}
```

### Clientes y CRM

```typescript
// list_contacts — lista clientes/proveedores
{
  name: 'holded_list_contacts',
  description: 'Lista contactos (clientes, proveedores) con filtros por tipo, nombre o NIF.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['client', 'supplier', 'all'] },
      search: { type: 'string', description: 'Nombre, email o NIF' },
      limit: { type: 'number', default: 20 },
    },
  },
}

// get_contact — detalle de un contacto
{
  name: 'holded_get_contact',
  description: 'Obtiene el detalle completo de un contacto: datos fiscales, historial, documentos asociados.',
  input_schema: {
    type: 'object',
    properties: {
      contactId: { type: 'string' },
    },
    required: ['contactId'],
  },
}

// list_crm_leads — oportunidades comerciales
{
  name: 'holded_list_leads',
  description: 'Lista oportunidades y leads del CRM con estado y valor estimado.',
  input_schema: {
    type: 'object',
    properties: {
      funnelId: { type: 'string' },
      status: { type: 'string' },
      limit: { type: 'number', default: 20 },
    },
  },
}
```

### Proyectos y RRHH

```typescript
// list_projects
{
  name: 'holded_list_projects',
  description: 'Lista proyectos activos o archivados con estado y métricas.',
  input_schema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['active', 'archived', 'all'] },
    },
  },
}

// get_project — detalle proyecto
// list_project_tasks — tareas de un proyecto
// list_time_records — horas imputadas
// list_employees — empleados
// list_products — catálogo de productos
// list_warehouses — almacenes y stock
// (schemas análogos a los anteriores)
```

---

## FASE 2 — Tools de Calendar y Email

### Google Calendar

```typescript
{
  name: 'calendar_create_event',
  description: 'Crea un evento en el Google Calendar del usuario.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      startDateTime: { type: 'string', description: 'ISO 8601' },
      endDateTime: { type: 'string', description: 'ISO 8601' },
      description: { type: 'string' },
      attendees: { type: 'array', items: { type: 'string', description: 'Email' } },
      reminderMinutes: { type: 'number', description: 'Minutos de antelación para recordatorio' },
    },
    required: ['title', 'startDateTime'],
  },
}

{
  name: 'calendar_list_upcoming',
  description: 'Lista los próximos eventos del calendario del usuario.',
  input_schema: {
    type: 'object',
    properties: {
      days: { type: 'number', description: 'Próximos N días', default: 7 },
      search: { type: 'string' },
    },
  },
}
```

### Email (Gmail / Outlook)

```typescript
{
  name: 'email_search_invoices',
  description: 'Busca en el correo del usuario emails que contienen facturas de proveedores.',
  input_schema: {
    type: 'object',
    properties: {
      dateFrom: { type: 'string' },
      limit: { type: 'number', default: 10 },
    },
  },
}

{
  name: 'email_send',
  description: 'Envía un email en nombre del usuario. SIEMPRE mostrar preview antes de enviar.',
  input_schema: {
    type: 'object',
    properties: {
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      attachmentKey: { type: 'string', description: 'Clave R2 de adjunto opcional' },
    },
    required: ['to', 'subject', 'body'],
  },
}
```

---

## FASE 3 — Tools de Documentos y OCR

```typescript
{
  name: 'document_extract_invoice',
  description: 'Extrae datos estructurados de una imagen o PDF de factura (OCR + IA).',
  input_schema: {
    type: 'object',
    properties: {
      storageKey: { type: 'string', description: 'Clave R2 del documento' },
      mimeType: { type: 'string' },
    },
    required: ['storageKey'],
  },
}

{
  name: 'document_book_in_erp',
  description: 'Crea un gasto en Holded con los datos extraídos de una factura. Requiere confirmación del usuario.',
  input_schema: {
    type: 'object',
    properties: {
      ocrData: { type: 'object' },  // resultado de document_extract_invoice
      connectorId: { type: 'string' },
    },
    required: ['ocrData'],
  },
}

{
  name: 'document_generate_pdf',
  description: 'Genera un documento PDF (contrato, presupuesto, informe) con datos del ERP.',
  input_schema: {
    type: 'object',
    properties: {
      templateType: { type: 'string', enum: ['contract', 'quote', 'report', 'tax_draft'] },
      data: { type: 'object' },
      title: { type: 'string' },
    },
    required: ['templateType', 'data'],
  },
}
```

---

## FASE 4 — Tools de Voz

```typescript
{
  name: 'voice_transcribe',
  description: 'Transcribe audio a texto usando Whisper.',
  input_schema: {
    type: 'object',
    properties: {
      audioKey: { type: 'string' },
      language: { type: 'string', default: 'es' },
    },
    required: ['audioKey'],
  },
}
```

---

## FASE 5 — Tools de Banca

```typescript
{
  name: 'bank_get_transactions',
  description: 'Obtiene las transacciones bancarias del usuario vía Open Banking (PSD2).',
  input_schema: {
    type: 'object',
    properties: {
      accountId: { type: 'string' },
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
      limit: { type: 'number', default: 50 },
    },
    required: ['accountId'],
  },
}

{
  name: 'bank_get_balance',
  description: 'Obtiene el saldo real de las cuentas bancarias del usuario.',
  input_schema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'Si no se especifica, devuelve todas las cuentas' },
    },
  },
}

{
  name: 'bank_reconcile_entries',
  description: 'Cruza transacciones bancarias con movimientos del ERP para proponer conciliación.',
  input_schema: {
    type: 'object',
    properties: {
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
    },
    required: ['dateFrom', 'dateTo'],
  },
}

{
  name: 'bank_forecast_cashflow',
  description: 'Genera una previsión de tesorería para los próximos N días cruzando datos bancarios y ERP.',
  input_schema: {
    type: 'object',
    properties: {
      days: { type: 'number', default: 30 },
      scenario: { type: 'string', enum: ['optimistic', 'base', 'pessimistic'], default: 'base' },
    },
  },
}
```

---

## Reglas de uso de tools (sistema de seguridad)

Algunas tools tienen riesgo de modificar datos o enviar comunicaciones. Se aplican estas reglas:

```typescript
// tools que SIEMPRE requieren confirmación explícita del usuario
const REQUIRES_CONFIRMATION = new Set([
  'holded_create_invoice_draft',
  'document_book_in_erp',
  'email_send',
  'document_generate_pdf',
  'bank_reconcile_entries',
  'calendar_create_event',
]);

// En el system prompt de Claude:
// "Antes de ejecutar cualquier tool de REQUIRES_CONFIRMATION,
//  muestra al usuario exactamente qué vas a hacer y espera su confirmación
//  con 'sí', 'confirmar' o similar."
```
