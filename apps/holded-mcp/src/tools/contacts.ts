import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';
import { READ_ONLY_TOOL_ANNOTATIONS } from './policy.js';

export function registerContactsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_contacts',
    'Lists Holded contacts such as clients and suppliers. Read-only contact lookup.',
    {
      type: z
        .enum(['client', 'supplier', 'debtor', 'creditor'])
        .optional()
        .describe('Optional Holded contact type filter.'),
      page: z.string().optional().describe('Results page number.'),
    },
    READ_ONLY_TOOL_ANNOTATIONS,
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
    'Gets the full details of a specific Holded contact. Read-only.',
    {
      contactId: z.string().describe('Holded contact ID.'),
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    async ({ contactId }) => {
      const data = await getClient().getContact(contactId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_crm_funnels',
    'Lists the CRM funnels configured in Holded. Read-only.',
    {},
    READ_ONLY_TOOL_ANNOTATIONS,
    async () => {
      const data = await getClient().listContactFunnels();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_leads',
    'Lists Holded CRM leads or opportunities. Read-only.',
    {
      funnelId: z
        .string()
        .optional()
        .describe('Optional funnel ID. If omitted, returns leads across all funnels.'),
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    async ({ funnelId }) => {
      const data = await getClient().listLeads(funnelId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
