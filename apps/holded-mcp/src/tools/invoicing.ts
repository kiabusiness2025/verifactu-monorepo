import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';

const DOC_TYPES = [
  'invoice',
  'salesorder',
  'proforma',
  'waybill',
  'quote',
  'purchase',
  'purchaseorder',
  'purchaserefund',
  'refund',
] as const;

export function registerInvoicingTools(server: McpServer, getClient: () => HoldedClient) {
  // ── Listar documentos ────────────────────────────────────────────────────
  server.tool(
    'list_documents',
    'Lista documentos de Holded (facturas, presupuestos, pedidos, albaranes). ' +
      'Permite filtrar por tipo, estado, fecha y contacto. ' +
      'Devuelve número, contacto, importe, estado e IVA de cada documento.',
    {
      docType: z
        .enum(DOC_TYPES)
        .describe(
          'Tipo de documento: invoice=factura emitida, salesorder=pedido, ' +
            'proforma=proforma, waybill=albarán, quote=presupuesto, ' +
            'purchase=factura recibida, refund=factura rectificativa'
        ),
      page: z.string().optional().describe('Página de resultados (paginación)'),
      starttmp: z.string().optional().describe('Fecha inicio Unix timestamp'),
      endtmp: z.string().optional().describe('Fecha fin Unix timestamp'),
      contactId: z.string().optional().describe('Filtrar por ID de contacto'),
    },
    { readOnlyHint: true },
    async ({ docType, ...params }) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      ) as Record<string, string>;
      const data = await getClient().listDocuments(docType, filtered);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── Obtener documento ────────────────────────────────────────────────────
  server.tool(
    'get_document',
    'Obtiene el detalle completo de un documento específico de Holded: ' +
      'líneas, impuestos, datos de contacto, fecha de vencimiento, historial de pagos.',
    {
      docType: z.enum(DOC_TYPES).describe('Tipo de documento'),
      documentId: z.string().describe('ID del documento'),
    },
    { readOnlyHint: true },
    async ({ docType, documentId }) => {
      const data = await getClient().getDocument(docType, documentId);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── Crear borrador de factura ─────────────────────────────────────────────
  server.tool(
    'create_invoice_draft',
    'Crea un borrador de factura en Holded. ' +
      'IMPORTANTE: Esto solo crea un borrador — NO se envía ni cobra. ' +
      'El usuario debe revisar y confirmar en Holded antes de cualquier acción. ' +
      'Usar solo cuando el usuario lo solicite explícitamente.',
    {
      contactId: z.string().describe('ID del contacto/cliente en Holded'),
      date: z.number().describe('Fecha de la factura en Unix timestamp'),
      dueDate: z.number().optional().describe('Fecha de vencimiento Unix timestamp'),
      notes: z.string().optional().describe('Notas o descripción de la factura'),
      items: z
        .array(
          z.object({
            productId: z.string().optional().describe('ID del producto (si existe en catálogo)'),
            name: z.string().describe('Nombre del producto o servicio'),
            units: z.number().describe('Cantidad'),
            subtotal: z.number().describe('Precio unitario sin IVA'),
            tax: z.number().optional().describe('% de IVA (ej: 21)'),
          })
        )
        .describe('Líneas de la factura'),
    },
    { destructiveHint: false, readOnlyHint: false },
    async (params) => {
      const data = await getClient().createDocument('invoice', params);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Borrador creado correctamente.\n\n${JSON.stringify(data, null, 2)}\n\n⚠️ Recuerda revisar y confirmar el borrador en Holded antes de enviarlo.`,
          },
        ],
      };
    }
  );
}
