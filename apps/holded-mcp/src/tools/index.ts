import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HoldedClient } from '../holded-client.js';
import { registerContactsTools } from './contacts.js';
import { registerInvoicingTools } from './invoicing.js';
import {
  registerAccountingTools,
  registerCatalogsTools,
  registerProductsTools,
  registerProjectsTools,
  registerTeamTools,
  registerTreasuryTools,
} from './other.js';

export function registerProductionTools(server: McpServer, getClient: () => HoldedClient) {
  registerInvoicingTools(server, getClient);
  registerContactsTools(server, getClient);
  registerProductsTools(server, getClient);
  registerCatalogsTools(server, getClient);
  registerProjectsTools(server, getClient);
  registerAccountingTools(server, getClient);
  registerTeamTools(server, getClient);
  registerTreasuryTools(server, getClient);
}
