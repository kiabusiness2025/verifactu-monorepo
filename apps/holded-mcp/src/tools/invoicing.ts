import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient, HOLDED_DOC_TYPES } from '../holded-client.js';
import { toUnixSecondsNumber, toUnixSecondsString } from '../utils.js';
import { readOnlyAnnotations, writeAnnotations } from './policy.js';

const DOC_TYPES = HOLDED_DOC_TYPES;

const dateInput = z
  .union([z.string(), z.number()])
  .describe('Date as ISO 8601 (recommended) or Unix timestamp in seconds.');

export function registerInvoicingTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_documents',
    'Returns Holded documents (invoices, sales receipts, credit notes, sales orders, proformas, waybills, estimates, purchases, purchase orders, purchase refunds) filtered by type, date range and contact. Read-only. Paginated — use page and limit to control response size.',
    {
      docType: z
        .enum(DOC_TYPES)
        .describe(
          'Document type. One of: invoice, salesreceipt, creditnote, salesorder, proform, waybill, estimate, purchase, purchaseorder, purchaserefund.'
        ),
      page: z.string().optional().describe('Results page number (default 1).'),
      starttmp: dateInput.optional().describe('Start date (ISO 8601 or Unix seconds).'),
      endtmp: dateInput.optional().describe('End date (ISO 8601 or Unix seconds).'),
      contactId: z.string().optional().describe('Optional Holded contact ID filter.'),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25)
        .describe(
          'Max documents returned in this call (default 25, max 100). Use page=2 for the next batch.'
        ),
    },
    readOnlyAnnotations('list_documents'),
    async ({ docType, starttmp, endtmp, limit, ...rest }) => {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) params[k] = String(v);
      }
      if (starttmp !== undefined) params.starttmp = toUnixSecondsString(starttmp);
      if (endtmp !== undefined) params.endtmp = toUnixSecondsString(endtmp);

      const raw = await getClient().listDocuments(docType, params);
      const all = Array.isArray(raw) ? raw : [];
      const truncated = all.length > limit;
      const documents = all.slice(0, limit);
      const payload: Record<string, unknown> = {
        docType,
        documents,
        count: documents.length,
        totalReceived: all.length,
        truncated,
      };
      if (truncated) {
        payload.hint = `Showing first ${limit} of ${all.length} documents received from Holded. Use page=2 (or higher) for the next batch, or narrow with starttmp/endtmp/contactId.`;
      }
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.tool(
    'get_document',
    'Returns the full details of a specific Holded document, including line items, taxes and contact information. Read-only.',
    {
      docType: z.enum(DOC_TYPES).describe('Document type.'),
      documentId: z.string().describe('Holded document ID.'),
    },
    readOnlyAnnotations('get_document'),
    async ({ docType, documentId }) => {
      const data = await getClient().getDocument(docType, documentId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_document_pdf',
    'Returns the PDF rendering of a specific Holded document, encoded as a base64 string. Read-only.',
    {
      docType: z.enum(DOC_TYPES).describe('Document type.'),
      documentId: z.string().describe('Holded document ID.'),
    },
    readOnlyAnnotations('get_document_pdf'),
    async ({ docType, documentId }) => {
      const buf = await getClient().getDocumentPdf(docType, documentId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                docType,
                documentId,
                contentType: 'application/pdf',
                base64: buf.toString('base64'),
                bytes: buf.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'create_invoice_draft',
    'Creates a Holded invoice in draft state. The server forces approveDoc=false at the wire level, so the document is never auto-issued, sent, paid, deleted or otherwise modified destructively. The created draft must be approved manually in Holded UI before it has any legal effect.',
    {
      contactId: z.string().describe('Holded customer or contact ID.'),
      date: dateInput.describe('Invoice date (ISO 8601 or Unix seconds).'),
      dueDate: dateInput.optional().describe('Optional due date (ISO 8601 or Unix seconds).'),
      notes: z.string().optional().describe('Optional invoice notes.'),
      numSerieId: z
        .string()
        .optional()
        .describe('Optional numbering series ID, as returned by list_numbering_series.'),
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
    writeAnnotations('create_invoice_draft'),
    async ({ date, dueDate, ...rest }) => {
      // approveDoc se fuerza al final del spread para que ningún input pueda
      // anularlo. NO mover esta línea.
      const body: Record<string, unknown> = {
        ...rest,
        date: toUnixSecondsNumber(date),
        ...(dueDate !== undefined ? { dueDate: toUnixSecondsNumber(dueDate) } : {}),
        approveDoc: false,
      };

      const data = await getClient().createDocument('invoice', body);
      return {
        content: [
          {
            type: 'text',
            text:
              'Draft invoice created (approveDoc=false enforced server-side). The document is in draft state in Holded.\n\n' +
              JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}
