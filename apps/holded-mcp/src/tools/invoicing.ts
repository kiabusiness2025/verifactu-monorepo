import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient, HOLDED_DOC_TYPES } from '../holded-client.js';
import {
  dateInput,
  dateInputOptional,
  enrichDocumentDates,
  toUnixSecondsNumber,
  toUnixSecondsString,
} from '../utils.js';
import { readOnlyAnnotations, writeAnnotations } from './policy.js';
import { dispatchConnectorEventBackground } from '../connector-events.js';

const DOC_TYPES = HOLDED_DOC_TYPES;

/**
 * F5.3: contexto del request que las tools reciben para que las que tengan
 * side-effects (create_invoice_draft) puedan disparar eventos.
 */
export interface ToolContext {
  userId: string;
  channel: 'dashboard' | 'chatgpt' | 'mobile' | 'claude';
}

export function registerInvoicingTools(
  server: McpServer,
  getClient: () => HoldedClient,
  getContext?: () => ToolContext,
  options: { includeWriteTools?: boolean } = {}
) {
  server.tool(
    'list_documents',
    'Returns Holded documents (invoices, sales receipts, credit notes, sales orders, proformas, waybills, estimates, purchases, purchase orders, purchase refunds) filtered by type, date range and contact. Read-only. Paginated. Each document is enriched with *Formatted fields in Europe/Madrid timezone so the model does not need to parse Unix timestamps.',
    {
      docType: z
        .enum(DOC_TYPES)
        .describe(
          'Document type. One of: invoice, salesreceipt, creditnote, salesorder, proform, waybill, estimate, purchase, purchaseorder, purchaserefund.'
        ),
      page: z.string().optional().describe('Results page number (default 1).'),
      starttmp: dateInputOptional.describe(
        'Start date (ISO 8601 or Unix seconds). Optional — omit or null for no lower bound.'
      ),
      endtmp: dateInputOptional.describe(
        'End date (ISO 8601 or Unix seconds). Optional — omit or null for no upper bound.'
      ),
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
      const documents = all
        .slice(0, limit)
        .map((d) =>
          d && typeof d === 'object' ? enrichDocumentDates(d as Record<string, unknown>) : d
        );
      const payload: Record<string, unknown> = {
        docType,
        documents,
        count: documents.length,
        totalReceived: all.length,
        truncated,
        timezoneNote:
          'Dates with *Formatted suffix are YYYY-MM-DD in Europe/Madrid (peninsular Spain). Raw Unix timestamps are kept for reference.',
      };
      if (truncated) {
        payload.hint = `Showing first ${limit} of ${all.length} documents received from Holded. Use page=2 (or higher) for the next batch, or narrow with starttmp/endtmp/contactId.`;
      }
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.tool(
    'get_document',
    'Returns the full details of a specific Holded document, including line items, taxes and contact information. Read-only. Dates are enriched with *Formatted fields in Europe/Madrid timezone.',
    {
      docType: z.enum(DOC_TYPES).describe('Document type.'),
      documentId: z.string().describe('Holded document ID.'),
    },
    readOnlyAnnotations('get_document'),
    async ({ docType, documentId }) => {
      const data = await getClient().getDocument(docType, documentId);
      const enriched =
        data && typeof data === 'object'
          ? enrichDocumentDates(data as Record<string, unknown>)
          : data;
      return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
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

  if (options.includeWriteTools === false) {
    return;
  }

  server.tool(
    'create_invoice_draft',
    'Creates a Holded invoice in draft state. The server forces approveDoc=false at the wire level, so the document is never auto-issued, sent, paid, deleted or otherwise modified destructively. The created draft must be approved manually in Holded UI before it has any legal effect. Provide either contactId (preferred, from list_contacts) OR contactName (the connector resolves the contact via search).',
    {
      contactId: z
        .string()
        .optional()
        .describe('Holded customer or contact ID. Provide either contactId or contactName.'),
      contactName: z
        .string()
        .optional()
        .describe(
          'Customer or contact name (e.g. "Kappa Digital Zaragoza SL"). The connector resolves it to a contactId via list_contacts. Provide either contactId or contactName.'
        ),
      date: dateInput.describe('Invoice date (ISO 8601 or Unix seconds).'),
      dueDate: dateInputOptional.describe(
        'Optional due date (ISO 8601 or Unix seconds). Omit or null for no due date.'
      ),
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
    async ({ date, dueDate, contactId, contactName, ...rest }) => {
      // contactName -> contactId resolution. Mirror of F2a in the ChatGPT
      // adapter. Avoids forcing the caller to chain list_contacts first.
      let resolvedContactId = contactId?.trim();
      if (!resolvedContactId) {
        if (!contactName?.trim()) {
          throw new Error('Either contactId or contactName is required.');
        }
        const name = contactName.trim();
        const matches = (await getClient().listContacts({ name })) as Array<
          Record<string, unknown>
        >;
        const items = Array.isArray(matches) ? matches : [];
        const exact = items.find(
          (c) => typeof c.name === 'string' && c.name.toLowerCase() === name.toLowerCase()
        );
        const chosen = exact ?? items[0];
        const chosenId = chosen?.id ?? chosen?._id;
        if (typeof chosenId !== 'string' || !chosenId.trim()) {
          throw new Error(
            `No contact found for "${name}". Use list_contacts to find the correct contact and pass contactId.`
          );
        }
        resolvedContactId = chosenId.trim();
      }

      // approveDoc se fuerza al final del spread para que ningun input pueda
      // anularlo. NO mover esta linea.
      const body: Record<string, unknown> = {
        ...rest,
        contactId: resolvedContactId,
        date: toUnixSecondsNumber(date),
        ...(dueDate !== undefined ? { dueDate: toUnixSecondsNumber(dueDate) } : {}),
        approveDoc: false,
      };

      const data = await getClient().createDocument('invoice', body);

      // F5.3: dispatch admin email "borrador de factura creado" via el endpoint
      // receptor en apps/holded. Best-effort: si falla la red, el draft ya esta
      // creado y no degradamos la respuesta del tool.
      const ctx = getContext?.();
      if (ctx?.userId) {
        const draft = data as Record<string, unknown>;
        const draftId =
          typeof draft.id === 'string'
            ? draft.id
            : typeof draft._id === 'string'
              ? draft._id
              : null;
        const draftNumber =
          typeof draft.docNumber === 'string'
            ? draft.docNumber
            : typeof draft.number === 'string'
              ? draft.number
              : null;
        const totalRaw = draft.total ?? draft.totalAmount ?? null;
        const totalNumber = typeof totalRaw === 'number' ? totalRaw : null;
        const currency = typeof draft.currency === 'string' ? draft.currency.toUpperCase() : null;

        dispatchConnectorEventBackground({
          type: 'invoice_draft_created',
          userId: ctx.userId,
          channel: ctx.channel,
          draftId,
          draftNumber,
          contactName: contactName?.trim() || null,
          total: totalNumber,
          currency,
        });
      }

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
