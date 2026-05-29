// F9 Isaak Ledger — LLM tool definitions and executor.
//
// Two write tools live in the ledger namespace:
//
//   1. isaak_ledger_create_entry — Isaak (or sub-agente fiscal) creates a
//      single accounting entry in the tenant's internal ledger. Backed by
//      appendLedgerEntry, so it inherits the hash-chain guarantee.
//
//   2. isaak_ledger_import_holded — bulk pull from Holded into the ledger,
//      idempotent by holded_id. Useful as the first action when a new
//      tenant connects Holded, and re-runnable to top up new docs.
//
// Both are WRITE tools (registered in WRITE_TOOL_NAMES) so they only run
// when the chat session sets allowWrites=true, and they go through the
// F4a judge guard like any other write.

import { appendLedgerEntry } from './isaak-ledger-repo';
import { importHoldedToLedger } from './isaak-ledger-holded-importer';
import {
  LEDGER_DOC_TYPES,
  LEDGER_SOURCE_SYSTEMS,
  type LedgerDocType,
  type LedgerSourceSystem,
} from './isaak-ledger-sql';
import { HOLDED_DOC_TYPES, type HoldedDocType } from './isaak-ledger-holded-mapper';
import { loadAuditInputsForTenant } from './isaak-audit-loader';
import { runAudit } from './inspector-aeat-audit';
import { REPORT_TYPES, reportFilename, type ReportType } from './isaak-excel-export';
import {
  VISUAL_REPORT_TYPES,
  buildVisualReportData,
  type VisualReportType,
} from './isaak-visual-report';
import { makeDownloadArtifact } from './isaak-artifact';
import {
  TAX_RETURN_MODELS,
  TAX_RETURN_STATUSES,
  listTaxReturns,
  upsertTaxReturn,
  type TaxReturnModel,
  type TaxReturnStatus,
} from './isaak-tax-returns';
import { syncAeatSedeForTenant } from './aeat-sede-sync';
import { prisma } from './prisma';
import { ViesAdapter } from './company-intelligence-sources';
import {
  TAXPAYER_TYPES,
  TERRITORIES,
  VAT_REGIMES,
  getTaxpayerProfile,
  upsertTaxpayerProfile,
  type TaxpayerProfileInput,
} from './isaak-taxpayer-profile';
import { computeAccountBalances } from './isaak-ledger-balances-repo';
import { aggregateBalancesForAudit } from './isaak-ledger-balances';
import { AEAT_SOURCES, type AeatSourceType } from './aeat-corpus-sources';

