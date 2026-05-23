import { prisma } from '@/app/lib/prisma';
import { ChiftErpClient } from './chift-erp-client';

export const CHIFT_CHAT_TOOLS = [
  {
    name: 'chift_check_connection',
    description:
      'Comprueba si el usuario tiene un ERP conectado vía Chift (Sage, Xero, QuickBooks, Cegid u otros). Úsalo cuando el usuario pregunte sobre su ERP o antes de intentar usar otras herramientas de Chift si no estás seguro de si está conectado.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'chift_list_invoices',
    description:
      'Lista facturas de venta o de compra desde el ERP conectado vía Chift. Úsalo cuando el usuario pregunte por facturas, ventas o gastos en su ERP (Sage, Xero, QuickBooks, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['invoice', 'purchase'],
          description: 'Tipo de documento. invoice=factura de venta, purchase=factura de compra.',
        },
        from: { type: 'string', description: 'Fecha inicio YYYY-MM-DD.' },
        to: { type: 'string', description: 'Fecha fin YYYY-MM-DD.' },
        limit: { type: 'number', description: 'Máximo de facturas a devolver (default 50, max 100).' },
      },
    },
  },
  {
    name: 'chift_get_invoice',
    description: 'Obtiene el detalle completo (líneas, impuestos, contacto) de una factura del ERP conectado vía Chift.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'ID de la factura en el ERP.' },
        type: {
          type: 'string',
          enum: ['invoice', 'purchase'],
          description: 'Tipo de factura (default: invoice).',
        },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'chift_list_contacts',
    description: 'Lista clientes y proveedores desde el ERP conectado vía Chift.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Máximo de contactos a devolver (default 50).' },
      },
    },
  },
  {
    name: 'chift_get_pnl',
    description:
      'Calcula el P&L (ingresos, gastos, resultado bruto) del ERP conectado a partir de sus asientos contables. Úsalo cuando el usuario pregunte por beneficio, margen o resultado contable y tenga un ERP distinto de Holded.',
    input_schema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Fecha inicio YYYY-MM-DD. Por defecto: 1 enero del año actual.',
        },
        to: {
          type: 'string',
          description: 'Fecha fin YYYY-MM-DD. Por defecto: hoy.',
        },
      },
    },
  },
] as const;

export type ChiftToolName = (typeof CHIFT_CHAT_TOOLS)[number]['name'];

const CHIFT_TOOL_NAMES = new Set<string>(CHIFT_CHAT_TOOLS.map((t) => t.name));
export function isChiftToolName(name: string): name is ChiftToolName {
  return CHIFT_TOOL_NAMES.has(name);
}

type ToolInput = Record<string, unknown>;

async function getChiftConsumerId(tenantId: string): Promise<string | null> {
  const conn = await prisma.externalConnection
    .findFirst({
      where: { tenantId, provider: 'chift', connectionStatus: { not: 'disconnected' } },
      select: { providerAccountId: true },
    })
    .catch(() => null);
  return conn?.providerAccountId ?? null;
}

export async function executeChiftTool(
  tenantId: string,
  toolName: ChiftToolName,
  input: ToolInput
): Promise<unknown> {
  try {
    if (toolName === 'chift_check_connection') {
      const conn = await prisma.externalConnection
        .findFirst({
          where: { tenantId, provider: 'chift', connectionStatus: { not: 'disconnected' } },
          select: {
            connectionStatus: true,
            providerAccountId: true,
            companyIdentityJson: true,
            connectedAt: true,
          },
        })
        .catch(() => null);
      if (!conn?.providerAccountId) {
        return {
          connected: false,
          message:
            'No hay ningún ERP conectado vía Chift. El usuario puede conectar desde Workspace > Conectores.',
        };
      }
      const identity = conn.companyIdentityJson as Record<string, unknown> | null;
      return {
        connected: true,
        status: conn.connectionStatus,
        companyName: identity?.name ?? null,
        companyVat: identity?.vat ?? null,
        currency: identity?.currency ?? null,
        connectedAt: conn.connectedAt?.toISOString() ?? null,
      };
    }

    const consumerId = await getChiftConsumerId(tenantId);
    if (!consumerId) {
      return { error: 'not_connected', message: 'No hay ningún ERP conectado vía Chift.' };
    }

    const client = new ChiftErpClient(consumerId);

    switch (toolName) {
      case 'chift_list_invoices': {
        const invoices = await client.listInvoices({
          type: input.type === 'purchase' ? 'purchase' : 'invoice',
          from: input.from ? String(input.from) : undefined,
          to: input.to ? String(input.to) : undefined,
          limit: typeof input.limit === 'number' ? Math.min(input.limit, 100) : 50,
        });
        return { invoices: invoices.slice(0, 50), count: invoices.length };
      }

      case 'chift_get_invoice': {
        const invoiceId = String(input.invoiceId ?? '');
        if (!invoiceId) return { error: 'missing_invoice_id' };
        const inv = await client.getInvoice(
          invoiceId,
          input.type === 'purchase' ? 'purchase' : 'invoice'
        );
        return inv ?? { error: 'not_found' };
      }

      case 'chift_list_contacts': {
        const contacts = await client.listContacts();
        const limit = typeof input.limit === 'number' ? Math.min(input.limit, 100) : 50;
        return { contacts: contacts.slice(0, limit), count: contacts.length };
      }

      case 'chift_get_pnl': {
        const now = new Date();
        const from = input.from ? String(input.from) : `${now.getFullYear()}-01-01`;
        const to = input.to ? String(input.to) : now.toISOString().slice(0, 10);

        const entries = await client.listAccountEntries({ from, to });

        let income = 0;
        let expenses = 0;

        for (const e of entries) {
          const acc = e.account.toLowerCase();
          // PGC Spanish: 7xx = income, 6xx = expense.
          // English fallback: common keywords for international ERPs.
          const isIncome =
            /^7/.test(e.account) ||
            acc.includes('sales') ||
            acc.includes('revenue') ||
            acc.includes('income') ||
            acc.includes('ingreso') ||
            acc.includes('venta');
          const isExpense =
            /^6/.test(e.account) ||
            acc.includes('cost') ||
            acc.includes('expense') ||
            acc.includes('gasto') ||
            acc.includes('compra') ||
            acc.includes('purchase');

          if (isIncome) income += e.credit - e.debit;
          if (isExpense) expenses += Math.abs(e.debit - e.credit);
        }

        const grossProfit = income - expenses;
        const margin = income > 0 ? Math.round((grossProfit / income) * 10000) / 100 : null;

        return {
          period: { from, to },
          income: Math.round(income * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          margin,
          entriesProcessed: entries.length,
        };
      }

      default:
        return { error: 'unknown_tool' };
    }
  } catch (err) {
    return {
      error: 'tool_execution_failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
