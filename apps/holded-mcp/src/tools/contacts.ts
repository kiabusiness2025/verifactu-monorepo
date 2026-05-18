import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';
import { paginateInMemory, parsePageParam } from '../utils.js';
import { withControlledErrors } from './errors.js';
import { readOnlyAnnotations } from './policy.js';

/**
 * Extrae el timestamp de creación de un contacto Holded, tolerando los
 * distintos nombres de campo que el API puede devolver según el endpoint
 * (`createdAt`, `created_at`, `creationDate`). Si no hay timestamp válido
 * devuelve `0` — los contactos sin fecha quedan al final del orden descendente,
 * lo que es el comportamiento defensivo que queremos.
 */
export function readCreatedAt(contact: unknown): number {
  if (!contact || typeof contact !== 'object') return 0;
  const c = contact as Record<string, unknown>;
  const candidates = [c.createdAt, c.created_at, c.creationDate, c.creation_date];
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
      const ms = Date.parse(v);
      if (Number.isFinite(ms)) return Math.floor(ms / 1000);
    }
  }
  return 0;
}

export function registerContactsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_contacts',
    'Returns Holded contacts (clients, suppliers, debtors and creditors). Read-only. ' +
      'PAGINATION is fully client-side — the connector fetches all contacts of the requested type from Holded in a single call (Holded /contacts does NOT support ?page=N natively) and serves slices of `limit` per `page`. page=N always works deterministically while pagination.hasMore is true. Iterate page=1,2,3,... to drain the full list. Sorted by creation date with the most recent first by default.',
    {
      type: z
        .enum(['client', 'supplier', 'debtor', 'creditor'])
        .optional()
        .describe('Optional Holded contact type filter.'),
      page: z
        .string()
        .optional()
        .describe(
          'Results page number (1-indexed, default 1). Iterate while pagination.hasMore is true.'
        ),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25)
        .describe(
          'Page size: max contacts returned in this call (default 25, max 100). Increase to reduce round-trips.'
        ),
      sort: z
        .enum(['recent', 'oldest'])
        .nullish()
        .transform((v) => v ?? 'recent')
        .describe(
          'Sort order applied client-side after fetching from Holded. "recent" (default) lists newest contacts first by createdAt; "oldest" lists oldest first. Holded does not expose a native sort param, so the connector sorts in memory before paginating.'
        ),
    },
    readOnlyAnnotations('list_contacts'),
    async ({ limit, sort, page, type }) => {
      // Bug 18-may-2026 (soporte audit "paginación rota"): NO se forwardea
      // `page` a Holded — el endpoint /contacts no soporta paginación nativa
      // y devolvía siempre el mismo subset. Paginamos client-side desde la
      // respuesta completa. Ver utils.paginateInMemory.
      const filtered: Record<string, string> = {};
      if (type !== undefined) filtered.type = String(type);

      const raw = await getClient().listContacts(filtered);
      const all = Array.isArray(raw) ? raw : [];

      // Holded no garantiza orden en /contacts (regresion documentada en demo
      // 12-may-2026, task #102): dos clientes pidieron "los 5 mas recientes" y
      // recibieron conjuntos completamente disjuntos. Ordenamos client-side por
      // createdAt antes de paginar para que el modelo reciba un orden predecible.
      const sorted = [...all].sort((a, b) => {
        const ca = readCreatedAt(a);
        const cb = readCreatedAt(b);
        return sort === 'oldest' ? ca - cb : cb - ca;
      });

      const pageNum = parsePageParam(page);
      const { items: contacts, meta: pagination } = paginateInMemory(sorted, pageNum, limit, {
        itemNoun: 'contacts',
      });

      const payload: Record<string, unknown> = {
        contacts,
        count: contacts.length,
        pagination,
        sort,
      };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.tool(
    'get_contact',
    'Returns the full details of a specific Holded contact by its ID. Read-only. ' +
      'Si el contactId no existe o está malformado, devuelve `{ "error": "not_found" }` ' +
      'con un mensaje legible en vez de propagar un error genérico.',
    {
      contactId: z.string().describe('Holded contact ID.'),
    },
    readOnlyAnnotations('get_contact'),
    withControlledErrors(
      'get_contact',
      'contact',
      ({ contactId }) => contactId,
      async ({ contactId }) => {
        const data = await getClient().getContact(contactId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
    )
  );

  server.tool(
    'list_crm_funnels',
    'Returns the list of CRM funnels configured in Holded. Read-only.',
    {},
    readOnlyAnnotations('list_crm_funnels'),
    async () => {
      const data = await getClient().listContactFunnels();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_leads',
    'Returns the list of Holded CRM leads (opportunities). Optionally filtered by funnel ID. Read-only.',
    {
      funnelId: z
        .string()
        .optional()
        .describe('Optional funnel ID; if omitted, returns leads across all funnels.'),
    },
    readOnlyAnnotations('list_leads'),
    async ({ funnelId }) => {
      const data = await getClient().listLeads(funnelId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
