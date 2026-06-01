import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient, HOLDED_DOC_TYPES } from '../holded-client.js';
import {
  dateInput,
  dateInputOptional,
  defaultDocumentsRange,
  enrichDocumentDates,
  paginateInMemory,
  parsePageParam,
  toUnixSecondsNumber,
  toUnixSecondsString,
} from '../utils.js';
import { readOnlyAnnotations, writeAnnotations } from './policy.js';
import { withControlledErrors } from './errors.js';
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
    'Returns Holded documents (invoices, sales receipts, credit notes, sales orders, proformas, waybills, estimates, purchases, purchase orders, purchase refunds) filtered by type, date range and contact. Read-only. ' +
      '\n\n' +
      'PAGINATION is fully client-side — the connector fetches the entire date-range dataset from Holded in a single call and serves slices of `limit` items per `page`. `page=N` always works deterministically while `pagination.hasMore` is true. Use `pagination.totalItems` to plan how many pages you need, then iterate page=1,2,3,... until `hasMore` is false. Do NOT trim by date as a paging workaround — that was needed before but is now wrong: a single broad starttmp/endtmp range with `page=N` is the supported pattern. ' +
      '\n\n' +
      'Each document is enriched with *Formatted fields in Europe/Madrid timezone so the model does not need to parse Unix timestamps. ' +
      '\n\n' +
      "IMPORTANT — Holded's native default returns ONLY current-year documents (approved status), so documents from previous years are invisible without an explicit date range. " +
      'To prevent this audit blind-spot the connector automatically applies a default window of "previous calendar year January 1 → today" (~24 months) when neither starttmp nor endtmp is provided, surfaced in `rangeApplied.defaultsAppliedByConnector`. ' +
      'To audit OLDER history (e.g. 2024 or earlier) pass explicit `starttmp`/`endtmp` covering that period. To audit a SPECIFIC fiscal year, pass starttmp = Jan 1 of that year, endtmp = Dec 31 of that year.',
    {
      docType: z
        .enum(DOC_TYPES)
        .describe(
          'Document type. One of: invoice, salesreceipt, creditnote, salesorder, proform, waybill, estimate, purchase, purchaseorder, purchaserefund.'
        ),
      page: z
        .string()
        .optional()
        .describe(
          'Results page number (1-indexed, default 1). Pagination is client-side: page=N returns documents [(N-1)*limit, N*limit) of the totalItems for the date range. Iterate while pagination.hasMore is true.'
        ),
      starttmp: dateInputOptional().describe(
        'Start date (ISO 8601 or Unix seconds). Optional — if omitted AND endtmp is also omitted, the connector applies a default of Jan 1 of the previous calendar year (e.g. 2025-01-01 when called in 2026) to cover ~24 months. Pass an explicit value to audit older periods.'
      ),
      endtmp: dateInputOptional().describe(
        'End date (ISO 8601 or Unix seconds). Optional — if omitted AND starttmp is also omitted, the connector defaults to "now". If you pass starttmp explicitly without endtmp, the Holded API requires both, so the connector falls back to "now" for endtmp.'
      ),
      contactId: z.string().optional().describe('Optional Holded contact ID filter.'),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25)
        .describe(
          'Page size: max documents returned in this call (default 25, max 100). Increase to reduce the number of round-trips needed to drain the full date range.'
        ),
    },
    readOnlyAnnotations('list_documents'),
    async ({ docType, starttmp, endtmp, limit, page, contactId }) => {
      const params: Record<string, string> = {};
      if (contactId !== undefined) params.contactId = String(contactId);

      // Bug 18-may-2026 (soporte audit "291 facturas paginando"): NO se debe
      // forwardear `page` a Holded — el endpoint /documents no soporta
      // paginación nativa (devuelve [] o el mismo conjunto). Paginamos
      // client-side desde la respuesta completa. Ver utils.paginateInMemory.

      // Holded API default behaviour: cuando NO se pasa rango de fechas, el
      // endpoint /documents devuelve solo el ejercicio en curso y solo
      // documentos aprobados. La auditoría de soporte (2026-05-16) confirmó
      // que esto causa "30 facturas visibles" en una cuenta que en realidad
      // tiene 168 del año anterior. Para evitar el blind spot aplicamos un
      // default de "1 de enero del año anterior → hoy" (~24 meses), que cubre
      // ejercicio en curso + ejercicio cerrado anterior — el caso de uso más
      // común para análisis fiscal/contable.
      //
      // Bug 18-may-2026 (II): la API /documents requiere AMBOS timestamps si
      // recibe uno (devuelve 400 si recibe solo starttmp). Cualquier camino
      // que setee `starttmp` debe setear también `endtmp`, idéntico al patrón
      // de /dailyledger.
      const defaults = defaultDocumentsRange();
      const defaultsApplied = {
        starttmp: starttmp === undefined,
        endtmp: endtmp === undefined,
      };

      params.starttmp = starttmp !== undefined ? toUnixSecondsString(starttmp) : defaults.starttmp;
      params.endtmp = endtmp !== undefined ? toUnixSecondsString(endtmp) : defaults.endtmp;

      const raw = await getClient().listDocuments(docType, params);
      const allRaw = Array.isArray(raw) ? raw : [];
      const allEnriched = allRaw.map((d) =>
        d && typeof d === 'object' ? enrichDocumentDates(d as Record<string, unknown>) : d
      );

      const pageNum = parsePageParam(page);
      const { items: documents, meta: pagination } = paginateInMemory(allEnriched, pageNum, limit, {
        itemNoun: `${docType} documents`,
      });

      const payload: Record<string, unknown> = {
        docType,
        documents,
        count: documents.length,
        pagination,
        rangeApplied: {
          starttmp: params.starttmp ?? null,
          endtmp: params.endtmp ?? null,
          defaultsAppliedByConnector: defaultsApplied,
        },
        timezoneNote:
          'Dates with *Formatted suffix are YYYY-MM-DD in Europe/Madrid (peninsular Spain). Raw Unix timestamps are kept for reference.',
      };
      if (defaultsApplied.starttmp && defaultsApplied.endtmp) {
        payload.note =
          'Holded\'s native default would return only current-year documents. The connector applied a default range of "previous calendar year Jan 1 → today" (~24 months) so older fiscal-year documents are visible. To audit older periods (e.g. 2024 or earlier), pass explicit starttmp/endtmp.';
      } else if (defaultsApplied.endtmp) {
        payload.note =
          'The Holded /documents API requires both starttmp and endtmp when either is sent. You provided starttmp only — the connector defaulted endtmp to "now". Pass an explicit endtmp to control the upper bound.';
      } else if (defaultsApplied.starttmp) {
        payload.note =
          'The Holded /documents API requires both starttmp and endtmp when either is sent. You provided endtmp only — the connector defaulted starttmp to Jan 1 of the previous calendar year. Pass an explicit starttmp to control the lower bound.';
      }
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.tool(
    'get_document',
    'Returns the full details of a specific Holded document, including line items, taxes and contact information. Read-only. Dates are enriched with *Formatted fields in Europe/Madrid timezone. ' +
      'Si el documentId no existe o está malformado, devuelve `{ "error": "not_found" }` con un mensaje legible en vez de propagar un error genérico.',
    {
      docType: z.enum(DOC_TYPES).describe('Document type.'),
      documentId: z.string().describe('Holded document ID.'),
    },
    readOnlyAnnotations('get_document'),
    withControlledErrors(
      'get_document',
      'document',
      ({ documentId }) => documentId,
      async ({ docType, documentId }) => {
        const data = await getClient().getDocument(docType, documentId);
        const enriched =
          data && typeof data === 'object'
            ? enrichDocumentDates(data as Record<string, unknown>)
            : data;
        return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
      }
    )
  );

  server.tool(
    'get_document_pdf',
    'Returns the PDF rendering of a specific Holded document, encoded as a base64 string. Read-only. ' +
      'Si el documentId no existe o está malformado, devuelve `{ "error": "not_found" }` con un mensaje legible en vez de propagar un error genérico.',
    {
      docType: z.enum(DOC_TYPES).describe('Document type.'),
      documentId: z.string().describe('Holded document ID.'),
    },
    readOnlyAnnotations('get_document_pdf'),
    withControlledErrors(
      'get_document_pdf',
      'document',
      ({ documentId }) => documentId,
      async ({ docType, documentId }) => {
        const buf = await getClient().getDocumentPdf(docType, documentId);

        // V3.G.1 (auditoría 2026-06-01): valida magic bytes %PDF- antes de
        // exponer el buffer como application/pdf. Holded devuelve 200 OK +
        // body JSON ({"status":0,"info":"No attachments found"}) cuando el
        // documento no tiene PDF — antes el handler retornaba 42 bytes con
        // contentType: 'application/pdf' mentiroso y el consumidor recibía
        // basura. Mismo patrón ya cerrado en apps/app y apps/isaak.
        const magic = buf.subarray(0, 5).toString('latin1');
        const isPdfMagic = magic.startsWith('%PDF-');

        if (!isPdfMagic) {
          // V3.G.5 (auditoría 2026-06-01): antes de devolver no_attachment,
          // intentamos los archivos subidos manualmente al documento (Holded
          // distingue PDF renderizado vs attachments del usuario). Cubre el
          // caso real reportado con P250001 en Nova Gestión.
          //
          // V3.G.7 (2026-06-01): Holded devuelve attachments como array de
          // STRINGS (nombres de archivo), NO array de objetos. Aceptamos
          // ambas formas por defensa. Verificado empíricamente contra
          // P250001: `{"status":1,"attachments":["31PTaxInvoice...pdf"]}`.
          try {
            const attachments = await getClient().listDocumentAttachments(docType, documentId);
            if (Array.isArray(attachments) && attachments.length > 0) {
              const first = attachments[0] as unknown;
              let fileName = '';
              if (typeof first === 'string') {
                fileName = first.trim();
              } else if (first && typeof first === 'object') {
                const obj = first as Record<string, unknown>;
                fileName = String(obj.fileName ?? obj.name ?? obj.filename ?? '').trim();
              }
              if (fileName) {
                const attachBuf = await getClient().getDocumentAttachment(
                  docType,
                  documentId,
                  fileName
                );
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(
                        {
                          docType,
                          documentId,
                          source: 'attachment',
                          fileName,
                          contentType: 'application/pdf',
                          base64: attachBuf.toString('base64'),
                          bytes: attachBuf.length,
                        },
                        null,
                        2
                      ),
                    },
                  ],
                };
              }
            }
          } catch {
            // Si /attachments también falla, caemos al mensaje genérico.
          }

          let parsedError: string | null = null;
          try {
            const body = buf.toString('utf8');
            const parsed = JSON.parse(body) as {
              info?: string;
              error?: string;
              message?: string;
            };
            parsedError = parsed?.info ?? parsed?.error ?? parsed?.message ?? null;
          } catch {
            // Cuerpo no es JSON parseable — dejamos parsedError null.
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'no_attachment',
                    docType,
                    documentId,
                    message:
                      parsedError ||
                      `Holded returned no PDF for ${docType}/${documentId}. The document has no rendered PDF and no user-uploaded attachments.`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

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
    )
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
      dueDate: dateInputOptional().describe(
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
          // Input validation: ningún identificador de contacto.
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'contact_required',
                    message:
                      'Either contactId or contactName is required. Use list_contacts to find the contact ID, then call this tool again.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
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
          // Devolvemos respuesta controlada (no throw) para que el modelo pueda
          // razonar sobre el resultado y reintentar con contactId resuelto.
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'contact_not_found',
                    contactName: name,
                    message: `No contact found for "${name}". Use list_contacts to find the correct contact and pass contactId.`,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
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
