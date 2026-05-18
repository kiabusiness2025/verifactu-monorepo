import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedApiError, HoldedClient } from '../holded-client.js';
import {
  buildPaginationMeta,
  dateInputOptional,
  defaultDailyLedgerRange,
  paginateInMemory,
  parsePageParam,
  toUnixSecondsString,
} from '../utils.js';
import { withControlledErrors } from './errors.js';
import { readOnlyAnnotations } from './policy.js';

/**
 * Devuelve `true` si un error de Holded indica que el endpoint no aplica para
 * esta cuenta concreta (modulo no activado, sin datos, etc.). Estos casos no
 * son fallos del MCP server — son condiciones esperables que merecen una
 * respuesta amable al LLM en lugar de un stack trace crudo.
 */
function isHoldedNotConfigured(err: unknown): boolean {
  return (
    err instanceof HoldedApiError &&
    /not\s*found|no\s*disponible|not\s*configured/i.test(err.message)
  );
}

export function registerProductsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_products',
    'Returns the list of Holded products and services in the catalog. Read-only. ' +
      'PAGINATION is fully client-side — the connector fetches the entire catalog from Holded in a single call (Holded /products does NOT support ?page=N natively) and serves slices of `limit` per `page`. page=N always works deterministically while pagination.hasMore is true.',
    {
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
          'Page size: max products returned in this call (default 25, max 100). Increase to reduce round-trips.'
        ),
    },
    readOnlyAnnotations('list_products'),
    async ({ limit, page }) => {
      // Bug 18-may-2026 (soporte audit "paginación rota"): NO se forwardea
      // `page` a Holded — el endpoint /products no soporta paginación nativa.
      // Paginamos client-side. Ver utils.paginateInMemory.
      const raw = await getClient().listProducts();
      const all = Array.isArray(raw) ? raw : [];
      const pageNum = parsePageParam(page);
      const { items: products, meta: pagination } = paginateInMemory(all, pageNum, limit, {
        itemNoun: 'products',
      });
      const payload: Record<string, unknown> = {
        products,
        count: products.length,
        pagination,
      };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.tool(
    'get_product',
    'Returns the full details of a specific Holded product by its ID. Read-only. ' +
      'Si el productId no existe o está malformado, devuelve `{ "error": "not_found" }` con un mensaje legible.',
    {
      productId: z.string().describe('Holded product ID.'),
    },
    readOnlyAnnotations('get_product'),
    withControlledErrors(
      'get_product',
      'product',
      ({ productId }) => productId,
      async ({ productId }) => {
        const data = await getClient().getProduct(productId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
    )
  );

  server.tool(
    'list_products_stock',
    'Returns current stock levels for products across Holded warehouses. Read-only. Returns an empty list with a note when the Holded account does not have stock tracking enabled.',
    {
      page: z.string().optional().describe('Results page number.'),
    },
    readOnlyAnnotations('list_products_stock'),
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
      ) as Record<string, string>;
      try {
        const data = await getClient().listProductsStock(filtered);
        const stock = Array.isArray(data) ? data : [];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ stock, count: stock.length }, null, 2),
            },
          ],
        };
      } catch (err) {
        if (isHoldedNotConfigured(err)) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    stock: [],
                    count: 0,
                    note: 'Stock tracking is not enabled for this Holded account, or no products with stock data exist. Use list_products to see the catalog without stock data.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        throw err;
      }
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
    'Returns the list of numbering series configured in Holded. Read-only. Returns an empty list with a note when no series are configured (Holded will use its default series).',
    {},
    readOnlyAnnotations('list_numbering_series'),
    async () => {
      const data = await getClient().listNumberingSeries();
      const series = Array.isArray(data) ? data : [];
      const payload: Record<string, unknown> = {
        series,
        count: series.length,
      };
      if (series.length === 0) {
        payload.note =
          'No numbering series are configured in this Holded account. Documents will use the default series automatically.';
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
      };
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
    'Returns the full details of a specific Holded project by its ID. Read-only. ' +
      'Si el projectId no existe o está malformado, devuelve `{ "error": "not_found" }` con un mensaje legible.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyAnnotations('get_project'),
    withControlledErrors(
      'get_project',
      'project',
      ({ projectId }) => projectId,
      async ({ projectId }) => {
        const data = await getClient().getProject(projectId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
    )
  );

  server.tool(
    'list_project_tasks',
    'Returns the tasks belonging to a specific Holded project. Read-only. ' +
      'Si el projectId no existe o está malformado, devuelve `{ "error": "not_found" }` con un mensaje legible.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyAnnotations('list_project_tasks'),
    withControlledErrors(
      'list_project_tasks',
      'project',
      ({ projectId }) => projectId,
      async ({ projectId }) => {
        const data = await getClient().listTasks(projectId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
    )
  );

  server.tool(
    'list_time_records',
    'Returns the time records logged against a Holded project. Read-only. ' +
      'Si el projectId no existe o está malformado, devuelve `{ "error": "not_found" }` con un mensaje legible.',
    {
      projectId: z.string().describe('Holded project ID.'),
    },
    readOnlyAnnotations('list_time_records'),
    withControlledErrors(
      'list_time_records',
      'project',
      ({ projectId }) => projectId,
      async ({ projectId }) => {
        const data = await getClient().listTimeRecords(projectId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
    )
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
    'Returns Holded journal entries (daily ledger) for a date range. Read-only. PAGINATED — always check the `pagination.likelyHasMorePages` flag and fetch all pages before computing aggregates. If you omit starttmp and endtmp, the connector defaults to the current calendar year (Jan 1 to today).',
    {
      starttmp: dateInputOptional().describe(
        'Start date (ISO 8601 or Unix seconds). Optional — if omitted or null, defaults to Jan 1 of the current calendar year.'
      ),
      endtmp: dateInputOptional().describe(
        'End date (ISO 8601 or Unix seconds). Optional — if omitted or null, defaults to today.'
      ),
      page: z
        .string()
        .optional()
        .describe(
          'Results page number, as string (e.g. "1", "2"). Default 1. Increment until `pagination.likelyHasMorePages` is false.'
        ),
    },
    readOnlyAnnotations('get_journal'),
    async ({ starttmp, endtmp, ...rest }) => {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) params[k] = String(v);
      }
      // Holded /dailyledger REQUIERE starttmp y endtmp como mandatory.
      // Aplicamos defaults conservadores (anyo en curso) si el LLM los omite.
      // Task #106 (12-may-2026).
      const defaults = defaultDailyLedgerRange();
      params.starttmp = starttmp !== undefined ? toUnixSecondsString(starttmp) : defaults.starttmp;
      params.endtmp = endtmp !== undefined ? toUnixSecondsString(endtmp) : defaults.endtmp;

      const data = await getClient().getDailyLedger(params);
      const entries = Array.isArray(data) ? data : [];
      const page = parsePageParam(rest.page);
      const pagination = buildPaginationMeta(entries.length, page);
      const usedDefaults = {
        starttmp: starttmp === undefined,
        endtmp: endtmp === undefined,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                entries,
                pagination,
                rangeApplied: {
                  starttmp: params.starttmp,
                  endtmp: params.endtmp,
                  defaultsAppliedByConnector: usedDefaults,
                },
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
    'get_daily_book',
    'Returns the Holded daily accounting book (daily ledger) for a date range. Read-only. PAGINATED. If you omit starttmp and endtmp, the connector defaults to the current calendar year.',
    {
      starttmp: dateInputOptional().describe(
        'Start date (ISO 8601 or Unix seconds). Optional — if omitted or null, defaults to Jan 1 of the current calendar year.'
      ),
      endtmp: dateInputOptional().describe(
        'End date (ISO 8601 or Unix seconds). Optional — if omitted or null, defaults to today.'
      ),
      page: z
        .string()
        .optional()
        .describe(
          'Results page number, as string. Default 1. Increment until `pagination.likelyHasMorePages` is false.'
        ),
    },
    readOnlyAnnotations('get_daily_book'),
    async ({ starttmp, endtmp, page }) => {
      const params: Record<string, string> = {};
      const defaults = defaultDailyLedgerRange();
      params.starttmp = starttmp !== undefined ? toUnixSecondsString(starttmp) : defaults.starttmp;
      params.endtmp = endtmp !== undefined ? toUnixSecondsString(endtmp) : defaults.endtmp;
      if (page !== undefined) params.page = String(page);

      const data = await getClient().getDailyLedger(params);
      const entries = Array.isArray(data) ? data : [];
      const pageNum = parsePageParam(page);
      const pagination = buildPaginationMeta(entries.length, pageNum);
      const usedDefaults = {
        starttmp: starttmp === undefined,
        endtmp: endtmp === undefined,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                entries,
                pagination,
                rangeApplied: {
                  starttmp: params.starttmp,
                  endtmp: params.endtmp,
                  defaultsAppliedByConnector: usedDefaults,
                },
              },
              null,
              2
            ),
          },
        ],
      };
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
    'Returns the full details of a specific Holded employee by ID. Read-only. ' +
      'Si el employeeId no existe o está malformado, devuelve `{ "error": "not_found" }` con un mensaje legible.',
    {
      employeeId: z.string().describe('Holded employee ID.'),
    },
    readOnlyAnnotations('get_employee'),
    withControlledErrors(
      'get_employee',
      'employee',
      ({ employeeId }) => employeeId,
      async ({ employeeId }) => {
        const data = await getClient().getEmployee(employeeId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
    )
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
