import {
  holdedGetChartOfAccounts,
  holdedGetContact,
  holdedGetDocument,
  holdedGetJournal,
  holdedListContacts,
  holdedListDocuments,
  holdedListEmployees,
  holdedListProducts,
  holdedListProjects,
  holdedListTreasuryAccounts,
} from './holded-api';

// Anthropic tool definitions for Isaak chat — 10 read tools
export const HOLDED_CHAT_TOOLS = [
  {
    name: 'holded_list_documents',
    description:
      'Lista documentos de Holded (facturas, compras, presupuestos, albaranes, etc.). Úsalo para responder preguntas sobre ventas, gastos, cobros pendientes o historial de facturación.',
    input_schema: {
      type: 'object',
      properties: {
        docType: {
          type: 'string',
          enum: ['invoice', 'salesreceipt', 'creditnote', 'estimate', 'purchase', 'purchaseorder'],
          description:
            'Tipo de documento. invoice=factura de venta, purchase=factura de compra, estimate=presupuesto, creditnote=abono.',
        },
        starttmp: {
          type: 'string',
          description: 'Fecha inicio ISO 8601 o Unix. Por defecto: 1 enero del año anterior.',
        },
        endtmp: { type: 'string', description: 'Fecha fin ISO 8601 o Unix. Por defecto: hoy.' },
        contactId: { type: 'string', description: 'Filtrar por ID de contacto (opcional).' },
        limit: {
          type: 'number',
          description: 'Máximo de documentos a devolver (default 50, max 100).',
        },
      },
      required: ['docType'],
    },
  },
  {
    name: 'holded_get_document',
    description:
      'Devuelve el detalle completo de un documento específico de Holded (líneas, impuestos, contacto).',
    input_schema: {
      type: 'object',
      properties: {
        docType: {
          type: 'string',
          enum: [
            'invoice',
            'salesreceipt',
            'creditnote',
            'estimate',
            'purchase',
            'purchaseorder',
            'purchaserefund',
          ],
        },
        documentId: { type: 'string', description: 'ID del documento en Holded.' },
      },
      required: ['docType', 'documentId'],
    },
  },
  {
    name: 'holded_list_contacts',
    description: 'Lista clientes, proveedores u otros contactos de Holded.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['client', 'supplier', 'debtor', 'creditor'],
          description: 'Filtrar por tipo de contacto (opcional).',
        },
        limit: { type: 'number', description: 'Máximo de contactos (default 50).' },
      },
    },
  },
  {
    name: 'holded_get_contact',
    description: 'Devuelve el detalle de un contacto específico de Holded.',
    input_schema: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'ID del contacto en Holded.' },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'holded_get_chart_of_accounts',
    description: 'Devuelve el plan contable completo de la empresa en Holded.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'holded_get_journal',
    description: 'Devuelve asientos contables del libro diario de Holded en un rango de fechas.',
    input_schema: {
      type: 'object',
      properties: {
        starttmp: { type: 'string', description: 'Fecha inicio ISO 8601 o Unix.' },
        endtmp: { type: 'string', description: 'Fecha fin ISO 8601 o Unix.' },
      },
    },
  },
  {
    name: 'holded_list_treasury_accounts',
    description: 'Lista las cuentas de tesorería (bancos) y sus saldos en Holded.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'holded_list_products',
    description: 'Lista el catálogo de productos y servicios de la empresa en Holded.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Máximo de productos (default 50).' },
      },
    },
  },
  {
    name: 'holded_list_projects',
    description: 'Lista los proyectos activos e inactivos de la empresa en Holded.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'holded_list_employees',
    description: 'Lista los empleados del equipo en Holded.',
    input_schema: { type: 'object', properties: {} },
  },
] as const;

export type HoldedToolName = (typeof HOLDED_CHAT_TOOLS)[number]['name'];

type ToolInput = Record<string, unknown>;

export async function executeHoldedTool(
  apiKey: string,
  toolName: HoldedToolName,
  input: ToolInput
): Promise<unknown> {
  try {
    switch (toolName) {
      case 'holded_list_documents':
        return await holdedListDocuments(apiKey, {
          docType: String(input.docType ?? 'invoice'),
          starttmp: input.starttmp ? String(input.starttmp) : undefined,
          endtmp: input.endtmp ? String(input.endtmp) : undefined,
          contactId: input.contactId ? String(input.contactId) : undefined,
          limit: typeof input.limit === 'number' ? Math.min(input.limit, 100) : 50,
        });
      case 'holded_get_document':
        return await holdedGetDocument(
          apiKey,
          String(input.docType ?? 'invoice'),
          String(input.documentId ?? '')
        );
      case 'holded_list_contacts':
        return await holdedListContacts(apiKey, {
          type: input.type ? String(input.type) : undefined,
          limit: typeof input.limit === 'number' ? input.limit : 50,
        });
      case 'holded_get_contact':
        return await holdedGetContact(apiKey, String(input.contactId ?? ''));
      case 'holded_get_chart_of_accounts':
        return await holdedGetChartOfAccounts(apiKey);
      case 'holded_get_journal':
        return await holdedGetJournal(apiKey, {
          starttmp: input.starttmp ? String(input.starttmp) : undefined,
          endtmp: input.endtmp ? String(input.endtmp) : undefined,
        });
      case 'holded_list_treasury_accounts':
        return await holdedListTreasuryAccounts(apiKey);
      case 'holded_list_products':
        return await holdedListProducts(apiKey, {
          limit: typeof input.limit === 'number' ? input.limit : 50,
        });
      case 'holded_list_projects':
        return await holdedListProjects(apiKey);
      case 'holded_list_employees':
        return await holdedListEmployees(apiKey);
      default:
        return { error: 'unknown_tool' };
    }
  } catch (err) {
    return {
      error: 'tool_execution_failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
