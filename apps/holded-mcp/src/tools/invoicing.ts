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
            // V3.G.8 (2026-06-01): exigir name no vacío, units > 0, subtotal > 0.
            // El reviewer creó drafts basura con name vacío, units 0 y subtotal
            // negativo (-500€) porque Zod aceptaba cualquier número/string.
            name: z
              .string()
              .min(1, 'Line item name cannot be empty.')
              .describe('Line item name (must be non-empty).'),
            units: z
              .number()
              .positive('Quantity must be greater than 0.')
              .describe('Quantity (must be > 0).'),
            subtotal: z
              .number()
              .positive('Unit price must be greater than 0. Refunds use credit notes, not negative invoices.')
              .describe('Unit price before tax (must be > 0).'),
            tax: z.number().optional().describe('VAT percentage, for example 21.'),
          })
        )
        .min(1, 'At least one line item is required to create a draft.')
        .describe('Invoice draft line items (at least one required).'),
    },
    writeAnnotations('create_invoice_draft'),
    async ({ date, dueDate, contactId, contactName, ...rest }) => {
      // V3.G.8 (2026-06-01): validación explícita de fechas. Antes confiábamos
      // solo en toUnixSecondsNumber que throw para input inválido, pero el
      // withControlledErrors wrapper podía enmascarar el error. Ahora lo
      // capturamos y devolvemos respuesta controlada legible.
      let dateUnix: number;
      try {
        dateUnix = toUnixSecondsNumber(date);
        if (!Number.isFinite(dateUnix)) throw new Error('Invalid');
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'invalid_date',
                  date,
                  message: `Invoice date "${date}" is not a valid ISO 8601 date or Unix timestamp. Use a format like "2026-06-15" or "1750118400".`,
                },
                null,
                2
              ),
            },
          ],
          isError: false,
        };
      }
      let dueDateUnix: number | undefined;
      if (dueDate !== undefined) {
        try {
          dueDateUnix = toUnixSecondsNumber(dueDate);
          if (!Number.isFinite(dueDateUnix)) throw new Error('Invalid');
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'invalid_due_date',
                    dueDate,
                    message: `Due date "${dueDate}" is not a valid ISO 8601 date or Unix timestamp.`,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
        }
      }

      // contactName -> contactId resolution. Mirror of F2a in the ChatGPT
      // adapter. Avoids forcing the caller to chain list_contacts first.
      let resolvedContactId = contactId?.trim();

      // V3.G.9 (2026-06-01): si el modelo pasa contactId Y contactName,
      // verificamos que coinciden. Cubre el caso de contaminación de
      // contexto donde el modelo improvisa un id de conversaciones
      // anteriores con un nombre distinto.
      if (resolvedContactId && contactName?.trim()) {
        const declaredName = contactName.trim();
        try {
          const resolved = (await getClient().getContact(resolvedContactId)) as Record<
            string,
            unknown
          > | null;
          const canonicalName =
            resolved && typeof resolved.name === 'string' ? resolved.name : '';
          const matches =
            canonicalName.toLowerCase() === declaredName.toLowerCase() ||
            canonicalName.toLowerCase().includes(declaredName.toLowerCase()) ||
            declaredName.toLowerCase().includes(canonicalName.toLowerCase());
          if (canonicalName && !matches) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      error: 'contact_id_name_mismatch',
                      contactId: resolvedContactId,
                      canonicalName,
                      declaredName,
                      message: `contactId ${resolvedContactId} resolves to "${canonicalName}" but you passed contactName="${declaredName}". These look like different contacts — the contactId may be stale. To proceed, pass ONLY contactName="${declaredName}" (we'll resolve it freshly) OR pass ONLY the contactId you trust.`,
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: false,
            };
          }
          if (canonicalName) {
            // Sobrescribimos contactName canónico para que la consent card de
            // Claude muestre el nombre exacto que Holded tiene almacenado.
            contactName = canonicalName;
          }
        } catch {
          // getContact falló — caemos a resolver por contactName como fallback.
          resolvedContactId = undefined;
        }
      }

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

        // V3.G.8 (2026-06-01) — CRÍTICO. Antes: `const chosen = exact ?? items[0]`
        // hacía que cuando NO había match exacto cogiéramos items[0] — el primer
        // contacto que Holded devolviese, que puede ser cualquiera. El reviewer
        // reportó "CLIENTE QUE NO EXISTE XYZ 99999" reasignándose a Beta Eventos
        // silenciosamente. Riesgo real de factura al cliente equivocado.
        //
        // Cascada V3.G.8 (mismo patrón ya aplicado en apps/app V3.G.4):
        //   1) Match EXACTO case-insensitive → acepta.
        //   2) Match parcial ÚNICO (solo 1 contacto contiene el nombre) → acepta.
        //   3) Multiple partials → error "ambiguous" con sample, NO elige por ti.
        //   4) Cero matches → error "not_found".
        const exact = items.find(
          (c) => typeof c.name === 'string' && c.name.toLowerCase() === name.toLowerCase()
        );
        let chosen: Record<string, unknown> | undefined = exact;
        if (!chosen) {
          const partialMatches = items.filter(
            (c) =>
              typeof c.name === 'string' &&
              c.name.toLowerCase().includes(name.toLowerCase())
          );
          if (partialMatches.length === 1) {
            chosen = partialMatches[0];
          } else if (partialMatches.length > 1) {
            const sample = partialMatches
              .slice(0, 5)
              .map((c) => `"${c.name}"`)
              .join(', ');
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      error: 'contact_ambiguous',
                      contactName: name,
                      matches: sample,
                      message: `Multiple Holded contacts match "${name}": ${sample}. Please specify the exact contact name or call list_contacts and pass the contactId explicitly.`,
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: false,
            };
          }
        }
        const chosenId = chosen?.id ?? chosen?._id;
        if (typeof chosenId !== 'string' || !chosenId.trim()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'contact_not_found',
                    contactName: name,
                    message: `No Holded contact matches "${name}" (exact or partial). Call list_contacts to find the right contact and pass its contactId.`,
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
        // V3.G.8: sobrescribimos contactName con el nombre canónico para que la
        // tarjeta de confirmación de Claude muestre el nombre real, no lo que
        // escribió el usuario. Si el usuario ve un nombre distinto al que
        // escribió, sabe que algo no cuadra y deniega.
        if (typeof chosen?.name === 'string') {
          contactName = chosen.name;
        }
      }

      // V3.G.10 (2026-06-02) — CRÍTICO. Holded API espera `lines: [{desc,
      // units, price, tax}]` para create_invoice, NO `items: [{name, units,
      // subtotal, tax}]`. Si enviamos `items`, Holded acepta el create
      // (status 200) pero IGNORA esa key — el draft se crea con base 0,00€.
      //
      // Reviewer reportó: Claude muestra "Servicio profesional — 1 hora,
      // 90 €, IVA 18,90 €, Total 108,90 €" pero en Holded UI sale
      // Subtotal/IVA/Total 0,00€. Confirmado: el draft 6a1ea540ef05f92d220b5aef
      // se creó vacío porque enviamos `items` en lugar de `lines`.
      //
      // El seed `scripts/seed-holded-demo.mjs` ya usa `lines/desc/price`
      // correctamente y sus drafts SÍ tienen importes — confirma el mapeo.
      //
      // Aquí transformamos `items` (shape friendly al modelo) a `lines`
      // (shape que Holded acepta) antes de enviar. Mantenemos `items` como
      // input schema para no romper la API que el modelo ya conoce.
      const { items: inputItems, ...restWithoutItems } = rest as {
        items: Array<{
          productId?: string;
          name: string;
          units: number;
          subtotal: number;
          tax?: number;
        }>;
        [k: string]: unknown;
      };
      const lines = (inputItems ?? []).map((item) => ({
        desc: item.name,
        units: item.units,
        price: item.subtotal,
        ...(item.tax !== undefined ? { tax: item.tax } : {}),
        ...(item.productId !== undefined ? { productId: item.productId } : {}),
      }));

      // approveDoc se fuerza al final del spread para que ningun input pueda
      // anularlo. NO mover esta linea.
      const body: Record<string, unknown> = {
        ...restWithoutItems,
        contactId: resolvedContactId,
        date: dateUnix,
        ...(dueDateUnix !== undefined ? { dueDate: dueDateUnix } : {}),
        lines,
        approveDoc: false,
      };

      const createResponse = await getClient().createDocument('invoice', body);

      // V3.G.14 (2026-06-03) — WORKAROUND del quirk Holded.
      //
      // Hallazgo verificado contra el tenant real Nova Gestión hoy:
      // POST /api/invoicing/v1/documents/invoice con `approveDoc:false` crea
      // el shell del documento pero DESCARTA el array de líneas — el draft
      // resultante tiene `products: []`, `subtotal: 0`, `total: 0` aunque el
      // request lleve un wire body idéntico al del seed (lines con desc,
      // units, price, tax) que SÍ funciona cuando aproveDoc no se manda.
      //
      // Reproducido empíricamente con 3 contactos distintos hoy 2026-06-03:
      //   6a2077adb4... 6a2078747f... 6a20788461... → todos products:[]
      // El único contraejemplo con products poblados (6a1891beff... del 28-may
      // F260001) fue creado con approveDoc default (true) por el seed.
      //
      // El workaround respeta la policy "approveDoc:false hardcoded a nivel
      // de wire": en NINGÚN momento aprobamos el documento. Solo añadimos un
      // segundo round-trip PUT con los products ahora que el shell existe.
      // Holded acepta PUT sobre drafts (status=1, approvedAt=null) y persiste
      // las líneas correctamente cuando vienen así.
      const createdShell = createResponse as Record<string, unknown>;
      const newDocId =
        typeof createdShell.id === 'string'
          ? createdShell.id
          : typeof createdShell._id === 'string'
            ? createdShell._id
            : null;

      let data: unknown = createResponse;
      if (newDocId && lines.length > 0) {
        try {
          // Holded acepta el mismo shape de lines en PUT. No re-enviamos
          // contactId/date/etc. — solo lo necesario para añadir las líneas.
          const updateResp = await getClient().updateDocument('invoice', newDocId, {
            lines,
          });
          // Mergeamos la respuesta del PUT sobre el shell para que el caller
          // vea los importes finales (Holded recalcula subtotal/tax/total al
          // persistir las líneas).
          data = updateResp && typeof updateResp === 'object'
            ? { ...createdShell, ...(updateResp as Record<string, unknown>) }
            : createResponse;
        } catch (err) {
          // Si el PUT falla, el shell ya existe. Devolvemos el create response
          // sin bloquear — el usuario podrá completar manualmente en Holded UI.
          // Log para diagnosticar futuros fallos del workaround.
          // eslint-disable-next-line no-console
          console.warn('[create_invoice_draft] PUT update lines failed', {
            documentId: newDocId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

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