export const LEDGER_CHAT_TOOLS = [
  {
    name: 'isaak_ledger_create_entry',
    description:
      'Crea un asiento en el libro mayor interno de Isaak (Isaak Ledger). Es la fuente de verdad contable del tenant; la entrada queda encadenada por hash al asiento anterior (audit trail inmutable). USA esta tool solo cuando el usuario confirma explícitamente que quiere registrar un movimiento contable.',
    input_schema: {
      type: 'object',
      properties: {
        entryDate: {
          type: 'string',
          description: 'Fecha del asiento en formato YYYY-MM-DD.',
        },
        docType: {
          type: 'string',
          enum: [...LEDGER_DOC_TYPES],
          description:
            'Tipo de documento contable. invoice_in=factura de gasto recibida, invoice_out=factura emitida, expense=gasto sin factura, payroll=nómina, journal=asiento manual, tax_payment=pago a Hacienda.',
        },
        amount: {
          type: 'string',
          description:
            'Importe total como decimal en string (p.ej. "1210.00"). Se almacena con precisión exacta; no usar números float.',
        },
        description: {
          type: 'string',
          description: 'Descripción breve del asiento (10-200 caracteres recomendado).',
        },
        docNumber: { type: ['string', 'null'], description: 'Número de documento (opcional).' },
        counterpartyNif: {
          type: ['string', 'null'],
          description: 'NIF/CIF del tercero (opcional).',
        },
        counterpartyName: {
          type: ['string', 'null'],
          description: 'Nombre del tercero (opcional).',
        },
        currency: {
          type: 'string',
          description: 'Código ISO 4217 (default EUR).',
          default: 'EUR',
        },
        taxBase: {
          type: ['string', 'null'],
          description: 'Base imponible como decimal en string (opcional).',
        },
        vatRate: {
          type: ['string', 'null'],
          description: 'Tipo de IVA como decimal en string, p.ej. "21.00" (opcional).',
        },
        vatAmount: {
          type: ['string', 'null'],
          description: 'Cuota de IVA como decimal en string (opcional).',
        },
        accountDebit: {
          type: ['string', 'null'],
          description:
            'Código PGC de la cuenta cargada (debe). Ejemplos: 430 Clientes, 600 Compras, 570 Caja, 572 Bancos, 551 Socios. Opcional pero necesario para que el Inspector calcule saldos de caja/socios/cuenta 555 (R128/R129).',
        },
        accountCredit: {
          type: ['string', 'null'],
          description:
            'Código PGC de la cuenta abonada (haber). Ejemplos: 700 Ventas, 400 Proveedores, 477 IVA repercutido, 472 IVA soportado. Opcional. La partida doble exige cargo (debe) + abono (haber) por el mismo importe.',
        },
        sourceSystem: {
          type: 'string',
          enum: [...LEDGER_SOURCE_SYSTEMS],
          description:
            'Origen del dato. manual=el usuario lo dictó, ocr=extraído de imagen, banking=de extracto bancario, isaak_auto=automatizado por Isaak. NO uses "holded" desde esta tool (usa isaak_ledger_import_holded).',
        },
      },
      required: ['entryDate', 'docType', 'amount', 'description', 'sourceSystem'],
    },
  },
  {
    name: 'isaak_ledger_import_holded',
    description:
      'Importa documentos contables desde Holded al Isaak Ledger de forma idempotente (los duplicados se omiten por holded_id). Útil al conectar Holded por primera vez o para sincronizar incrementalmente. NO crea duplicados al re-ejecutarse.',
    input_schema: {
      type: 'object',
      properties: {
        docTypes: {
          type: 'array',
          items: { type: 'string', enum: [...HOLDED_DOC_TYPES] },
          description:
            'Lista de tipos de documento Holded a importar. Solo se contabilizan invoice/salesreceipt/creditnote/purchase/purchaserefund (los demás son no-fiscales y se omiten).',
        },
        from: {
          type: ['string', 'null'],
          description:
            'Fecha desde (YYYY-MM-DD). Si se omite, Holded usa su rango por defecto (~6 meses atrás).',
        },
        to: {
          type: ['string', 'null'],
          description: 'Fecha hasta (YYYY-MM-DD). Si se omite, hasta hoy.',
        },
        limitPerDocType: {
          type: 'number',
          description: 'Tope de documentos por tipo (default 100, máximo 500).',
        },
      },
      required: ['docTypes'],
    },
  },
  {
    name: 'isaak_export_ledger_excel',
    description:
      'Genera un Excel (.xlsx) solo-lectura desde el Isaak Ledger del tenant para el periodo indicado. Tipos soportados: libro_iva_emitidas, libro_iva_recibidas, libro_diario, modelo_303. NO modifica datos. Devuelve la URL de descarga para que el cliente lo abra; las celdas de datos quedan bloqueadas, las notas son editables.',
    input_schema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: [...REPORT_TYPES],
          description:
            'Tipo de informe a generar. libro_iva_emitidas = libro de facturas emitidas (SII), libro_iva_recibidas = libro de facturas recibidas, libro_diario = libro diario contable (PGC 2007), modelo_303 = resumen IVA trimestral con detalle.',
        },
        from: {
          type: 'string',
          description: 'Fecha inicio en formato YYYY-MM-DD (inclusivo).',
        },
        to: {
          type: 'string',
          description: 'Fecha fin en formato YYYY-MM-DD (inclusivo).',
        },
        label: {
          type: ['string', 'null'],
          description: 'Etiqueta del periodo para la cabecera del Excel (ej. "T2 2026"). Opcional.',
        },
      },
      required: ['reportType', 'from', 'to'],
    },
  },
  {
    name: 'isaak_list_tax_returns',
    description:
      'Lista los modelos tributarios registrados en Isaak (303, 130, 111, 115, etc.) para el ejercicio fiscal indicado. Útil para responder "qué he presentado en T2", "está el 111 ya enviado", etc. NO modifica datos.',
    input_schema: {
      type: 'object',
      properties: {
        fiscalYear: {
          type: 'number',
          description: 'Año fiscal (p.ej. 2026). Opcional — si se omite, lista todos.',
        },
        model: {
          type: 'string',
          enum: [...TAX_RETURN_MODELS],
          description: 'Modelo concreto a filtrar (opcional).',
        },
        status: {
          type: 'string',
          enum: [...TAX_RETURN_STATUSES],
          description: 'Estado a filtrar (opcional). draft/presented/accepted/rejected/rectified.',
        },
      },
    },
  },
  {
    name: 'isaak_record_tax_return',
    description:
      'Registra (o actualiza si ya existe) una declaración tributaria en Isaak. Llamar SOLO cuando el usuario confirma que ha presentado un modelo a AEAT, indicando el importe declarado y la referencia. Si el modelo ya estaba registrado se actualiza (upsert por tenant+modelo+periodo).',
    input_schema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          enum: [...TAX_RETURN_MODELS],
          description: 'Modelo tributario presentado.',
        },
        period: {
          type: 'string',
          description:
            'Periodo en formato Q1-2026 (trimestral), M03-2026 (mensual SII), A-2025 (anual).',
        },
        amountDeclared: {
          type: 'string',
          description:
            'Importe declarado (decimal en string, p.ej. "1234.56"). Para retenciones: total retenido; para IVA: cuota; para anuales: total declarado.',
        },
        status: {
          type: 'string',
          enum: [...TAX_RETURN_STATUSES],
          description:
            'Estado actual. presented=enviado a AEAT, accepted=confirmado, draft=borrador interno.',
        },
        amountToPay: {
          type: ['string', 'null'],
          description: 'Importe a ingresar (decimal en string). Opcional.',
        },
        amountToRefund: {
          type: ['string', 'null'],
          description: 'Importe a devolver (decimal en string). Opcional.',
        },
        referenceNumber: {
          type: ['string', 'null'],
          description: 'Número de referencia/CSV de AEAT. Opcional.',
        },
        presentedAt: {
          type: ['string', 'null'],
          description:
            'Fecha de presentación en YYYY-MM-DD o ISO. Si status=presented y se omite, Isaak usa el momento actual.',
        },
        notes: {
          type: ['string', 'null'],
          description: 'Notas internas (causa de rectificación, motivo, etc.).',
        },
      },
      required: ['model', 'period', 'amountDeclared'],
    },
  },
  {
    name: 'isaak_get_fiscal_profile',
    description:
      'Devuelve el perfil fiscal R000 del tenant (tipo de contribuyente, territorio, régimen IVA, sector, etc.) + completeness y campos pendientes. Útil para "qué tipo de empresa soy" o para saber si hace falta completar el wizard.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'isaak_set_fiscal_profile',
    description:
      'Actualiza el perfil fiscal R000 del tenant. Cuando el usuario indica explícitamente datos como "soy SL en Canarias con IGIC" o "tengo empleados", esta tool persiste el cambio. El Inspector AEAT usará el perfil actualizado en futuras auditorías.',
    input_schema: {
      type: 'object',
      properties: {
        taxpayerType: {
          type: ['string', 'null'],
          enum: [...TAXPAYER_TYPES, null],
          description: 'Tipo de contribuyente.',
        },
        territory: {
          type: ['string', 'null'],
          enum: [...TERRITORIES, null],
          description:
            'Territorio fiscal (común peninsular, Canarias=IGIC, foral País Vasco/Navarra, Ceuta/Melilla).',
        },
        vatRegime: {
          type: ['string', 'null'],
          enum: [...VAT_REGIMES, null],
          description: 'Régimen de IVA.',
        },
        sector: {
          type: ['string', 'null'],
          description:
            'Sector de actividad (hosteleria, consultoria, ecommerce, construccion, inmobiliario, transporte, formacion, sanidad, otros).',
        },
        corporateTaxSubject: { type: ['boolean', 'null'] },
        hasEmployees: { type: ['boolean', 'null'] },
        hasRentWithholding: { type: ['boolean', 'null'] },
        hasProfessionalInvoices: { type: ['boolean', 'null'] },
        hasIntraEUOperations: { type: ['boolean', 'null'] },
        hasRelatedParties: { type: ['boolean', 'null'] },
        usesBillingSoftware: { type: ['boolean', 'null'] },
        annualTurnover: { type: ['number', 'null'] },
        notes: { type: ['string', 'null'] },
      },
    },
  },
  {
    name: 'isaak_compute_303_draft',
    description:
      'Calcula un borrador del modelo 303 (IVA trimestral) desde el Isaak Ledger del tenant. Opcionalmente lo persiste como IsaakTaxReturn con status="draft". Devuelve devengado por tipo, soportado por tipo, resultado y advertencias. USA esta tool cuando el usuario pida "calcula mi 303 del T2" o "borrador IVA Q1 2026". NO envía a AEAT; sólo computa y guarda borrador.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: {
          type: 'number',
          description: 'Año fiscal completo (2020-2100). Ejemplo: 2026.',
        },
        periodo: {
          type: 'string',
          enum: ['1T', '2T', '3T', '4T'],
          description:
            'Trimestre. 1T=enero-marzo, 2T=abril-junio, 3T=julio-septiembre, 4T=octubre-diciembre.',
        },
        persist: {
          type: 'boolean',
          description:
            'Si true, guarda como IsaakTaxReturn draft (idempotente vía upsert). Default false: solo computa.',
        },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_submit_303',
    description:
      'Registra como presentada (audit-log inmutable) la declaración 303 borrador del trimestre indicado. Crea un IsaakAeatSubmission con status="pending_aeat" y promueve el IsaakTaxReturn de draft a presented. NO envía SOAP a AEAT todavía (eso vive en C-B1.c). USA esta tool cuando el usuario diga "confirma y presenta el 303 del T2", "registra como presentado", o equivalente. Antes debe existir un borrador (llamar a isaak_compute_303_draft con persist=true).',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: {
          type: 'number',
          description: 'Año fiscal completo (2020-2100). Ejemplo: 2026.',
        },
        periodo: {
          type: 'string',
          enum: ['1T', '2T', '3T', '4T'],
          description: 'Trimestre del borrador a presentar.',
        },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_compute_130_draft',
    description:
      'Calcula un borrador del modelo 130 (pago fraccionado IRPF para autónomos en estimación directa) desde el Isaak Ledger del tenant. El cálculo es acumulado del año natural hasta fin del trimestre indicado. Opcionalmente lo persiste como IsaakTaxReturn con status="draft". USA esta tool cuando el usuario pida "calcula mi 130 del T2" o "borrador IRPF trimestral autónomo". Devuelve ingresos, gastos, rendimiento neto, cuota (20%), retenciones, pagos previos y resultado a ingresar. NO procede para sociedades (modelo 202).',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: {
          type: 'number',
          description: 'Año fiscal completo (2020-2100). Ejemplo: 2026.',
        },
        periodo: {
          type: 'string',
          enum: ['1T', '2T', '3T', '4T'],
          description:
            'Trimestre. El cálculo es acumulado desde 1 enero hasta fin de este trimestre.',
        },
        retencionesAcumuladas: {
          type: ['number', 'null'],
          description:
            'Retenciones IRPF acumuladas del ejercicio (p.ej. retenciones del 15% en facturas profesionales). Opcional; si se omite, se asume 0.',
        },
        ingresosACuenta: {
          type: ['number', 'null'],
          description:
            'Pagos fraccionados previos del 130 en el mismo año. Si se omite, Isaak intenta auto-detectarlos desde tax_payment del Ledger.',
        },
        persist: {
          type: 'boolean',
          description:
            'Si true, guarda como IsaakTaxReturn draft (idempotente vía upsert). Default false: solo computa.',
        },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_submit_130',
    description:
      'Registra como presentada (audit-log inmutable) la declaración 130 borrador del trimestre. Crea un IsaakAeatSubmission con status="pending_aeat" y promueve el IsaakTaxReturn de draft a presented. NO envía SOAP a AEAT todavía. USA esta tool cuando el usuario confirma explícitamente que quiere presentar el 130. Antes debe existir un borrador.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: {
          type: 'number',
          description: 'Año fiscal completo (2020-2100).',
        },
        periodo: {
          type: 'string',
          enum: ['1T', '2T', '3T', '4T'],
          description: 'Trimestre del borrador a presentar.',
        },
        retencionesAcumuladas: {
          type: ['number', 'null'],
          description: 'Retenciones acumuladas (opcional).',
        },
        ingresosACuenta: {
          type: ['number', 'null'],
          description: 'Pagos previos del 130 (opcional, auto-detección si se omite).',
        },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_compute_111_draft',
    description:
      'Calcula un borrador del modelo 111 (retenciones IRPF practicadas a trabajadores y profesionales) desde el Isaak Ledger del tenant. Trimestral. Detecta retenciones implícitas en payroll (bruto vs líquido) y en facturas de profesionales (15%). USA cuando el usuario pida "borrador 111", "retenciones IRPF trimestrales" o equivalente.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number', description: 'Año fiscal (2020-2100).' },
        periodo: { type: 'string', enum: ['1T', '2T', '3T', '4T'] },
        persist: { type: 'boolean', description: 'Guarda como IsaakTaxReturn draft.' },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_submit_111',
    description:
      'Registra como presentado el borrador 111 del trimestre. Crea audit-log inmutable y promueve el draft a presented. Antes debe existir el borrador.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
        periodo: { type: 'string', enum: ['1T', '2T', '3T', '4T'] },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_compute_349_draft',
    description:
      'Calcula un borrador del modelo 349 (resumen recapitulativo de operaciones intracomunitarias) desde el Isaak Ledger. Trimestral. Detecta operaciones UE (NIF con prefijo país ≠ ES, IVA 0%) y las clasifica en claves E (entregas), A (adquisiciones), S (servicios prestados), I (servicios recibidos). Devuelve la lista por contraparte.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
        periodo: { type: 'string', enum: ['1T', '2T', '3T', '4T'] },
        persist: { type: 'boolean' },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_submit_349',
    description:
      'Registra como presentado el borrador 349 del trimestre. Audit-log inmutable. Antes debe existir el borrador.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
        periodo: { type: 'string', enum: ['1T', '2T', '3T', '4T'] },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_compute_347_draft',
    description:
      'Calcula un borrador del modelo 347 (declaración anual operaciones con terceros > €3005.06). Por cada contraparte (cliente o proveedor) cuya suma anual de operaciones supere el umbral, lista el desglose trimestral. Excluye operaciones intracom (van al 349) y operaciones con retención (van al 190/180). Anual, no trimestral.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number', description: 'Año fiscal completo a declarar.' },
        persist: { type: 'boolean' },
      },
      required: ['ejercicio'],
    },
  },
  {
    name: 'isaak_submit_347',
    description:
      'Registra como presentado el borrador 347 del ejercicio. Audit-log inmutable. Antes debe existir el borrador.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
      },
      required: ['ejercicio'],
    },
  },
  {
    name: 'isaak_compute_115_draft',
    description:
      'Calcula un borrador del modelo 115 (retenciones IRPF en arrendamientos urbanos). Trimestral. Detecta facturas de alquiler (cuenta PGC 621 o descripción con "alquiler"/"arrendamiento"/"local comercial") y deriva la retención del 19% de la diferencia entre bruto y amount pagado.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
        periodo: { type: 'string', enum: ['1T', '2T', '3T', '4T'] },
        persist: { type: 'boolean' },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_submit_115',
    description:
      'Registra como presentado el borrador 115 del trimestre. Audit-log inmutable. Antes debe existir el borrador.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
        periodo: { type: 'string', enum: ['1T', '2T', '3T', '4T'] },
      },
      required: ['ejercicio', 'periodo'],
    },
  },
  {
    name: 'isaak_compute_180_draft',
    description:
      'Calcula el borrador del modelo 180 (resumen anual de retenciones en arrendamientos). Anual. Lista cada arrendador con base anual, retenciones anuales y número de operaciones. Es el rollup del 115.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
        persist: { type: 'boolean' },
      },
      required: ['ejercicio'],
    },
  },
  {
    name: 'isaak_submit_180',
    description: 'Registra como presentado el borrador 180 del ejercicio. Audit-log inmutable.',
    input_schema: {
      type: 'object',
      properties: { ejercicio: { type: 'number' } },
      required: ['ejercicio'],
    },
  },
  {
    name: 'isaak_compute_190_draft',
    description:
      'Calcula el borrador del modelo 190 (resumen anual de retenciones rendimientos trabajo y actividades profesionales). Anual. Clasifica cada perceptor en clave A (trabajadores) o G (profesionales). Es el rollup del 111.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'number' },
        persist: { type: 'boolean' },
      },
      required: ['ejercicio'],
    },
  },
  {
    name: 'isaak_submit_190',
    description: 'Registra como presentado el borrador 190 del ejercicio. Audit-log inmutable.',
    input_schema: {
      type: 'object',
      properties: { ejercicio: { type: 'number' } },
      required: ['ejercicio'],
    },
  },
  {
    name: 'inspector_search_aeat',
    description:
      'Búsqueda semántica en el corpus AEAT/BOE de Isaak (manuales prácticos IRPF/IVA/Sociedades, BOE consolidados LIVA/LIRPF/LIS/LGT/Reglamentos, INFORMA DGT, FAQs sede). Devuelve los pasajes más relevantes con su URL canónica para citar. USA esta tool cuando el usuario pregunte sobre normativa fiscal y necesites apoyar la respuesta con cita.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Pregunta o concepto fiscal en lenguaje natural. Ejemplo: "deducibilidad IVA gasolina vehículo turismo".',
        },
        sourceTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['manual_aeat', 'boe', 'informa', 'sede_faq', 'doctrina_dgt'],
          },
          description:
            'Filtra por tipo de fuente. Opcional. Útil para buscar solo en BOE o solo en manuales.',
        },
        topK: {
          type: 'number',
          description: 'Máximo de pasajes a devolver (1-20, default 5).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'inspector_consult',
    description:
      'F12 — Inspector AEAT Capa 2. Sub-agente fiscal contextual. USA esta tool cuando el usuario haga una pregunta fiscal compleja que requiera CITAS específicas al BOE/normativa: regímenes especiales, prorrata, IRPF complejo, deducibilidad concreta, plazos legales, operaciones intracom. Internamente combina perfil fiscal del tenant + búsqueda RAG en corpus AEAT + síntesis LLM con citas [1], [2], etc. Devuelve respuesta enriquecida con fuentes BOE. NO la uses para preguntas operativas simples (esas las responde el chat directamente).',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Pregunta fiscal en lenguaje natural. Ej: "¿Cuándo aplico prorrata especial?", "¿Qué retención IRPF para un alquiler de local?", "¿El IVA de la gasolina es deducible al 100%?".',
        },
        topK: {
          type: 'number',
          description: 'Máximo de pasajes BOE a usar como contexto (1-20, default 5).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'isaak_ledger_get_balances',
    description:
      'Devuelve los saldos por cuenta PGC del Isaak Ledger del tenant a fecha (o hasta hoy si se omite). Útil para responder "cuánto tengo en caja", "saldo cuenta socios", "qué cuentas tienen movimiento". Devuelve también agregados (caja, socios, partidas pendientes, bancos PGC) que el Inspector consume para R128/R129.',
    input_schema: {
      type: 'object',
      properties: {
        periodEnd: {
          type: ['string', 'null'],
          description:
            'Fecha tope inclusiva en YYYY-MM-DD. Si se omite, computa hasta el último asiento.',
        },
        onlyKind: {
          type: ['string', 'null'],
          enum: ['cash', 'bank', 'partner', 'pending', 'other', null],
          description: 'Filtra solo cuentas de un tipo. Opcional.',
        },
      },
    },
  },
  {
    name: 'isaak_summarize_aeat_inbox',
    description:
      'Genera un resumen IA de las notificaciones AEAT (DEH) recibidas en los últimos N días + cambios censales detectados. Útil cuando el usuario pregunta "qué ha pasado esta semana con mi AEAT" o "tengo algo pendiente". Devuelve texto en español listo para mostrar.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Ventana en días hacia atrás (default 7, máx 90).',
        },
      },
    },
  },
  {
    name: 'isaak_validate_vat_intracom',
    description:
      'Valida un NIF-IVA intracomunitario contra el VIES de la Comisión Europea (Company Intelligence ViesAdapter). Útil ANTES de emitir factura B2B intracomunitaria exenta del Art. 25 LIVA. Si el VIES dice que NO es válido, la operación debe llevar IVA español al 21%, no exenta.',
    input_schema: {
      type: 'object',
      properties: {
        vatNumber: {
          type: 'string',
          description:
            'NIF-IVA con prefijo país UE (ej. DE123456789, FRBN12345678901, ESB12345678). Si solo tienes el NIF español sin prefijo, antepón "ES".',
        },
      },
      required: ['vatNumber'],
    },
  },
  {
    name: 'isaak_sync_aeat_sede',
    description:
      'Sincroniza la sede AEAT del tenant: descarga notificaciones DEH y censo 036/037, dedupe lo ya conocido y crea alertas si hay notificaciones críticas o cambios censales. Solo funciona si el tenant tiene cert digital cargado. NO modifica datos en AEAT (solo lectura).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'isaak_list_aeat_notifications',
    description:
      'Lista las notificaciones AEAT del tenant ya persistidas. Útil para responder "¿qué notificaciones AEAT tengo?". Filtra por estado/severity opcionalmente.',
    input_schema: {
      type: 'object',
      properties: {
        estado: {
          type: 'string',
          enum: ['pendiente', 'leida', 'expirada', 'archivada'],
          description: 'Filtrar por estado (opcional).',
        },
        onlyUnacknowledged: {
          type: 'boolean',
          description: 'Si true, solo devuelve las que no han sido marcadas como leídas.',
        },
        limit: {
          type: 'number',
          description: 'Máximo de notificaciones a devolver (default 20, máx 100).',
        },
      },
    },
  },
  {
    name: 'isaak_list_aeat_census_changes',
    description:
      'Lista los cambios censales (036/037) detectados por Isaak en los últimos N días. Útil para responder "¿ha cambiado algo en mi censo AEAT?".',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Ventana de días hacia atrás (default 90, máx 365).',
        },
      },
    },
  },
  {
    name: 'isaak_audit_ledger',
    description:
      'Inspector AEAT preventivo: corre la auditoría completa sobre el Isaak Ledger del tenant en el periodo indicado y devuelve violaciones (errores, warnings, infos) con cita normativa. Útil al cierre mensual/trimestral o cuando el usuario pregunta "¿está todo correcto?". NO modifica datos.',
    input_schema: {
      type: 'object',
      properties: {
        periodFrom: {
          type: 'string',
          description: 'Inicio del periodo a auditar en formato YYYY-MM-DD (inclusivo).',
        },
        periodTo: {
          type: 'string',
          description: 'Fin del periodo a auditar en formato YYYY-MM-DD (inclusivo).',
        },
        scope: {
          type: 'string',
          enum: ['monthly_close', 'quarterly_close', 'annual_close', 'on_demand'],
          description:
            'Naturaleza del audit. monthly/quarterly/annual = cierre formal, on_demand = consulta puntual del usuario.',
        },
      },
      required: ['periodFrom', 'periodTo'],
    },
  },
  {
    name: 'isaak_generate_visual_report',
    description:
      'Genera un informe visual interactivo (gráfico + tabla) en el panel lateral de Isaak. Úsala cuando el usuario pida "ver ventas por mes", "desglose de gastos", "flujo de caja" o "IVA trimestral" en formato visual/gráfico. NO modifica datos. Devuelve un artifact visual que la UI renderiza automáticamente.',
    input_schema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: ['sales_by_month', 'expense_breakdown', 'cash_flow', 'iva_trimestral'],
          description:
            'Tipo de informe visual. sales_by_month=ventas por mes (barras), expense_breakdown=desglose gastos por proveedor (tarta), cash_flow=ingresos vs gastos por mes (líneas), iva_trimestral=IVA devengado/soportado por trimestre (barras).',
        },
        from: {
          type: 'string',
          description: 'Fecha inicio en formato YYYY-MM-DD (inclusivo).',
        },
        to: {
          type: 'string',
          description: 'Fecha fin en formato YYYY-MM-DD (inclusivo).',
        },
        title: {
          type: ['string', 'null'],
          description: 'Título personalizado del informe (opcional).',
        },
      },
      required: ['reportType', 'from', 'to'],
    },
  },
  {
    name: 'isaak_export_pdf',
    description:
      'Genera un informe PDF descargable desde el Isaak Ledger. Úsalo cuando el usuario pida el libro IVA, libro diario o resumen 303 en formato PDF. Devuelve un artifact con enlace de descarga que la UI muestra en el panel lateral.',
    input_schema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: ['libro_iva_emitidas', 'libro_iva_recibidas', 'libro_diario', 'modelo_303'],
          description: 'Tipo de informe PDF a generar.',
        },
        from: {
          type: 'string',
          description: 'Fecha inicio en formato YYYY-MM-DD.',
        },
        to: {
          type: 'string',
          description: 'Fecha fin en formato YYYY-MM-DD.',
        },
        label: {
          type: ['string', 'null'],
          description: 'Etiqueta del periodo (ej. "T2 2026"). Opcional.',
        },
      },
      required: ['reportType', 'from', 'to'],
    },
  },
  {
    name: 'isaak_export_word',
    description:
      'Genera un informe Word (.docx) descargable desde el Isaak Ledger. Úsalo cuando el usuario pida el libro IVA, diario o resumen 303 en formato Word/documento editable. Devuelve un artifact con enlace de descarga.',
    input_schema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: ['libro_iva_emitidas', 'libro_iva_recibidas', 'libro_diario', 'modelo_303'],
          description: 'Tipo de informe Word a generar.',
        },
        from: {
          type: 'string',
          description: 'Fecha inicio en formato YYYY-MM-DD.',
        },
        to: {
          type: 'string',
          description: 'Fecha fin en formato YYYY-MM-DD.',
        },
        label: {
          type: ['string', 'null'],
          description: 'Etiqueta del periodo (ej. "T2 2026"). Opcional.',
        },
      },
      required: ['reportType', 'from', 'to'],
    },
  },
] as const;

