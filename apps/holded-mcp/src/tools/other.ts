import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';

// ── Productos e Inventario ───────────────────────────────────────────────────

export function registerProductsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_products',
    'Lista el catálogo de productos y servicios de Holded. ' +
      'Incluye nombre, SKU, precio de venta, % de IVA y stock disponible.',
    {
      page: z.string().optional().describe('Página de resultados'),
    },
    { readOnlyHint: true },
    async (params) => {
      const data = await getClient().listProducts(params as Record<string, string>);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_product',
    'Obtiene el detalle de un producto: precio, coste, stock por almacén, ' +
      'impuestos, descripción y variantes.',
    {
      productId: z.string().describe('ID del producto en Holded'),
    },
    { readOnlyHint: true },
    async ({ productId }) => {
      const data = await getClient().getProduct(productId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_warehouses',
    'Lista los almacenes configurados en Holded con su stock actual.',
    {},
    { readOnlyHint: true },
    async () => {
      const data = await getClient().listWarehouses();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

// ── Proyectos y Tareas ───────────────────────────────────────────────────────

export function registerProjectsTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_projects',
    'Lista todos los proyectos de Holded con su estado, cliente asociado, ' +
      'presupuesto y fechas. Útil para ver el estado general de la cartera de proyectos.',
    {},
    { readOnlyHint: true },
    async () => {
      const data = await getClient().listProjects();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_project',
    'Obtiene el detalle de un proyecto: descripción, miembros del equipo, ' +
      'horas registradas, estado de tareas y facturación asociada.',
    {
      projectId: z.string().describe('ID del proyecto en Holded'),
    },
    { readOnlyHint: true },
    async ({ projectId }) => {
      const data = await getClient().getProject(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_project_tasks',
    'Lista todas las tareas de un proyecto con su estado, responsable y fechas.',
    {
      projectId: z.string().describe('ID del proyecto'),
    },
    { readOnlyHint: true },
    async ({ projectId }) => {
      const data = await getClient().listTasks(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'list_time_records',
    'Lista los registros de tiempo imputados a un proyecto. ' +
      'Útil para calcular rentabilidad o preparar facturas por horas.',
    {
      projectId: z.string().describe('ID del proyecto'),
    },
    { readOnlyHint: true },
    async ({ projectId }) => {
      const data = await getClient().listTimeRecords(projectId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

// ── Contabilidad ─────────────────────────────────────────────────────────────

export function registerAccountingTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'get_chart_of_accounts',
    'Obtiene el plan contable completo de la empresa en Holded: ' +
      'cuentas, subcuentas, saldos y naturaleza (activo, pasivo, ingreso, gasto).',
    {},
    { readOnlyHint: true },
    async () => {
      const data = await getClient().getChartOfAccounts();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_journal',
    'Obtiene los asientos del libro diario contable. ' +
      'Filtra por rango de fechas para analizar periodos concretos. ' +
      'Las fechas van en Unix timestamp.',
    {
      starttmp: z.string().optional().describe('Fecha inicio Unix timestamp'),
      endtmp: z.string().optional().describe('Fecha fin Unix timestamp'),
      page: z.string().optional().describe('Página de resultados'),
    },
    { readOnlyHint: true },
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      ) as Record<string, string>;
      const data = await getClient().getJournal(filtered);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_daily_book',
    'Obtiene el libro de registro diario (ventas, compras, gastos). ' +
      'Ideal para revisar la situación de IVA liquidado y pendiente.',
    {
      starttmp: z.string().optional().describe('Fecha inicio Unix timestamp'),
      endtmp: z.string().optional().describe('Fecha fin Unix timestamp'),
    },
    { readOnlyHint: true },
    async (params) => {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      ) as Record<string, string>;
      const data = await getClient().getDailyBook(filtered);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

// ── Equipo ────────────────────────────────────────────────────────────────────

export function registerTeamTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_employees',
    'Lista los empleados activos de la empresa en Holded: ' +
      'nombre, cargo, email y proyectos asignados.',
    {},
    { readOnlyHint: true },
    async () => {
      const data = await getClient().listEmployees();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_employee',
    'Obtiene el perfil detallado de un empleado: datos de contacto, ' +
      'departamento, tareas y horas registradas.',
    {
      employeeId: z.string().describe('ID del empleado en Holded'),
    },
    { readOnlyHint: true },
    async ({ employeeId }) => {
      const data = await getClient().getEmployee(employeeId);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}

// ── Tesorería ─────────────────────────────────────────────────────────────────

export function registerTreasuryTools(server: McpServer, getClient: () => HoldedClient) {
  server.tool(
    'list_treasury_accounts',
    'Lista las cuentas de tesorería (bancos y cajas) de Holded con su saldo actual.',
    {},
    { readOnlyHint: true },
    async () => {
      const data = await getClient().listTreasuryAccounts();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
