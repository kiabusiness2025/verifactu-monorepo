import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

export const READ_ONLY_TOOL_NAMES = [
  'list_documents',
  'get_document',
  'get_document_pdf',
  'list_contacts',
  'get_contact',
  'list_crm_funnels',
  'list_leads',
  'list_products',
  'get_product',
  'list_products_stock',
  'list_warehouses',
  'list_taxes',
  'list_numbering_series',
  'list_projects',
  'get_project',
  'list_project_tasks',
  'list_time_records',
  'get_chart_of_accounts',
  'get_journal',
  'get_daily_book',
  'list_employees',
  'get_employee',
  'list_treasury_accounts',
] as const;

export const WRITE_TOOL_NAMES = ['create_invoice_draft'] as const;

export const PRODUCTION_TOOL_NAMES = [...READ_ONLY_TOOL_NAMES, ...WRITE_TOOL_NAMES] as const;

/**
 * Annotation base compartida. Cada tool se registra con su propia copia que
 * añade el campo `title` exigido por Anthropic Connectors Directory:
 *   "Every tool must include a title and the applicable hint."
 *   — https://claude.com/docs/connectors/building/review-criteria
 */
export const READ_ONLY_TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const CREATE_INVOICE_DRAFT_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/**
 * Títulos legibles por humano para cada tool. Sirven para que el panel de
 * permisos de Claude muestre algo más descriptivo que el snake_case del
 * nombre técnico.
 */
export const TOOL_TITLES: Record<(typeof PRODUCTION_TOOL_NAMES)[number], string> = {
  list_documents: 'List Holded documents',
  get_document: 'Get Holded document',
  get_document_pdf: 'Get Holded document PDF',
  list_contacts: 'List Holded contacts',
  get_contact: 'Get Holded contact',
  list_crm_funnels: 'List Holded CRM funnels',
  list_leads: 'List Holded CRM leads',
  list_products: 'List Holded products',
  get_product: 'Get Holded product',
  list_products_stock: 'List Holded product stock',
  list_warehouses: 'List Holded warehouses',
  list_taxes: 'List Holded taxes',
  list_numbering_series: 'List Holded numbering series',
  list_projects: 'List Holded projects',
  get_project: 'Get Holded project',
  list_project_tasks: 'List Holded project tasks',
  list_time_records: 'List Holded project time records',
  get_chart_of_accounts: 'Get Holded chart of accounts',
  get_journal: 'Get Holded journal entries',
  get_daily_book: 'Get Holded daily book',
  list_employees: 'List Holded employees',
  get_employee: 'Get Holded employee',
  list_treasury_accounts: 'List Holded treasury accounts',
  create_invoice_draft: 'Create Holded draft invoice',
};

/**
 * Builder que devuelve las annotations completas con `title` incluido para
 * una tool concreta. Usar siempre este builder en lugar de pasar
 * READ_ONLY_TOOL_ANNOTATIONS directamente.
 */
export function readOnlyAnnotations(
  toolName: (typeof PRODUCTION_TOOL_NAMES)[number]
): ToolAnnotations {
  return { ...READ_ONLY_TOOL_ANNOTATIONS, title: TOOL_TITLES[toolName] };
}

export function writeAnnotations(
  toolName: (typeof PRODUCTION_TOOL_NAMES)[number]
): ToolAnnotations {
  return { ...CREATE_INVOICE_DRAFT_ANNOTATIONS, title: TOOL_TITLES[toolName] };
}

export const TOOL_HUMAN_DESCRIPTIONS: Record<(typeof PRODUCTION_TOOL_NAMES)[number], string> = {
  list_documents: 'Lista documentos de Holded como facturas, presupuestos, pedidos y albaranes.',
  get_document: 'Obtiene el detalle completo de un documento concreto de Holded.',
  get_document_pdf: 'Devuelve el PDF de un documento concreto en base64.',
  list_contacts: 'Lista clientes, proveedores y otros contactos disponibles en Holded.',
  get_contact: 'Obtiene el detalle completo de un contacto concreto.',
  list_crm_funnels: 'Lista los funnels del CRM configurados en Holded.',
  list_leads: 'Lista oportunidades o leads del CRM, opcionalmente filtrados por funnel.',
  list_products: 'Lista productos y servicios del catalogo de Holded.',
  get_product: 'Obtiene el detalle de un producto concreto.',
  list_products_stock: 'Lista los niveles de stock actuales por producto y almacen.',
  list_warehouses: 'Lista almacenes (no stock; usar list_products_stock para stock).',
  list_taxes: 'Lista los impuestos (IVA y otros) configurados en Holded.',
  list_numbering_series: 'Lista las series numericas configuradas en Holded.',
  list_projects: 'Lista proyectos de Holded con su estado general.',
  get_project: 'Obtiene el detalle completo de un proyecto.',
  list_project_tasks: 'Lista tareas de un proyecto.',
  list_time_records: 'Lista registros de tiempo asociados a un proyecto.',
  get_chart_of_accounts: 'Obtiene el plan contable de la empresa.',
  get_journal: 'Obtiene los asientos del libro diario en un rango de fechas.',
  get_daily_book: 'Obtiene el libro diario o registro diario contable.',
  list_employees: 'Lista empleados activos disponibles en Holded.',
  get_employee: 'Obtiene el detalle de un empleado concreto.',
  list_treasury_accounts: 'Lista cuentas de tesoreria con su saldo actual.',
  create_invoice_draft:
    'Crea un borrador de factura solo en estado draft (approveDoc=false forzado) para revision posterior en Holded.',
};

export const NON_GOALS = [
  'No money movement',
  'No crypto',
  'No payment execution',
  'No destructive operations',
  'No cross-service automation',
] as const;
