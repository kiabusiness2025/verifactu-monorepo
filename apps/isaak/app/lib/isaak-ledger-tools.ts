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
import {
  HOLDED_DOC_TYPES,
  type HoldedDocType,
} from './isaak-ledger-holded-mapper';
import { buildAuditSnapshotForTenant } from './isaak-audit-loader';
import { runAudit } from './inspector-aeat-audit';
import { REPORT_TYPES, reportFilename, type ReportType } from './isaak-excel-export';

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
        counterpartyNif: { type: ['string', 'null'], description: 'NIF/CIF del tercero (opcional).' },
        counterpartyName: { type: ['string', 'null'], description: 'Nombre del tercero (opcional).' },
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
          description: 'Fecha desde (YYYY-MM-DD). Si se omite, Holded usa su rango por defecto (~6 meses atrás).',
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
        accountDebit: null,
        accountCredit: null,
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
        message: 'Holded no está conectado en este tenant. Pide al usuario que conecte Holded antes.',
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
      message: `Excel "${filename}" listo. Indica al usuario que pulse el enlace de descarga; el documento es solo lectura excepto la columna de notas.`,
    };
  }

  if (name === 'isaak_audit_ledger') {
    const periodFrom = String(args.periodFrom ?? '');
    const periodTo = String(args.periodTo ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) {
      return { ok: false, error: 'invalid_period', message: 'periodFrom y periodTo deben ser YYYY-MM-DD' };
    }
    if (periodTo < periodFrom) {
      return { ok: false, error: 'invalid_period', message: 'periodTo no puede ser anterior a periodFrom' };
    }
    const scope = (args.scope as 'monthly_close' | 'quarterly_close' | 'annual_close' | 'on_demand' | undefined) ?? 'on_demand';
    try {
      const snapshot = await buildAuditSnapshotForTenant({
        tenantId: ctx.tenantId,
        periodFrom,
        periodTo,
      });
      const report = runAudit({ scope, snapshot });
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
          banksWithoutReconciliation: snapshot.bankAccounts.filter(
            (a) => !a.lastReconciliationDate,
          ).length,
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

  return { ok: false, error: 'unknown_tool', message: `Tool desconocida: ${name}` };
}
