import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';
import { readOnlyAnnotations } from './policy.js';

export function registerContactsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_contacts',
    'Returns Holded contacts (clients, suppliers, debtors and creditors). Read-only. Paginated — use page and limit to control response size.',
    {
      type: z
        .enum(['client', 'supplier', 'debtor', 'creditor'])
        .optional()
        .describe('Optional Holded contact type filter.'),
      page: z.string().optional().describe('Results page number (default 1).'),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25)
        .describe(
          'Max items returned in this call (default 25, max 100). Use page=2 for the next batch.'
        ),
    },
    readOnlyAnnotations('list_contacts'),
    async ({ limit, ...rest }) => {
      const filtered = Object.fromEntries(
        Object.entries(rest).filter(([, value]) => value !== undefined)
      ) as Record<string, string>;

      const raw = await getClient().listContacts(filtered);
      const all = Array.isArray(raw) ? raw : [];
      const truncated = all.length > limit;
      const contacts = all.slice(0, limit);
      const payload: Record<string, unknown> = {
        contacts,
        count: contacts.length,
        totalReceived: all.length,
        truncated,
      };
      if (truncated) {
        payload.hint = `Showing first ${limit} of ${all.length} contacts received from Holded. Use page=2 (or higher) to fetch the next batch.`;
      }
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.tool(
    'get_contact',
    'Returns the full details of a specific Holded contact by its ID. Read-only.',
    {
      contactId: z.string().describe('Holded contact ID.'),
    },
    readOnlyAnnotations('get_contact'),
    async ({ contactId }) => {
      const data = await getClient().getContact(contactId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
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