export type LedgerToolName = (typeof LEDGER_CHAT_TOOLS)[number]['name'];

const LEDGER_TOOL_NAMES = new Set<string>(LEDGER_CHAT_TOOLS.map((t) => t.name));

export function isLedgerToolName(name: string): name is LedgerToolName {
  return LEDGER_TOOL_NAMES.has(name);
}

export type LedgerToolContext = {
  tenantId: string;
  userId: string;
  holdedApiKey?: string | null;
};

export async function executeLedgerTool(
  ctx: LedgerToolContext,
  name: LedgerToolName,
  input: unknown
): Promise<unknown> {
  const args = (input ?? {}) as Record<string, unknown>;

  if (name === 'isaak_ledger_create_entry') {
    const docType = args.docType as LedgerDocType;
    const sourceSystem = args.sourceSystem as LedgerSourceSystem;
    if (sourceSystem === 'holded') {
      return {
        error: 'invalid_source_system',
        message:
          'sourceSystem="holded" no se permite en create_entry. Usa isaak_ledger_import_holded para importar desde Holded.',
      };
    }
    try {
      const result = await appendLedgerEntry({
        tenantId: ctx.tenantId,
        entryDate: String(args.entryDate ?? ''),
        docType,
        docNumber: (args.docNumber as string | null | undefined) ?? null,
        counterpartyNif: (args.counterpartyNif as string | null | undefined) ?? null,
        counterpartyName: (args.counterpartyName as string | null | undefined) ?? null,
        amount: String(args.amount ?? ''),
        currency: (args.currency as string | undefined) ?? 'EUR',
        taxBase: (args.taxBase as string | null | undefined) ?? null,
        vatRate: (args.vatRate as string | null | undefined) ?? null,
        vatAmount: (args.vatAmount as string | null | undefined) ?? null,
        accountDebit: (args.accountDebit as string | null | undefined) ?? null,
        accountCredit: (args.accountCredit as string | null | undefined) ?? null,
        description: String(args.description ?? ''),
        sourceSystem,
        holdedId: null,
        attachmentUrl: null,
        createdBy: ctx.userId,
      });
      return {
        ok: true,
        id: result.id,
        hash: result.hash,
        sequence: Number(result.sequence),
        message: `Asiento registrado en el libro mayor (id ${result.id.slice(0, 8)}, secuencia ${result.sequence}).`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'append_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_ledger_import_holded') {
    if (!ctx.holdedApiKey) {
      return {
        ok: false,
        error: 'holded_not_connected',
        message:
          'Holded no está conectado en este tenant. Pide al usuario que conecte Holded antes.',
      };
    }
    const docTypes = (args.docTypes as HoldedDocType[]) ?? [];
    if (!Array.isArray(docTypes) || docTypes.length === 0) {
      return { ok: false, error: 'invalid_input', message: 'docTypes requerido.' };
    }
    try {
      const result = await importHoldedToLedger({
        tenantId: ctx.tenantId,
        apiKey: ctx.holdedApiKey,
        docTypes,
        from: (args.from as string | undefined) ?? undefined,
        to: (args.to as string | undefined) ?? undefined,
        limitPerDocType:
          typeof args.limitPerDocType === 'number' ? args.limitPerDocType : undefined,
        createdBy: ctx.userId,
      });
      return {
        ok: true,
        imported: result.imported,
        skipped: result.skipped,
        errorCount: result.errors.length,
        perDocType: result.perDocType,
        sampleErrors: result.errors.slice(0, 5),
        message: `Importación completada: ${result.imported} nuevos, ${result.skipped} ya existían${result.errors.length ? `, ${result.errors.length} con errores` : ''}.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'import_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_export_ledger_excel') {
    const reportType = args.reportType as ReportType;
    if (!REPORT_TYPES.includes(reportType)) {
      return {
        ok: false,
        error: 'invalid_report_type',
        message: `Tipo no soportado. Usa uno de: ${REPORT_TYPES.join(', ')}.`,
      };
    }
    const from = String(args.from ?? '');
    const to = String(args.to ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return {
        ok: false,
        error: 'invalid_period',
        message: 'from/to deben ser YYYY-MM-DD.',
      };
    }
    if (to < from) {
      return {
        ok: false,
        error: 'invalid_period',
        message: 'to no puede ser anterior a from.',
      };
    }
    const label = typeof args.label === 'string' ? args.label : undefined;
    const params = new URLSearchParams({ reportType, from, to });
    if (label) params.set('label', label);
    const downloadUrl = `/api/isaak/export/excel?${params.toString()}`;
    const filename = reportFilename(reportType, { from, to, label });
    return {
      ok: true,
      reportType,
      period: { from, to, label },
      filename,
      downloadUrl,
      artifact: makeDownloadArtifact({ type: 'excel', title: filename, downloadUrl, filename }),
      message: `Excel "${filename}" listo. Indica al usuario que pulse el enlace de descarga; el documento es solo lectura excepto la columna de notas.`,
    };
  }

  if (name === 'isaak_list_tax_returns') {
    try {
      const taxReturns = await listTaxReturns({
        tenantId: ctx.tenantId,
        fiscalYear: typeof args.fiscalYear === 'number' ? args.fiscalYear : undefined,
        model: (args.model as TaxReturnModel) ?? undefined,
        status: (args.status as TaxReturnStatus) ?? undefined,
      });
      return {
        ok: true,
        count: taxReturns.length,
        taxReturns,
        message: taxReturns.length
          ? `Encontrados ${taxReturns.length} modelos.`
          : 'No hay modelos registrados con esos filtros.',
      };
    } catch (err) {
      return {
        ok: false,
        error: 'list_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_record_tax_return') {
    try {
      const result = await upsertTaxReturn({
        tenantId: ctx.tenantId,
        model: args.model as TaxReturnModel,
        period: String(args.period ?? ''),
        status: (args.status as TaxReturnStatus | undefined) ?? 'presented',
        amountDeclared: String(args.amountDeclared ?? ''),
        amountToPay: (args.amountToPay as string | null | undefined) ?? null,
        amountToRefund: (args.amountToRefund as string | null | undefined) ?? null,
        presentedAt: (args.presentedAt as string | null | undefined) ?? null,
        referenceNumber: (args.referenceNumber as string | null | undefined) ?? null,
        notes: (args.notes as string | null | undefined) ?? null,
        createdBy: ctx.userId,
      });
      return {
        ok: true,
        id: result.id,
        isNew: result.isNew,
        message: result.isNew
          ? `Modelo ${args.model} ${args.period} registrado por importe ${args.amountDeclared}€.`
          : `Modelo ${args.model} ${args.period} actualizado.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'record_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_get_fiscal_profile') {
    try {
      const profile = await getTaxpayerProfile(ctx.tenantId);
      const { evaluateProfile } = await import('./inspector-aeat-profile');
      const snapshot = profile
        ? {
            taxpayerType: profile.taxpayerType,
            territory: profile.territory,
            vatRegime: profile.vatRegime,
            sector: profile.sector,
            corporateTaxSubject: profile.corporateTaxSubject,
            hasEmployees: profile.hasEmployees,
            hasRentWithholding: profile.hasRentWithholding,
            hasProfessionalInvoices: profile.hasProfessionalInvoices,
            hasIntraEUOperations: profile.hasIntraEUOperations,
            hasRelatedParties: profile.hasRelatedParties,
            usesBillingSoftware: profile.usesBillingSoftware,
            annualTurnover: profile.annualTurnover
              ? Number.parseFloat(profile.annualTurnover)
              : null,
          }
        : null;
      const report = evaluateProfile(snapshot);
      return {
        ok: true,
        profile,
        completeness: report.completeness,
        gaps: report.gaps.map((g) => g.field),
        message: profile
          ? `Perfil fiscal: ${(report.completeness * 100).toFixed(0)}% completado.`
          : 'Aún no has completado el perfil fiscal. Lanza el wizard R000 o usa isaak_set_fiscal_profile.',
      };
    } catch (err) {
      return {
        ok: false,
        error: 'get_profile_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_set_fiscal_profile') {
    try {
      const result = await upsertTaxpayerProfile({
        tenantId: ctx.tenantId,
        taxpayerType: args.taxpayerType as TaxpayerProfileInput['taxpayerType'],
        territory: args.territory as TaxpayerProfileInput['territory'],
        vatRegime: args.vatRegime as TaxpayerProfileInput['vatRegime'],
        sector: (args.sector as string | null | undefined) ?? null,
        corporateTaxSubject: (args.corporateTaxSubject as boolean | null | undefined) ?? null,
        hasEmployees: (args.hasEmployees as boolean | null | undefined) ?? null,
        hasRentWithholding: (args.hasRentWithholding as boolean | null | undefined) ?? null,
        hasProfessionalInvoices:
          (args.hasProfessionalInvoices as boolean | null | undefined) ?? null,
        hasIntraEUOperations: (args.hasIntraEUOperations as boolean | null | undefined) ?? null,
        hasRelatedParties: (args.hasRelatedParties as boolean | null | undefined) ?? null,
        usesBillingSoftware: (args.usesBillingSoftware as boolean | null | undefined) ?? null,
        annualTurnover: (args.annualTurnover as number | null | undefined) ?? null,
        notes: (args.notes as string | null | undefined) ?? null,
        confirmedByUser: true,
        confirmedBy: ctx.userId,
        prefilledFromCi: false,
      });
      return {
        ok: true,
        id: result.id,
        isNew: result.isNew,
        message: result.isNew
          ? 'Perfil fiscal creado. El Inspector AEAT lo usará en futuras auditorías.'
          : 'Perfil fiscal actualizado.',
      };
    } catch (err) {
      return {
        ok: false,
        error: 'set_profile_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_303_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return {
        ok: false,
        error: 'invalid_ejercicio',
        message: 'ejercicio debe ser un año entre 2020 y 2100.',
      };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return {
        ok: false,
        error: 'invalid_periodo',
        message: 'periodo debe ser 1T, 2T, 3T o 4T.',
      };
    }
    try {
      const { compute303ForTenant } = await import('./isaak-modelo-303-repo');
      const result = await compute303ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return {
          ok: true,
          skipped: true,
          reason: result.output.reason,
          message:
            result.output.reason === 'régimen_recargo_equivalencia'
              ? 'No procede 303: el tenant está en régimen especial de recargo de equivalencia (el proveedor ingresa el IVA, el minorista NO presenta 303).'
              : result.output.reason === 'régimen_exento_iva'
                ? 'No procede 303: el tenant está en régimen exento de IVA.'
                : `Cálculo no realizado: ${result.output.reason}`,
        };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        periodo: r.periodo,
        summary: {
          totalDevengado: r.totalDevengado,
          totalSoportado: r.totalSoportado,
          resultado: r.resultado,
          esAIngresar: r.resultado > 0,
          esADevolver: r.resultado < 0,
          facturas: r.facturas,
          compras: r.compras,
        },
        repercutidoPorTipo: r.repercutido,
        soportadoPorTipo: r.soportado,
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 303 ${r.periodo} ${r.ejercicio} computado y guardado. Resultado: ${r.resultado.toFixed(2)}€ ${r.resultado > 0 ? 'a ingresar' : r.resultado < 0 ? 'a devolver/compensar' : 'a cero'}.`
          : `Borrador 303 ${r.periodo} ${r.ejercicio} computado (no guardado). Resultado: ${r.resultado.toFixed(2)}€.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_303') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return {
        ok: false,
        error: 'invalid_ejercicio',
        message: 'ejercicio debe ser un año entre 2020 y 2100.',
      };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return {
        ok: false,
        error: 'invalid_periodo',
        message: 'periodo debe ser 1T, 2T, 3T o 4T.',
      };
    }
    if (!ctx.userId) {
      return {
        ok: false,
        error: 'missing_user',
        message: 'No se puede registrar una presentación sin un usuario identificado.',
      };
    }
    try {
      const { submit303ForTenant } = await import('./isaak-modelo-303-repo');
      const result = await submit303ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        submittedBy: ctx.userId,
      });
      if (!result.ok) {
        return { ok: false, error: result.error, message: result.message };
      }
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        resultado: result.result.resultado,
        message: `Modelo 303 ${result.result.periodo} ${result.result.ejercicio} registrado como presentado. Resultado: ${result.result.resultado.toFixed(2)}€ ${result.result.resultado > 0 ? 'a ingresar' : result.result.resultado < 0 ? 'a devolver/compensar' : 'a cero'}. El envío SOAP a AEAT está pendiente (C-B1.c).`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_130_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return {
        ok: false,
        error: 'invalid_ejercicio',
        message: 'ejercicio debe ser un año entre 2020 y 2100.',
      };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return {
        ok: false,
        error: 'invalid_periodo',
        message: 'periodo debe ser 1T, 2T, 3T o 4T.',
      };
    }
    try {
      const { compute130ForTenant } = await import('./isaak-modelo-130-repo');
      const result = await compute130ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        retencionesAcumuladas:
          typeof args.retencionesAcumuladas === 'number' ? args.retencionesAcumuladas : undefined,
        ingresosACuenta:
          typeof args.ingresosACuenta === 'number' ? args.ingresosACuenta : undefined,
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return {
          ok: true,
          skipped: true,
          reason: result.output.reason,
          message:
            result.output.reason === 'no_aplica_no_autonomo'
              ? 'No procede 130: este tenant no es autónomo (las sociedades presentan modelo 202).'
              : `Cálculo no realizado: ${result.output.reason}`,
        };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        periodo: r.periodo,
        summary: {
          ingresosAcumulados: r.ingresosAcumulados,
          gastosAcumulados: r.gastosAcumulados,
          rendimientoNeto: r.rendimientoNeto,
          cuotaPrevia: r.cuotaPrevia,
          retencionesAcumuladas: r.retencionesAcumuladas,
          ingresosACuenta: r.ingresosACuenta,
          resultado: r.resultado,
        },
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 130 ${r.periodo} ${r.ejercicio} computado y guardado. Resultado: ${r.resultado.toFixed(2)}€ ${r.resultado > 0 ? 'a ingresar' : 'a cero'}.`
          : `Borrador 130 ${r.periodo} ${r.ejercicio} computado (no guardado). Resultado: ${r.resultado.toFixed(2)}€.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_130') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return { ok: false, error: 'invalid_periodo', message: 'periodo inválido.' };
    }
    if (!ctx.userId) {
      return {
        ok: false,
        error: 'missing_user',
        message: 'No se puede registrar una presentación sin un usuario identificado.',
      };
    }
    try {
      const { submit130ForTenant } = await import('./isaak-modelo-130-repo');
      const result = await submit130ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        submittedBy: ctx.userId,
        retencionesAcumuladas:
          typeof args.retencionesAcumuladas === 'number' ? args.retencionesAcumuladas : undefined,
        ingresosACuenta:
          typeof args.ingresosACuenta === 'number' ? args.ingresosACuenta : undefined,
      });
      if (!result.ok) {
        return { ok: false, error: result.error, message: result.message };
      }
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        resultado: result.result.resultado,
        message: `Modelo 130 ${result.result.periodo} ${result.result.ejercicio} registrado como presentado. Resultado: ${result.result.resultado.toFixed(2)}€ ${result.result.resultado > 0 ? 'a ingresar' : 'a cero'}. El envío SOAP a AEAT está pendiente.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_111_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return { ok: false, error: 'invalid_periodo', message: 'periodo inválido.' };
    }
    try {
      const { compute111ForTenant } = await import('./isaak-modelo-111-repo');
      const result = await compute111ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return {
          ok: true,
          skipped: true,
          reason: result.output.reason,
          message: `Cálculo no realizado: ${result.output.reason}`,
        };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        periodo: r.periodo,
        trabajadores: r.trabajadores,
        profesionales: r.profesionales,
        totalBases: r.totalBases,
        totalRetenciones: r.totalRetenciones,
        resultado: r.resultado,
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 111 ${r.periodo} ${r.ejercicio} computado y guardado. Total retenciones: ${r.totalRetenciones.toFixed(2)}€.`
          : `Borrador 111 ${r.periodo} ${r.ejercicio} computado (no guardado). Total retenciones: ${r.totalRetenciones.toFixed(2)}€.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_111') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return { ok: false, error: 'invalid_periodo', message: 'periodo inválido.' };
    }
    if (!ctx.userId) {
      return { ok: false, error: 'missing_user', message: 'Falta usuario identificado.' };
    }
    try {
      const { submit111ForTenant } = await import('./isaak-modelo-111-repo');
      const result = await submit111ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        submittedBy: ctx.userId,
      });
      if (!result.ok) return { ok: false, error: result.error, message: result.message };
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        resultado: result.result.resultado,
        message: `Modelo 111 ${result.result.periodo} ${result.result.ejercicio} registrado como presentado. Retenciones a ingresar: ${result.result.resultado.toFixed(2)}€.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_349_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return { ok: false, error: 'invalid_periodo', message: 'periodo inválido.' };
    }
    try {
      const { compute349ForTenant } = await import('./isaak-modelo-349-repo');
      const result = await compute349ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return {
          ok: true,
          skipped: true,
          reason: result.output.reason,
          message: `Cálculo no realizado: ${result.output.reason}`,
        };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        periodo: r.periodo,
        lineas: r.lineas,
        totalEntregas: r.totalEntregas,
        totalAdquisiciones: r.totalAdquisiciones,
        totalOperaciones: r.totalOperaciones,
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 349 ${r.periodo} ${r.ejercicio} computado y guardado. ${r.lineas.length} líneas (${r.totalOperaciones} operaciones).`
          : `Borrador 349 ${r.periodo} ${r.ejercicio} computado (no guardado). ${r.lineas.length} líneas.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_349') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return { ok: false, error: 'invalid_periodo', message: 'periodo inválido.' };
    }
    if (!ctx.userId) {
      return { ok: false, error: 'missing_user', message: 'Falta usuario identificado.' };
    }
    try {
      const { submit349ForTenant } = await import('./isaak-modelo-349-repo');
      const result = await submit349ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        submittedBy: ctx.userId,
      });
      if (!result.ok) return { ok: false, error: result.error, message: result.message };
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        totalEntregas: result.result.totalEntregas,
        totalAdquisiciones: result.result.totalAdquisiciones,
        message: `Modelo 349 ${result.result.periodo} ${result.result.ejercicio} registrado como presentado.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_347_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    try {
      const { compute347ForTenant } = await import('./isaak-modelo-347-repo');
      const result = await compute347ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return {
          ok: true,
          skipped: true,
          reason: result.output.reason,
          message: `Cálculo no realizado: ${result.output.reason}`,
        };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        umbral: r.umbral,
        lineasClientes: r.lineasClientes,
        lineasProveedores: r.lineasProveedores,
        totalDeclaradoClientes: r.totalDeclaradoClientes,
        totalDeclaradoProveedores: r.totalDeclaradoProveedores,
        contrapartesExcluidasPorUmbral: r.contrapartesExcluidasPorUmbral,
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 347 ${r.ejercicio} computado y guardado. Clientes: ${r.lineasClientes.length}, proveedores: ${r.lineasProveedores.length}.`
          : `Borrador 347 ${r.ejercicio} computado (no guardado). Clientes: ${r.lineasClientes.length}, proveedores: ${r.lineasProveedores.length}.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_347') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    if (!ctx.userId) {
      return { ok: false, error: 'missing_user', message: 'Falta usuario identificado.' };
    }
    try {
      const { submit347ForTenant } = await import('./isaak-modelo-347-repo');
      const result = await submit347ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        submittedBy: ctx.userId,
      });
      if (!result.ok) return { ok: false, error: result.error, message: result.message };
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        lineasClientes: result.result.lineasClientes.length,
        lineasProveedores: result.result.lineasProveedores.length,
        message: `Modelo 347 ${result.result.ejercicio} registrado como presentado. ${result.result.lineasClientes.length} clientes + ${result.result.lineasProveedores.length} proveedores.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_115_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return { ok: false, error: 'invalid_periodo', message: 'periodo inválido.' };
    }
    try {
      const { compute115ForTenant } = await import('./isaak-modelo-115-repo');
      const result = await compute115ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return { ok: true, skipped: true, reason: result.output.reason };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        periodo: r.periodo,
        arrendadores: r.arrendadores,
        basesRetenciones: r.basesRetenciones,
        importeRetenciones: r.importeRetenciones,
        resultado: r.resultado,
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 115 ${r.periodo} ${r.ejercicio} guardado. Retenciones: ${r.importeRetenciones.toFixed(2)}€.`
          : `Borrador 115 ${r.periodo} ${r.ejercicio} computado (no guardado). Retenciones: ${r.importeRetenciones.toFixed(2)}€.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_115') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    const periodo = String(args.periodo ?? '').toUpperCase();
    if (!['1T', '2T', '3T', '4T'].includes(periodo)) {
      return { ok: false, error: 'invalid_periodo', message: 'periodo inválido.' };
    }
    if (!ctx.userId) {
      return { ok: false, error: 'missing_user', message: 'Falta usuario identificado.' };
    }
    try {
      const { submit115ForTenant } = await import('./isaak-modelo-115-repo');
      const result = await submit115ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        periodo: periodo as '1T' | '2T' | '3T' | '4T',
        submittedBy: ctx.userId,
      });
      if (!result.ok) return { ok: false, error: result.error, message: result.message };
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        resultado: result.result.resultado,
        message: `Modelo 115 ${result.result.periodo} ${result.result.ejercicio} registrado. Retenciones a ingresar: ${result.result.resultado.toFixed(2)}€.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_180_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    try {
      const { compute180ForTenant } = await import('./isaak-modelo-180-repo');
      const result = await compute180ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return { ok: true, skipped: true, reason: result.output.reason };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        lineas: r.lineas,
        totalBase: r.totalBase,
        totalRetenciones: r.totalRetenciones,
        perceptores: r.perceptores,
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 180 ${r.ejercicio} guardado. ${r.perceptores} arrendadores, total retenciones ${r.totalRetenciones.toFixed(2)}€.`
          : `Borrador 180 ${r.ejercicio} computado (no guardado). ${r.perceptores} arrendadores.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_180') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    if (!ctx.userId) {
      return { ok: false, error: 'missing_user', message: 'Falta usuario identificado.' };
    }
    try {
      const { submit180ForTenant } = await import('./isaak-modelo-180-repo');
      const result = await submit180ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        submittedBy: ctx.userId,
      });
      if (!result.ok) return { ok: false, error: result.error, message: result.message };
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        perceptores: result.result.perceptores,
        totalRetenciones: result.result.totalRetenciones,
        message: `Modelo 180 ${result.result.ejercicio} registrado. ${result.result.perceptores} arrendadores.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_compute_190_draft') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    try {
      const { compute190ForTenant } = await import('./isaak-modelo-190-repo');
      const result = await compute190ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        persist: args.persist === true,
        createdBy: ctx.userId,
      });
      if (result.output.skipped) {
        return { ok: true, skipped: true, reason: result.output.reason };
      }
      const r = result.output.result;
      return {
        ok: true,
        skipped: false,
        ejercicio: r.ejercicio,
        lineas: r.lineas,
        totalBase: r.totalBase,
        totalRetenciones: r.totalRetenciones,
        perceptoresTrabajadores: r.perceptoresTrabajadores,
        perceptoresProfesionales: r.perceptoresProfesionales,
        advertencias: r.advertencias,
        taxReturnId: result.taxReturnId ?? null,
        persistedAsDraft: result.persistedAsDraft === true,
        message: result.persistedAsDraft
          ? `Borrador 190 ${r.ejercicio} guardado. ${r.perceptoresTrabajadores} trabajadores + ${r.perceptoresProfesionales} profesionales, total retenciones ${r.totalRetenciones.toFixed(2)}€.`
          : `Borrador 190 ${r.ejercicio} computado (no guardado).`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'compute_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_submit_190') {
    const ejercicio = typeof args.ejercicio === 'number' ? args.ejercicio : NaN;
    if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
      return { ok: false, error: 'invalid_ejercicio', message: 'ejercicio inválido.' };
    }
    if (!ctx.userId) {
      return { ok: false, error: 'missing_user', message: 'Falta usuario identificado.' };
    }
    try {
      const { submit190ForTenant } = await import('./isaak-modelo-190-repo');
      const result = await submit190ForTenant({
        tenantId: ctx.tenantId,
        ejercicio,
        submittedBy: ctx.userId,
      });
      if (!result.ok) return { ok: false, error: result.error, message: result.message };
      return {
        ok: true,
        submissionId: result.submissionId,
        taxReturnId: result.taxReturnId,
        payloadHash: result.payloadHash,
        perceptoresTrabajadores: result.result.perceptoresTrabajadores,
        perceptoresProfesionales: result.result.perceptoresProfesionales,
        totalRetenciones: result.result.totalRetenciones,
        message: `Modelo 190 ${result.result.ejercicio} registrado. ${result.result.perceptoresTrabajadores} trabajadores + ${result.result.perceptoresProfesionales} profesionales.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'submit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'inspector_search_aeat') {
    const query = String(args.query ?? '').trim();
    if (!query) {
      return {
        ok: false,
        error: 'invalid_query',
        message: 'query es obligatorio (pregunta o concepto fiscal).',
      };
    }
    const sourceTypes = Array.isArray(args.sourceTypes)
      ? (args.sourceTypes as AeatSourceType[])
      : undefined;
    const topK = typeof args.topK === 'number' ? args.topK : undefined;
    try {
      const { searchAeatCorpus } = await import('./aeat-corpus-search');
      const hits = await searchAeatCorpus({ query, sourceTypes, topK });
      if (hits.length === 0) {
        return {
          ok: true,
          count: 0,
          hits: [],
          message:
            'El corpus AEAT no contiene pasajes relevantes para tu consulta. Si la base aún no se ha ingestado, contacta con el admin del sistema.',
        };
      }
      return {
        ok: true,
        count: hits.length,
        hits: hits.map((h) => ({
          source: h.sourceId,
          articleRef: h.articleRef,
          title: h.title,
          url: h.sourceUrl,
          content: h.content,
          similarity: Number(h.similarity.toFixed(3)),
          ingestedAt: h.ingestedAt,
        })),
        message: `Encontrados ${hits.length} pasajes relevantes. Cita siempre la URL canónica y la referencia normativa (Art. X LIVA) en la respuesta.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'search_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'inspector_consult') {
    const query = String(args.query ?? '').trim();
    if (!query) {
      return {
        ok: false,
        error: 'invalid_query',
        message: 'query es obligatorio (pregunta fiscal en lenguaje natural).',
      };
    }
    const topK = typeof args.topK === 'number' ? args.topK : undefined;
    try {
      const { consultInspector } = await import('./inspector-capa-2');
      const result = await consultInspector({
        tenantId: ctx.tenantId,
        query,
        topK,
      });
      if (!result.ok) {
        return {
          ok: false,
          error: result.error,
          message: result.message,
        };
      }
      return {
        ok: true,
        answer: result.answer,
        citations: result.citations.map((c) => ({
          index: c.index,
          articleRef: c.articleRef,
          title: c.title,
          sourceUrl: c.sourceUrl,
          snippet: c.snippet,
        })),
        profile: result.profile,
        corpusHits: result.corpusHits,
        model: result.model,
        latencyMs: result.latencyMs,
        message: `Inspector Capa 2 respondió con ${result.citations.length} citas BOE. Modelo: ${result.model}.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'consult_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_ledger_get_balances') {
    const periodEnd = (args.periodEnd as string | null | undefined) ?? null;
    if (periodEnd && !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
      return {
        ok: false,
        error: 'invalid_period',
        message: 'periodEnd debe ser YYYY-MM-DD.',
      };
    }
    const onlyKind = args.onlyKind as string | null | undefined;
    try {
      const balances = await computeAccountBalances({
        tenantId: ctx.tenantId,
        periodEnd,
      });
      const filtered = onlyKind ? balances.filter((b) => b.kind === onlyKind) : balances;
      const aggregates = aggregateBalancesForAudit(balances);
      return {
        ok: true,
        count: filtered.length,
        periodEnd: periodEnd ?? null,
        aggregates,
        balances: filtered.map((b) => ({
          account: b.account,
          kind: b.kind,
          balance: b.balance,
          totalDebits: b.totalDebits,
          totalCredits: b.totalCredits,
        })),
        message:
          balances.length === 0
            ? 'No hay asientos con cuentas PGC informadas todavía. Los saldos aparecerán cuando crees asientos con accountDebit/accountCredit.'
            : `${balances.length} cuentas con movimiento. Caja: ${aggregates.cashBalance}€ · Socios: ${aggregates.partnersBalance}€ · Cuenta 555: ${aggregates.pendingAccountsBalance}€.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'balances_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_summarize_aeat_inbox') {
    const days = Math.max(1, Math.min(90, typeof args.days === 'number' ? args.days : 7));
    try {
      // Lazy import: el módulo carga @verifactu/utils (callLLM) y romperíamos
      // los unit tests del registry si lo importáramos arriba de forma
      // estática (babel-jest no procesa la sintaxis TS de session.ts).
      const { generateWeeklySummary } = await import('./aeat-weekly-summary');
      const result = await generateWeeklySummary({
        tenantId: ctx.tenantId,
        windowDays: days,
      });
      if (!result.generated) {
        return {
          ok: true,
          generated: false,
          notificationsConsidered: result.notificationsConsidered,
          censusChangesConsidered: result.censusChangesConsidered,
          message:
            result.notificationsConsidered === 0 && result.censusChangesConsidered === 0
              ? `No hay notificaciones AEAT ni cambios censales en los últimos ${days} días.`
              : 'Hay eventos pero no se ha podido generar el resumen IA. Revisa el buzón manualmente.',
        };
      }
      return {
        ok: true,
        generated: true,
        notificationsConsidered: result.notificationsConsidered,
        censusChangesConsidered: result.censusChangesConsidered,
        summary: result.summary,
        message: `Resumen IA generado (${result.notificationsConsidered} notificaciones, ${result.censusChangesConsidered} cambios censales).`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'summary_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_validate_vat_intracom') {
    const vatRaw = String(args.vatNumber ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    if (!/^[A-Z]{2}[A-Z0-9]{2,15}$/.test(vatRaw)) {
      return {
        ok: false,
        error: 'invalid_vat_format',
        message:
          'vatNumber debe empezar con prefijo país UE (2 letras) seguido del número (ej. DE123456789, ESB12345678).',
      };
    }
    try {
      // Para VIES europeo el adapter actual está optimizado para ES; para
      // otros países UE haríamos llamada equivalente. Aquí reusamos
      // checkVat que acepta cualquier vat con prefijo.
      const adapter = new ViesAdapter();
      const signal = await adapter.checkVat(vatRaw);
      if (!signal) {
        return {
          ok: false,
          error: 'vies_unreachable',
          message:
            'No se pudo contactar con VIES (puede estar caído temporalmente). Reintenta o consulta manualmente https://ec.europa.eu/taxation_customs/vies/.',
        };
      }
      return {
        ok: true,
        valid: signal.valid,
        vatNumber: signal.vatNumber,
        name: signal.name ?? null,
        address: signal.address ?? null,
        checkedAt: signal.checkedAt,
        message: signal.valid
          ? `VIES confirma que ${vatRaw} es válido${signal.name ? ` (titular: ${signal.name})` : ''}.`
          : `VIES indica que ${vatRaw} NO es válido. Si vas a emitir una factura intracomunitaria a este cliente, NO puedes acogerte a la exención del Art. 25 LIVA — repercute IVA español al 21%.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'vies_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_sync_aeat_sede') {
    try {
      const result = await syncAeatSedeForTenant(ctx.tenantId);
      return {
        ok: result.ok,
        notifications: result.notifications,
        census: result.census,
        errors: result.errors,
        message: result.ok
          ? `Sincronización OK: ${result.notifications.persisted} notificaciones nuevas, ${result.census.changesDetected} cambios censales.`
          : `Sincronización con errores: ${result.errors.join('; ')}`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'sync_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_list_aeat_notifications') {
    const estado = args.estado as string | undefined;
    const onlyUnacknowledged = args.onlyUnacknowledged === true;
    const limit = Math.max(1, Math.min(100, typeof args.limit === 'number' ? args.limit : 20));
    const where: {
      tenantId: string;
      estado?: string;
      acknowledgedAt?: null;
    } = { tenantId: ctx.tenantId };
    if (estado) where.estado = estado;
    if (onlyUnacknowledged) where.acknowledgedAt = null;
    try {
      const rows = await prisma.isaakAeatNotification.findMany({
        where,
        orderBy: { notificationDate: 'desc' },
        take: limit,
        select: {
          id: true,
          externalId: true,
          title: true,
          emisor: true,
          tipo: true,
          estado: true,
          notificationDate: true,
          acknowledgedAt: true,
          alertSent: true,
        },
      });
      return {
        ok: true,
        count: rows.length,
        notifications: rows.map((r) => ({
          id: r.id,
          externalId: r.externalId,
          title: r.title,
          emisor: r.emisor,
          tipo: r.tipo,
          estado: r.estado,
          notificationDate: r.notificationDate.toISOString(),
          acknowledged: r.acknowledgedAt !== null,
          alertSent: r.alertSent,
        })),
      };
    } catch (err) {
      return {
        ok: false,
        error: 'list_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_list_aeat_census_changes') {
    const days = Math.max(1, Math.min(365, typeof args.days === 'number' ? args.days : 90));
    const since = new Date(Date.now() - days * 86_400_000);
    try {
      const rows = await prisma.isaakAeatCensusChange.findMany({
        where: { tenantId: ctx.tenantId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          field: true,
          changeType: true,
          oldValue: true,
          newValue: true,
          createdAt: true,
        },
      });
      return {
        ok: true,
        count: rows.length,
        windowDays: days,
        changes: rows.map((r) => ({
          field: r.field,
          changeType: r.changeType,
          oldValue: r.oldValue,
          newValue: r.newValue,
          detectedAt: r.createdAt.toISOString(),
        })),
      };
    } catch (err) {
      return {
        ok: false,
        error: 'list_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_audit_ledger') {
    const periodFrom = String(args.periodFrom ?? '');
    const periodTo = String(args.periodTo ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) {
      return {
        ok: false,
        error: 'invalid_period',
        message: 'periodFrom y periodTo deben ser YYYY-MM-DD',
      };
    }
    if (periodTo < periodFrom) {
      return {
        ok: false,
        error: 'invalid_period',
        message: 'periodTo no puede ser anterior a periodFrom',
      };
    }
    const scope =
      (args.scope as
        | 'monthly_close'
        | 'quarterly_close'
        | 'annual_close'
        | 'on_demand'
        | undefined) ?? 'on_demand';
    try {
      const { snapshot, profile } = await loadAuditInputsForTenant({
        tenantId: ctx.tenantId,
        periodFrom,
        periodTo,
      });
      const report = runAudit({ scope, snapshot, profile });
      // Resumen compacto para que el LLM no tenga que parsear estructuras grandes.
      const summary = {
        period: { from: periodFrom, to: periodTo },
        passed: report.passed,
        counts: {
          errors: report.errors.length,
          warnings: report.warnings.length,
          infos: report.infos.length,
        },
        ledgerHighlights: {
          vatRepercutido: snapshot.vatRepercutidoTotal,
          vatSoportado: snapshot.vatSoportadoTotal,
          retentionsProfessionals: snapshot.retentionsToProfessionals,
          retentionsLandlords: snapshot.retentionsToLandlords,
          retentionsEmployees: snapshot.retentionsToEmployees,
          intracomOps: snapshot.intracomOperationsCount,
          presentedModels: snapshot.presentedModels.map((m) => m.model),
          cashBalance: snapshot.cashBalance,
          banksWithoutReconciliation: snapshot.bankAccounts.filter((a) => !a.lastReconciliationDate)
            .length,
        },
      };
      return {
        ok: true,
        summary,
        // Lista completa de violaciones para que el LLM pueda enumerar
        // citas concretas al usuario.
        errors: report.errors,
        warnings: report.warnings,
        infos: report.infos,
        skippedByScope: report.skippedByScope,
        message: report.passed
          ? `Auditoría OK (${report.warnings.length} avisos, ${report.infos.length} notas).`
          : `Auditoría con ${report.errors.length} ERRORES. Resúmelos al usuario con citas y propón qué corregir primero.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'audit_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_generate_visual_report') {
    const reportType = args.reportType as VisualReportType;
    if (!VISUAL_REPORT_TYPES.includes(reportType)) {
      return {
        ok: false,
        error: 'invalid_report_type',
        message: `reportType no soportado. Usa uno de: ${VISUAL_REPORT_TYPES.join(', ')}.`,
      };
    }
    const from = String(args.from ?? '');
    const to = String(args.to ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return { ok: false, error: 'invalid_period', message: 'from/to deben ser YYYY-MM-DD.' };
    }
    if (to < from) {
      return { ok: false, error: 'invalid_period', message: 'to no puede ser anterior a from.' };
    }
    const title = typeof args.title === 'string' ? args.title : undefined;
    try {
      const artifact = await buildVisualReportData(ctx.tenantId, reportType, from, to, title);
      return {
        ok: true,
        artifact,
        message: `Informe visual "${artifact.title}" generado. La UI lo muestra en el panel lateral.`,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'visual_report_failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'isaak_export_pdf') {
    const reportType = args.reportType as ReportType;
    if (!REPORT_TYPES.includes(reportType)) {
      return {
        ok: false,
        error: 'invalid_report_type',
        message: `Tipo no soportado. Usa uno de: ${REPORT_TYPES.join(', ')}.`,
      };
    }
    const from = String(args.from ?? '');
    const to = String(args.to ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return { ok: false, error: 'invalid_period', message: 'from/to deben ser YYYY-MM-DD.' };
    }
    if (to < from) {
      return { ok: false, error: 'invalid_period', message: 'to no puede ser anterior a from.' };
    }
    const label = typeof args.label === 'string' ? args.label : undefined;
    const params = new URLSearchParams({ reportType, from, to });
    if (label) params.set('label', label);
    const downloadUrl = `/api/isaak/export/pdf?${params.toString()}`;
    const period = { from, to, label };
    const filename = reportFilename(reportType, period).replace('.xlsx', '.pdf');
    return {
      ok: true,
      reportType,
      period,
      filename,
      downloadUrl,
      artifact: makeDownloadArtifact({ type: 'pdf', title: filename, downloadUrl, filename }),
      message: `PDF "${filename}" listo. Indica al usuario que pulse el enlace de descarga.`,
    };
  }

  if (name === 'isaak_export_word') {
    const reportType = args.reportType as ReportType;
    if (!REPORT_TYPES.includes(reportType)) {
      return {
        ok: false,
        error: 'invalid_report_type',
        message: `Tipo no soportado. Usa uno de: ${REPORT_TYPES.join(', ')}.`,
      };
    }
    const from = String(args.from ?? '');
    const to = String(args.to ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return { ok: false, error: 'invalid_period', message: 'from/to deben ser YYYY-MM-DD.' };
    }
    if (to < from) {
      return { ok: false, error: 'invalid_period', message: 'to no puede ser anterior a from.' };
    }
    const label = typeof args.label === 'string' ? args.label : undefined;
    const params = new URLSearchParams({ reportType, from, to });
    if (label) params.set('label', label);
    const downloadUrl = `/api/isaak/export/word?${params.toString()}`;
    const period = { from, to, label };
    const filename = reportFilename(reportType, period).replace('.xlsx', '.docx');
    return {
      ok: true,
      reportType,
      period,
      filename,
      downloadUrl,
      artifact: makeDownloadArtifact({ type: 'word', title: filename, downloadUrl, filename }),
      message: `Word "${filename}" listo. Indica al usuario que pulse el enlace de descarga.`,
    };
  }

  return { ok: false, error: 'unknown_tool', message: `Tool desconocida: ${name}` };
}
