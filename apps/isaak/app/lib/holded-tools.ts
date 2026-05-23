import {
  holdedGetChartOfAccounts,
  holdedGetContact,
  holdedGetDocument,
  holdedGetJournal,
  holdedGetPnL,
  holdedGetVerifactuStatus,
  holdedListContacts,
  holdedListDocuments,
  holdedListEmployees,
  holdedListPayments,
  holdedListProducts,
  holdedListProjects,
  holdedListTreasuryAccounts,
  holdedSendDocument,
} from './holded-api';

// Anthropic tool definitions for Isaak chat — 14 tools (10 lectura + 4 nuevas)
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
  {
    name: 'holded_get_verifactu_status',
    description:
      'Consulta el estado Verifactu de una factura de venta concreta: si tiene UUID registrado en la AEAT, el QR y la huella (hash). Úsalo cuando el usuario pregunte si una factura específica está registrada en Verifactu o si cumple con el RD 1007/2023.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'ID de la factura en Holded.',
        },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'holded_get_pnl',
    description:
      'Calcula el P&L contable del año (o rango indicado) desde el libro diario de Holded, agregando cuentas PGC 7xx (ingresos) y 6xx (gastos). Más fiable que el escaneo de documentos porque incluye asientos manuales. Úsalo cuando el usuario pregunte por beneficio, margen, resultado contable o PyG.',
    input_schema: {
      type: 'object',
      properties: {
        year: {
          type: 'number',
          description: 'Año a consultar. Por defecto el año actual.',
        },
        starttmp: {
          type: 'string',
          description: 'Fecha inicio ISO 8601 o Unix (alternativa a year).',
        },
        endtmp: {
          type: 'string',
          description: 'Fecha fin ISO 8601 o Unix (alternativa a year).',
        },
      },
    },
  },
  {
    name: 'holded_list_payments',
    description:
      'Lista los pagos registrados en Holded (cobros y pagos). Úsalo para responder preguntas sobre flujo de caja, historial de cobros o pagos pendientes.',
    input_schema: {
      type: 'object',
      properties: {
        starttmp: {
          type: 'string',
          description: 'Fecha inicio ISO 8601 o Unix. Por defecto: últimos 90 días.',
        },
        endtmp: {
          type: 'string',
          description: 'Fecha fin ISO 8601 o Unix. Por defecto: hoy.',
        },
        limit: {
          type: 'number',
          description: 'Máximo de pagos a devolver (default 50).',
        },
      },
    },
  },
  {
    name: 'holded_send_document',
    description:
      'Envía un documento de Holded (factura, presupuesto, etc.) por email al destinatario indicado. IMPORTANTE: antes de ejecutar esta acción, confirma siempre con el usuario los datos (destinatario, documento) y espera su aprobación explícita.',
    input_schema: {
      type: 'object',
      properties: {
        docType: {
          type: 'string',
          enum: ['invoice', 'salesreceipt', 'creditnote', 'estimate', 'proforma', 'purchase'],
          description: 'Tipo de documento.',
        },
        documentId: {
          type: 'string',
          description: 'ID del documento en Holded.',
        },
        emails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de emails destinatarios.',
        },
        subject: {
          type: 'string',
          description: 'Asunto del email (opcional).',
        },
        body: {
          type: 'string',
          description: 'Cuerpo del email (opcional).',
        },
        confirmed: {
          type: 'boolean',
          description:
            'Debe ser true. Solo llama a esta herramienta cuando el usuario haya confirmado explícitamente el envío.',
        },
      },
      required: ['docType', 'documentId', 'emails', 'confirmed'],
    },
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
      case 'holded_get_verifactu_status':
        return await holdedGetVerifactuStatus(apiKey, String(input.invoiceId ?? ''));
      case 'holded_get_pnl':
        return await holdedGetPnL(apiKey, {
          year: typeof input.year === 'number' ? input.year : undefined,
          starttmp: input.starttmp ? String(input.starttmp) : undefined,
          endtmp: input.endtmp ? String(input.endtmp) : undefined,
        });
      case 'holded_list_payments':
        return await holdedListPayments(apiKey, {
          starttmp: input.starttmp ? String(input.starttmp) : undefined,
          endtmp: input.endtmp ? String(input.endtmp) : undefined,
          limit: typeof input.limit === 'number' ? Math.min(input.limit, 100) : 50,
        });
      case 'holded_send_document': {
        if (!input.confirmed) {
          return {
            error: 'confirmation_required',
            message:
              'Esta acción requiere confirmación explícita del usuario. Muestra el resumen del envío y pide que confirme antes de proceder.',
          };
        }
        const emails = Array.isArray(input.emails)
          ? (input.emails as unknown[]).filter((e): e is string => typeof e === 'string')
          : [];
        if (emails.length === 0) {
          return { error: 'invalid_input', message: 'Se requiere al menos un email destinatario.' };
        }
        return await holdedSendDocument(apiKey, String(input.docType ?? 'invoice'), String(input.documentId ?? ''), {
          emails,
          subject: typeof input.subject === 'string' ? input.subject : undefined,
          body: typeof input.body === 'string' ? input.body : undefined,
        });
      }
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
