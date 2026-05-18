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
import {
  getActiveToolPreset,
  getAllowedToolsForPreset,
  type HoldedMcpToolPreset,
} from './presets.js';

/**
 * Envuelve el McpServer para que `server.tool(name, ...)` solo registre la
 * tool si su nombre está en la whitelist activa. Las llamadas a tools
 * filtradas se ignoran silenciosamente — no aparecen en `tools/list` ni se
 * pueden invocar.
 *
 * Usamos Proxy en vez de modificar cada `register*Tools()` para que el
 * filtrado sea transparente al código de cada categoría. Cuando OpenAI/
 * Anthropic aprueben submission v2 (8 tools), basta con `HOLDED_MCP_TOOL_PRESET=full`
 * para volver al catálogo completo sin tocar nada.
 */
function makeFilteredServer(server: McpServer, allowedTools: Set<string> | null): McpServer {
  if (allowedTools === null) return server;
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === 'tool') {
        return (name: string, ...rest: unknown[]) => {
          if (allowedTools.has(name)) {
            return (target as unknown as { tool: (...args: unknown[]) => unknown }).tool(
              name,
              ...rest
            );
          }
          // Tool filtered out — silently skip registration so the rest of
          // register*Tools() can keep walking through its declarations.
          return undefined;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export function registerProductionTools(
  server: McpServer,
  getClient: () => HoldedClient,
  // F5.3: contexto opcional con datos del token (userId, channel) para que
  // tools con side-effects (p.ej. create_invoice_draft) puedan disparar
  // eventos al endpoint receptor de apps/holded.
  getContext?: () => ToolContext,
  options: { includeWriteTools?: boolean; toolPreset?: HoldedMcpToolPreset } = {}
) {
  const preset = options.toolPreset ?? getActiveToolPreset();
  const allowed = getAllowedToolsForPreset(preset);
  const filtered = makeFilteredServer(server, allowed);

  registerInvoicingTools(filtered, getClient, getContext, options);
  registerContactsTools(filtered, getClient);
  registerProductsTools(filtered, getClient);
  registerCatalogsTools(filtered, getClient);
  registerProjectsTools(filtered, getClient);
  registerAccountingTools(filtered, getClient);
  registerTeamTools(filtered, getClient);
  registerTreasuryTools(filtered, getClient);
}

export type { ToolContext } from './invoicing.js';
export {
  getActiveToolPreset,
  getAllowedToolsForPreset,
  isHoldedMcpToolPreset,
  SUBMISSION_V1_TOOLS,
  type HoldedMcpToolPreset,
} from './presets.js';
