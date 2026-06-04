import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedApiError, HoldedClient } from '../holded-client.js';
import {
  buildPaginationMeta,
  dateInputOptional,
  defaultDailyLedgerRange,
  paginateInMemory,
  parsePageParam,
  sortJournalEntries,
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
    'Returns the Holded chart of accounts with the balances pre-computed by Holded. Read-only. ' +
      '⚠ KNOWN HOLDED LIMITATION (V3.G.2 audit 2026-06-01, confirmed in https://help.holded.com/en/articles/6895943): Holded\'s synthetic balances EXCLUDE manual closing/regularization journal entries BY DESIGN. Amortizations, year-end closings, capital contributions, and other manual entries created in the Holded accounting UI will NOT appear in these balances even though they exist in the daily ledger. ' +
      'PASS `starttmp` and `endtmp` to scope balances to a specific fiscal year — without them Holded uses the tenant default range (often current year only, hiding prior-year closings). ' +
      'For an accurate REAL balance including manual entries, re-aggregate from get_journal across the full fiscal range: it returns ALL entries (the connector auto-paginates) so you can sum debit/credit per account code client-side and bypass Holded\'s synthetic balance limitation.',
    {
      starttmp: dateInputOptional().describe(
        'Start of fiscal range (ISO 8601 or Unix seconds). Optional — when omitted, Holded uses the tenant default. To scope to a specific fiscal year pass e.g. 2025-01-01 → 2025-12-31.'
      ),
      endtmp: dateInputOptional().describe(
        'End of fiscal range (ISO 8601 or Unix seconds). Optional.'
      ),
    },
    readOnlyAnnotations('get_chart_of_accounts'),
    async ({ starttmp, endtmp }) => {
      const params: Record<string, string> = {};
      if (starttmp !== undefined) params.starttmp = toUnixSecondsString(starttmp);
      if (endtmp !== undefined) params.endtmp = toUnixSecondsString(endtmp);

      const data = await getClient().getChartOfAccounts(params);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                accounts: data,
                rangeApplied: {
                  starttmp: params.starttmp ?? null,
                  endtmp: params.endtmp ?? null,
                  defaultsAppliedByConnector: {
                    starttmp: starttmp === undefined,
                    endtmp: endtmp === undefined,
                  },
                },
                holdedApiCaveat:
                  'Balances are Holded\'s synthetic computation and EXCLUDE manual closing/regularization entries by Holded design (per Holded Academy article 6895943). To compute the real balance including all journal entries, call get_journal across the full fiscal range and aggregate debit/credit per account client-side.',
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
    'get_journal',
    'Returns Holded journal entries (daily ledger) for a date range. Read-only. ' +
      'PAGINATED — `pagination.likelyHasMorePages` is true whenever the page is non-empty (the connector cannot deterministically detect the last page from Holded, so it always asks you to probe page+1; an empty array confirms the end). MUST drain all pages before computing aggregates. ' +
      'If you omit starttmp and endtmp, the connector defaults to the current calendar year (Jan 1 to today). Entries are returned sorted by date ascending then by entry number ascending. ' +
      '⚠ KNOWN HOLDED API CAVEAT (V3.G.1 audit 2026-06-01): in some tenants Holded\'s /dailyledger endpoint returns fewer entries than Holded\'s native "Libro diario" UI export, missing manual entries (amortizations, regularizations, year-end closings, capital contributions). If you compute an aggregate (account balance, total debit/credit) and the result does not match the user\'s expectation, advise the user to verify against Holded\'s native Libro diario export — the API may be omitting entries that the UI shows.',
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

      // V3.G.2 (2026-06-01): auto-paginar server-side hasta agregar todas
      // las páginas Holded. El reviewer reportó 155 de 408 asientos cuando
      // no paginábamos. Todos los entries del rango se devuelven en una
      // sola respuesta — el `page` del caller queda como informativo.
      const aggregated = await getClient().getDailyLedgerAllPages(params);
      const rawEntries = aggregated as Record<string, unknown>[];
      // V3.G (auditoría 2026-06-01): Holded /dailyledger devuelve los asientos
      // en orden interno Mongo (sin garantías). Para reconciliación contable
      // el usuario espera orden cronológico ASC (oldest first). Sort estable
      // por date ASC + number ASC antes de exponer al modelo.
      const entries = sortJournalEntries(rawEntries);
      const page = parsePageParam(rest.page);
      // V3.G.2: pagination meta siempre indica "no more pages" porque
      // ya hemos agregado todas las páginas en este single response.
      const pagination = buildPaginationMeta(0, page);
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
                totalEntries: entries.length,
                pagination,
                rangeApplied: {
                  starttmp: params.starttmp,
                  endtmp: params.endtmp,
                  defaultsAppliedByConnector: usedDefaults,
                },
                sortApplied: 'date_asc_then_number_asc',
                autoPaginatedByConnector: true,
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
      // V3.G.2: ignoramos el `page` del caller — auto-paginamos server-side
      // y devolvemos el array agregado completo (mismo comportamiento que
      // get_journal). El page queda como informativo en la metadata.
      const aggregated = await getClient().getDailyLedgerAllPages(params);
      const rawEntries = aggregated as Record<string, unknown>[];
      // V3.G: mismo sort que get_journal — orden cronológico ASC para
      // reconciliación contable.
      const entries = sortJournalEntries(rawEntries);
      const pageNum = parsePageParam(page);
      const pagination = buildPaginationMeta(0, pageNum);
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
                totalEntries: entries.length,
                pagination,
                rangeApplied: {
                  starttmp: params.starttmp,
                  endtmp: params.endtmp,
                  defaultsAppliedByConnector: usedDefaults,
                },
                sortApplied: 'date_asc_then_number_asc',
                autoPaginatedByConnector: true,
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
