import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HoldedClient } from '../holded-client.js';
import { registerContactsTools } from './contacts.js';
import { registerInvoicingTools, type ToolContext } from './invoicing.js';
import {
  registerAccountingTools,
  registerCatalogsTools,
  registerProductsTools,
  registerProjectsTools,
  registerTeamTools,
  registerTreasuryTools,
} from './other.js';

export function registerProductionTools(
  server: McpServer,
  getClient: () => HoldedClient,
  // F5.3: contexto opcional con datos del token (userId, channel) para que
  // tools con side-effects (p.ej. create_invoice_draft) puedan disparar
  // eventos al endpoint receptor de apps/holded.
  getContext?: () => ToolContext
) {
  registerInvoicingTools(server, getClient, getContext);
  registerContactsTools(server, getClient);
  registerProductsTools(server, getClient);
  registerCatalogsTools(server, getClient);
  registerProjectsTools(server, getClient);
  registerAccountingTools(server, getClient);
  registerTeamTools(server, getClient);
  registerTreasuryTools(server, getClient);
}

export type { ToolContext } from './invoicing.js';
