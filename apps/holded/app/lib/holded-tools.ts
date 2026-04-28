import type Anthropic from '@anthropic-ai/sdk';

// Re-export from holded-mcp using a direct import so we don't introduce a
// workspace dependency — the holded-mcp package lives in the same repo.
// The HoldedClient constructor takes a plain API key string.
import { HoldedClient } from '../../../holded-mcp/src/holded-client.js';

// ─── Tool definitions (Anthropic Tool format) ────────────────────────────────

export const HOLDED_TOOLS: Anthropic.Tool[] = [
  // Facturación
  {
    name: 'holded_list_documents',
    description:
      'Lista facturas emitidas (invoice), compras (purchase) o presupuestos (estimate) con filtros de estado y fecha.',
    input_schema: {
      type: 'object' as const,
      properties: {
        docType: {
          type: 'string',
          enum: ['invoice', 'purchase', 'estimate'],
          description: 'Tipo de documento',
        },
        status: { type: 'string', enum: ['pending', 'paid', 'overdue', 'all'] },
        dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
        dateTo: { type: 'string', description: 'YYYY-MM-DD' },
        page: { type: 'string' },
      },
      required: ['docType'],
    },
  },
  {
    name: 'holded_get_document',
    description: 'Obtiene el detalle completo de una factura: líneas, importes, IVA, vencimiento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        docType: { type: 'string', enum: ['invoice', 'purchase', 'estimate'] },
        documentId: { type: 'string' },
      },
      required: ['docType', 'documentId'],
    },
  },
  // Contabilidad
  {
    name: 'holded_get_daily_book',
    description: 'Obtiene los asientos del diario contable en un rango de fechas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
        dateTo: { type: 'string', description: 'YYYY-MM-DD' },
        accountCode: { type: 'string', description: 'Filtrar por cuenta PGC (opcional)' },
      },
      required: ['dateFrom', 'dateTo'],
    },
  },
  {
    name: 'holded_get_chart_of_accounts',
    description: 'Obtiene el plan de cuentas completo de la empresa.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  // Tesorería
  {
    name: 'holded_list_treasury_accounts',
    description: 'Lista las cuentas bancarias y de tesorería con sus saldos.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  // Contactos / CRM
  {
    name: 'holded_list_contacts',
    description: 'Lista clientes y proveedores con búsqueda por nombre, email o NIF.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['client', 'supplier', 'all'] },
        search: { type: 'string' },
        page: { type: 'string' },
      },
    },
  },
  {
    name: 'holded_get_contact',
    description: 'Obtiene el detalle de un contacto: datos fiscales, historial y documentos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string' },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'holded_list_leads',
    description: 'Lista oportunidades y leads del CRM con estado y valor estimado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        funnelId: { type: 'string' },
      },
    },
  },
  // Proyectos
  {
    name: 'holded_list_projects',
    description: 'Lista proyectos activos o archivados con estado y métricas.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'holded_get_project',
    description: 'Obtiene el detalle de un proyecto.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  // Productos
  {
    name: 'holded_list_products',
    description: 'Lista el catálogo de productos con precios y stock.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string' },
      },
    },
  },
  // Empleados
  {
    name: 'holded_list_employees',
    description: 'Lista los empleados del equipo.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

export async function executeHoldedTool(
  toolName: string,
  input: unknown,
  apiKey: string
): Promise<unknown> {
  const client = new HoldedClient(apiKey);
  const p = (input ?? {}) as Record<string, string>;

  switch (toolName) {
    case 'holded_list_documents':
      return client.listDocuments(
        p.docType ?? 'invoice',
        buildParams(p, ['status', 'dateFrom', 'dateTo', 'page'])
      );

    case 'holded_get_document':
      return client.getDocument(p.docType ?? 'invoice', p.documentId);

    case 'holded_get_daily_book':
      return client.getDailyBook(buildParams(p, ['dateFrom', 'dateTo', 'accountCode']));

    case 'holded_get_chart_of_accounts':
      return client.getChartOfAccounts();

    case 'holded_list_treasury_accounts':
      return client.listTreasuryAccounts();

    case 'holded_list_contacts':
      return client.listContacts(buildParams(p, ['type', 'search', 'page']));

    case 'holded_get_contact':
      return client.getContact(p.contactId);

    case 'holded_list_leads':
      return client.listLeads(p.funnelId);

    case 'holded_list_projects':
      return client.listProjects();

    case 'holded_get_project':
      return client.getProject(p.projectId);

    case 'holded_list_products':
      return client.listProducts(buildParams(p, ['search']));

    case 'holded_list_employees':
      return client.listEmployees();

    default:
      throw new Error(`Tool desconocida: ${toolName}`);
  }
}

function buildParams(
  input: Record<string, string>,
  keys: string[]
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const key of keys) {
    if (input[key] != null && input[key] !== '') result[key] = input[key];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
