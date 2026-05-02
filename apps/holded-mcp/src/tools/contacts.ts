import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';
import { readOnlyAnnotations } from './policy.js';

export function registerContactsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_contacts',
    'Returns the list of Holded contacts (clients, suppliers, debtors and creditors). Read-only.',
    {
      type: z
        .enum(['client', 'supplier', 'debtor', 'creditor'])
        .optional()
        .describe('Optional Holded contact type filter.'),
      page: z.string().optional().describe('Results page number.'),
    },
    readOnlyAnnotations('list_contacts'),
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
      ) as Record<string, string>;

      const data = await getClient().listContacts(filtered);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
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
