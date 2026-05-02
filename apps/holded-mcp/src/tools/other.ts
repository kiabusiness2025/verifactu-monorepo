import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';
import { toUnixSecondsString } from '../utils.js';
import { readOnlyAnnotations } from './policy.js';

const dateInput = z
  .union([z.string(), z.number()])
  .describe('Date as ISO 8601 (recommended) or Unix timestamp in seconds.');

export function registerProductsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_products',
    'Returns the list of Holded products and services in the catalog. Read-only.',
    {
      page: z.string().optional().describe('Results page number.'),
    },
    readOnlyAnnotations('list_products'),
    async (params) => {
      const data = await getClient().listProducts(params as Record<string, string>);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_product',
    'Returns the full details of a specific Holded product by its ID. Read-only.',
    {
      productId: z.string().describe('Holded product ID.'),
    },
    readOnlyAnnotations('get_product'),
    async ({ productId }) => {
      const data = await getClient().getProduct(productId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_products_stock',
    'Returns current stock levels for products across Holded warehouses. Read-only.',
    {
      page: z.string().optional().describe('Results page number.'),
    },
    readOnlyAnnotations('list_products_stock'),
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
      ) as Record<string, string>;
      const data = await getClient().listProductsStock(filtered);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_warehouses',
    'Returns the list of Holded warehouses (locations only, without stock data). Read-only.',
    {},
    readOnlyAnnotations('list_warehouses'),
    async () => {
      const data = await getClient().listWarehouses();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerCatalogsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_taxes',
    'Returns the list of VAT and other tax IDs configured in Holded. Read-only.',
    {},
    readOnlyAnnotations('list_taxes'),
    async () => {
      const data = await getClient().listTaxes();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_numbering_series',
    'Returns the list of numbering series configured in Holded. Read-only.',
    {},
    readOnlyAnnotations('list_numbering_series'),
    async () => {
      const data = await getClient().listNumberingSeries();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerProjectsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_projects',
    'Returns the list of Holded projects with their general status. Read-only.',
    {},
    readOnlyAnnotations('list_projects'),
    async () => {
      const data = await getClient().listProjects();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_project',
    'Returns the full details of a specific Holded project by its ID. Read-only.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyAnnotations('get_project'),
    async ({ projectId }) => {
      const data = await getClient().getProject(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_project_tasks',
    'Returns the tasks belonging to a specific Holded project. Read-only.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyAnnotations('list_project_tasks'),
    async ({ projectId }) => {
      const data = await getClient().listTasks(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_time_records',
    'Returns the time records logged against a Holded project. Read-only.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyAnnotations('list_time_records'),
    async ({ projectId }) => {
      const data = await getClient().listTimeRecords(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerAccountingTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'get_chart_of_accounts',
    'Returns the Holded chart of accounts. Read-only.',
    {},
    readOnlyAnnotations('get_chart_of_accounts'),
    async () => {
      const data = await getClient().getChartOfAccounts();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_journal',
    'Returns Holded journal entries (daily ledger) for a date range. Read-only.',
    {
      starttmp: dateInput.optional().describe('Start date (ISO 8601 or Unix seconds).'),
      endtmp: dateInput.optional().describe('End date (ISO 8601 or Unix seconds).'),
      page: z.string().optional().describe('Results page number.'),
    },
    readOnlyAnnotations('get_journal'),
    async ({ starttmp, endtmp, ...rest }) => {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) params[k] = String(v);
      }
      if (starttmp !== undefined) params.starttmp = toUnixSecondsString(starttmp);
      if (endtmp !== undefined) params.endtmp = toUnixSecondsString(endtmp);

      const data = await getClient().getDailyLedger(params);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_daily_book',
    'Returns the Holded daily accounting book (daily ledger) for a date range. Read-only.',
    {
      starttmp: dateInput.optional().describe('Start date (ISO 8601 or Unix seconds).'),
      endtmp: dateInput.optional().describe('End date (ISO 8601 or Unix seconds).'),
    },
    readOnlyAnnotations('get_daily_book'),
    async ({ starttmp, endtmp }) => {
      const params: Record<string, string> = {};
      if (starttmp !== undefined) params.starttmp = toUnixSecondsString(starttmp);
      if (endtmp !== undefined) params.endtmp = toUnixSecondsString(endtmp);

      const data = await getClient().getDailyLedger(params);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerTeamTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_employees',
    'Returns the list of active Holded employees. Read-only.',
    {},
    readOnlyAnnotations('list_employees'),
    async () => {
      const data = await getClient().listEmployees();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_employee',
    'Returns the full details of a specific Holded employee by ID. Read-only.',
    {
      employeeId: z.string().describe('Holded employee ID.'),
    },
    readOnlyAnnotations('get_employee'),
    async ({ employeeId }) => {
      const data = await getClient().getEmployee(employeeId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

export function registerTreasuryTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_treasury_accounts',
    'Returns the list of Holded treasury accounts with their current balances. Read-only.',
    {},
    readOnlyAnnotations('list_treasury_accounts'),
    async () => {
      const data = await getClient().listTreasuryAccounts();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
