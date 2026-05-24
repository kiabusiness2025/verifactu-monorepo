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
  holdedCreateInvoice,
  holdedRegisterPayment,
  holdedCreateContact,
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
    name: 'holded_create_invoice',
    description:
      'Crea una factura de venta en Holded. IMPORTANTE: antes de ejecutar, muestra al usuario el resumen (cliente, líneas, importe total con IVA) y espera su confirmación explícita. Si no sabes el contactId, usa holded_list_contacts primero para buscarlo.',
    input_schema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'ID del cliente en Holded (obtenerlo con holded_list_contacts si no se conoce).',
        },
        items: {
          type: 'array',
          description: 'Líneas de la factura.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Descripción del concepto.' },
              units: { type: 'number', description: 'Cantidad.' },
              subtotal: { type: 'number', description: 'Precio unitario sin impuestos (€).' },
              tax: { type: 'number', description: 'IVA en % (default 21). Usar 0 si exento.' },
            },
            required: ['name', 'units', 'subtotal'],
          },
        },
        date: {
          type: 'string',
          description: 'Fecha de la factura YYYY-MM-DD. Por defecto: hoy.',
        },
        notes: { type: 'string', description: 'Notas o comentarios adicionales.' },
        currency: { type: 'string', description: 'Código de moneda ISO (default EUR).' },
        confirmed: {
          type: 'boolean',
          description:
            'Debe ser true. Solo llama con confirmed=true cuando el usuario haya confirmado explícitamente los datos.',
        },
      },
      required: ['contactId', 'items', 'confirmed'],
    },
  },
  {
    name: 'holded_register_payment',
    description:
      'Registra el cobro de una factura en Holded (la marca como pagada total o parcialmente). IMPORTANTE: confirma con el usuario el importe y la fecha antes de ejecutar.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'ID de la factura en Holded (obtenerlo con holded_list_documents).',
        },
        amount: {
          type: 'number',
          description: 'Importe del cobro en €. Normalmente el total de la factura.',
        },
        date: {
          type: 'string',
          description: 'Fecha de cobro YYYY-MM-DD. Por defecto: hoy.',
        },
        docType: {
          type: 'string',
          enum: ['invoice', 'salesreceipt', 'purchase'],
          description: 'Tipo de documento (default invoice).',
        },
        accountId: {
          type: 'string',
          description:
            'ID de la cuenta de tesorería donde se registra el cobro (opcional). Usar holded_list_treasury_accounts para obtener IDs.',
        },
        confirmed: {
          type: 'boolean',
          description:
            'Debe ser true. Solo llama con confirmed=true cuando el usuario haya confirmado.',
        },
      },
      required: ['documentId', 'amount', 'confirmed'],
    },
  },
  {
    name: 'holded_create_contact',
    description:
      'Crea un nuevo contacto (cliente o proveedor) en Holded. IMPORTANTE: muestra al usuario los datos a crear y espera confirmación antes de ejecutar.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del contacto o razón social.' },
        email: { type: 'string', description: 'Email de contacto (opcional).' },
        phone: { type: 'string', description: 'Teléfono (opcional).' },
        nif: { type: 'string', description: 'NIF / CIF / NIE del contacto (opcional).' },
        type: {
          type: 'string',
          enum: ['client', 'supplier', 'both'],
          description: 'Tipo de contacto: client=cliente, supplier=proveedor, both=ambos. Default: client.',
        },
        address: { type: 'string', description: 'Dirección postal (opcional).' },
        city: { type: 'string', description: 'Ciudad (opcional).' },
        postalCode: { type: 'string', description: 'Código postal (opcional).' },
        country: { type: 'string', description: 'País ISO 2 letras (default ES).' },
        confirmed: {
          type: 'boolean',
          description:
            'Debe ser true. Solo llama con confirmed=true cuando el usuario haya confirmado los datos.',
        },
      },
      required: ['name', 'confirmed'],
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

      case 'holded_create_invoice': {
        if (!input.confirmed) {
          return {
            error: 'confirmation_required',
            message:
              'Esta acción requiere confirmación explícita. Muestra al usuario el resumen de la factura (cliente, líneas, total con IVA) y espera que confirme antes de proceder.',
          };
        }
        const contactId = String(input.contactId ?? '');
        if (!contactId) {
          return { error: 'invalid_input', message: 'Se requiere contactId. Usa holded_list_contacts para obtenerlo.' };
        }
        const rawItems = Array.isArray(input.items) ? input.items : [];
        if (rawItems.length === 0) {
          return { error: 'invalid_input', message: 'Se requiere al menos una línea de factura.' };
        }
        const items = rawItems.map((item) => {
          const i = item as Record<string, unknown>;
          return {
            name: String(i.name ?? ''),
            units: typeof i.units === 'number' ? i.units : 1,
            subtotal: typeof i.subtotal === 'number' ? i.subtotal : 0,
            tax: typeof i.tax === 'number' ? i.tax : 21,
          };
        });
        const dateUnix = input.date
          ? Math.floor(new Date(String(input.date)).getTime() / 1000)
          : Math.floor(Date.now() / 1000);
        const result = await holdedCreateInvoice(apiKey, {
          contactId,
          date: dateUnix,
          notes: typeof input.notes === 'string' ? input.notes : undefined,
          currency: typeof input.currency === 'string' ? input.currency : 'EUR',
          items,
        });
        return {
          success: true,
          id: result.id,
          docNumber: result.docNumber,
          message: `Factura ${result.docNumber ?? result.id} creada correctamente en Holded.`,
        };
      }

      case 'holded_register_payment': {
        if (!input.confirmed) {
          return {
            error: 'confirmation_required',
            message:
              'Esta acción requiere confirmación explícita. Muestra al usuario el importe, la factura y la fecha de cobro, y espera que confirme.',
          };
        }
        const documentId = String(input.documentId ?? '');
        if (!documentId) {
          return { error: 'invalid_input', message: 'Se requiere documentId.' };
        }
        const amount = typeof input.amount === 'number' ? input.amount : 0;
        if (amount <= 0) {
          return { error: 'invalid_input', message: 'El importe debe ser mayor que 0.' };
        }
        const dateUnix = input.date
          ? Math.floor(new Date(String(input.date)).getTime() / 1000)
          : Math.floor(Date.now() / 1000);
        const result = await holdedRegisterPayment(apiKey, {
          documentId,
          docType: typeof input.docType === 'string' ? input.docType : 'invoice',
          date: dateUnix,
          amount,
          accountId: typeof input.accountId === 'string' ? input.accountId : undefined,
        });
        return {
          success: result.success,
          message: `Cobro de ${amount} € registrado correctamente en la factura ${documentId}.`,
        };
      }

      case 'holded_create_contact': {
        if (!input.confirmed) {
          return {
            error: 'confirmation_required',
            message:
              'Esta acción requiere confirmación explícita. Muestra al usuario los datos del contacto a crear y espera que confirme.',
          };
        }
        const name = String(input.name ?? '').trim();
        if (!name) {
          return { error: 'invalid_input', message: 'Se requiere el nombre del contacto.' };
        }
        const typeVal = typeof input.type === 'string' && ['client', 'supplier', 'both'].includes(input.type)
          ? (input.type as 'client' | 'supplier' | 'both')
          : 'client';
        const result = await holdedCreateContact(apiKey, {
          name,
          email: typeof input.email === 'string' ? input.email : undefined,
          phone: typeof input.phone === 'string' ? input.phone : undefined,
          nif: typeof input.nif === 'string' ? input.nif : undefined,
          type: typeVal,
          address: typeof input.address === 'string' ? input.address : undefined,
          city: typeof input.city === 'string' ? input.city : undefined,
          postalCode: typeof input.postalCode === 'string' ? input.postalCode : undefined,
          country: typeof input.country === 'string' ? input.country : 'ES',
        });
        return {
          success: true,
          id: result.id,
          message: `Contacto "${name}" creado correctamente en Holded con ID ${result.id}.`,
        };
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
