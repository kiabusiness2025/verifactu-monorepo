import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';

export function registerContactsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_contacts',
    'Lista todos los contactos de Holded (clientes, proveedores, leads). ' +
      'Incluye nombre, email, teléfono, NIF/CIF y tipo. ' +
      'Útil para identificar clientes con facturas pendientes o buscar datos de contacto.',
    {
      type: z
        .enum(['client', 'supplier', 'debtor', 'creditor'])
        .optional()
        .describe('Filtrar por tipo de contacto'),
      page: z.string().optional().describe('Página de resultados'),
    },
    { readOnlyHint: true },
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      ) as Record<string, string>;
      const data = await getClient().listContacts(filtered);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_contact',
    'Obtiene el perfil completo de un contacto: historial de facturas, ' +
      'saldo pendiente, datos fiscales, teléfonos y emails.',
    {
      contactId: z.string().describe('ID del contacto en Holded'),
    },
    { readOnlyHint: true },
    async ({ contactId }) => {
      const data = await getClient().getContact(contactId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_crm_funnels',
    'Lista los embudos de ventas (funnels) configurados en el CRM de Holded.',
    {},
    { readOnlyHint: true },
    async () => {
      const data = await getClient().listContactFunnels();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_leads',
    'Lista oportunidades o leads del CRM de Holded. ' +
      'Opcionalmente filtra por embudo de ventas.',
    {
      funnelId: z
        .string()
        .optional()
        .describe('ID del funnel (embudo). Si se omite devuelve todos los deals.'),
    },
    { readOnlyHint: true },
    async ({ funnelId }) => {
      const data = await getClient().listLeads(funnelId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
