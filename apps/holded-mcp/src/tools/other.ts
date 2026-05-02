import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';
import { readOnlyWithTitle } from './policy.js';

export function registerProductsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_products',
    'Lists Holded products and services. Read-only.',
    {
      page: z.string().optional().describe('Results page number.'),
    },
    readOnlyWithTitle('List Holded products'),
    async (params) => {
      const data = await getClient().listProducts(params as Record<string, string>);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_product',
    'Gets the details of a specific Holded product. Read-only.',
    {
      productId: z.string().describe('Holded product ID.'),
    },
    readOnlyWithTitle('Get Holded product'),
    async ({ productId }) => {
      const data = await getClient().getProduct(productId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_warehouses',
    'Lists Holded warehouses and available stock. Read-only.',
    {},
    readOnlyWithTitle('List Holded warehouses'),
    async () => {
      const data = await getClient().listWarehouses();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerProjectsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_projects',
    'Lists Holded projects and their general status. Read-only.',
    {},
    readOnlyWithTitle('List Holded projects'),
    async () => {
      const data = await getClient().listProjects();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_project',
    'Gets the details of a specific Holded project. Read-only.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyWithTitle('Get Holded project'),
    async ({ projectId }) => {
      const data = await getClient().getProject(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_project_tasks',
    'Lists tasks that belong to a specific Holded project. Read-only.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyWithTitle('List project tasks'),
    async ({ projectId }) => {
      const data = await getClient().listTasks(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_time_records',
    'Lists time records logged against a Holded project. Read-only.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyWithTitle('List time records'),
    async ({ projectId }) => {
      const data = await getClient().listTimeRecords(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerAccountingTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'get_chart_of_accounts',
    'Gets the Holded chart of accounts. Read-only.',
    {},
    readOnlyWithTitle('Get chart of accounts'),
    async () => {
      const data = await getClient().getChartOfAccounts();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_journal',
    'Gets Holded journal entries for a date range. Read-only.',
    {
      starttmp: z.string().optional().describe('Start date as Unix timestamp.'),
      endtmp: z.string().optional().describe('End date as Unix timestamp.'),
      page: z.string().optional().describe('Results page number.'),
    },
    readOnlyWithTitle('Get journal entries'),
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
      ) as Record<string, string>;

      const data = await getClient().getJournal(filtered);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_daily_book',
    'Gets the Holded daily accounting book for a date range. Read-only.',
    {
      starttmp: z.string().optional().describe('Start date as Unix timestamp.'),
      endtmp: z.string().optional().describe('End date as Unix timestamp.'),
    },
    readOnlyWithTitle('Get daily accounting book'),
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
      ) as Record<string, string>;

      const data = await getClient().getDailyBook(filtered);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerTeamTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_employees',
    'Lists active Holded employees. Read-only.',
    {},
    readOnlyWithTitle('List Holded employees'),
    async () => {
      const data = await getClient().listEmployees();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_employee',
    'Gets the details of a specific Holded employee. Read-only.',
    {
      employeeId: z.string().describe('Holded employee ID.'),
    },
    readOnlyWithTitle('Get Holded employee'),
    async ({ employeeId }) => {
      const data = await getClient().getEmployee(employeeId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerTreasuryTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_treasury_accounts',
    'Lists Holded treasury accounts and current balances. Read-only.',
    {},
    readOnlyWithTitle('List treasury accounts'),
    async () => {
      const data = await getClient().listTreasuryAccounts();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
