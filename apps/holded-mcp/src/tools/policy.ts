import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

export const READ_ONLY_TOOL_NAMES = [
  'list_documents',
  'get_document',
  'list_contacts',
  'get_contact',
  'list_crm_funnels',
  'list_leads',
  'list_products',
  'get_product',
  'list_warehouses',
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

export const TOOL_HUMAN_DESCRIPTIONS: Record<(typeof PRODUCTION_TOOL_NAMES)[number], string> = {
  list_documents: 'Lista documentos de Holded como facturas, presupuestos, pedidos y albaranes.',
  get_document: 'Obtiene el detalle completo de un documento concreto de Holded.',
  list_contacts: 'Lista clientes, proveedores y otros contactos disponibles en Holded.',
  get_contact: 'Obtiene el detalle completo de un contacto concreto.',
  list_crm_funnels: 'Lista los funnels del CRM configurados en Holded.',
  list_leads: 'Lista oportunidades o leads del CRM, opcionalmente filtrados por funnel.',
  list_products: 'Lista productos y servicios del catalogo de Holded.',
  get_product: 'Obtiene el detalle de un producto concreto.',
  list_warehouses: 'Lista almacenes y stock disponible.',
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
    'Crea un borrador de factura solo en estado draft para revision posterior en Holded.',
};

export const NON_GOALS = [
  'No money movement',
  'No crypto',
  'No payment execution',
  'No destructive operations',
  'No cross-service automation',
] as const;
