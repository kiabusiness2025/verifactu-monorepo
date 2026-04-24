import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';
import { CREATE_INVOICE_DRAFT_ANNOTATIONS, READ_ONLY_TOOL_ANNOTATIONS } from './policy.js';

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
  server.tool(
    'list_documents',
    'Lists Holded documents such as invoices, quotes, sales orders and waybills. Returns read-only document data and supports safe filtering by type, date and contact.',
    {
      docType: z
        .enum(DOC_TYPES)
        .describe(
          'Document type. Examples: invoice, quote, salesorder, waybill, purchase, refund.'
        ),
      page: z.string().optional().describe('Results page number.'),
      starttmp: z.string().optional().describe('Start date as Unix timestamp.'),
      endtmp: z.string().optional().describe('End date as Unix timestamp.'),
      contactId: z.string().optional().describe('Optional Holded contact ID filter.'),
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    async ({ docType, ...params }) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
      ) as Record<string, string>;

      const data = await getClient().listDocuments(docType, filtered);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.tool(
    'get_document',
    'Gets the full details of a specific Holded document, including lines, taxes and related contact information. Read-only.',
    {
      docType: z.enum(DOC_TYPES).describe('Document type.'),
      documentId: z.string().describe('Holded document ID.'),
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    async ({ docType, documentId }) => {
      const data = await getClient().getDocument(docType, documentId);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.tool(
    'create_invoice_draft',
    'Creates a draft invoice only in Holded. It does not issue, send, pay, delete, finalize, or destructively modify invoices. The user should review the draft in Holded before taking any further action.',
    {
      contactId: z.string().describe('Holded customer or contact ID.'),
      date: z.number().describe('Invoice date as Unix timestamp.'),
      dueDate: z.number().optional().describe('Optional due date as Unix timestamp.'),
      notes: z.string().optional().describe('Optional invoice notes.'),
      items: z
        .array(
          z.object({
            productId: z.string().optional().describe('Optional existing Holded product ID.'),
            name: z.string().describe('Line item name.'),
            units: z.number().describe('Quantity.'),
            subtotal: z.number().describe('Unit price before tax.'),
            tax: z.number().optional().describe('VAT percentage, for example 21.'),
          })
        )
        .describe('Invoice draft line items.'),
    },
    CREATE_INVOICE_DRAFT_ANNOTATIONS,
    async (params) => {
      const data = await getClient().createDocument('invoice', params);
      return {
        content: [
          {
            type: 'text',
            text:
              'Draft invoice created successfully.\n\n' +
              `${JSON.stringify(data, null, 2)}\n\n` +
              'Review the draft in Holded before issuing or sending it.',
          },
        ],
      };
    }
  );
}
