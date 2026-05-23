import { prisma } from '@/app/lib/prisma';

export const BANKING_CHAT_TOOLS = [
  {
    name: 'banking_check_connection',
    description:
      'Comprueba si el usuario tiene cuentas bancarias conectadas vía banca abierta (Salt Edge / open banking). Úsalo antes de usar otras herramientas de banca o cuando el usuario pregunte sobre su saldo real.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'banking_list_accounts',
    description:
      'Lista las cuentas bancarias conectadas con sus saldos en tiempo real. Úsalo cuando el usuario pregunte por su saldo bancario, liquidez, cuánto tiene en el banco o en qué cuentas opera.',
    input_schema: {
      type: 'object',
      properties: {
        includeSummary: {
          type: 'boolean',
          description: 'Si true, incluye el saldo total agregado de todas las cuentas.',
        },
      },
    },
  },
  {
    name: 'banking_list_transactions',
    description:
      'Lista los movimientos bancarios reales de las cuentas conectadas. Úsalo cuando el usuario pregunte por cobros recibidos, pagos realizados, gastos del banco o flujo de caja real.',
    input_schema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'ID de la cuenta bancaria. Si no se indica, devuelve de todas las cuentas.',
        },
        fromDate: {
          type: 'string',
          description: 'Fecha inicio YYYY-MM-DD. Por defecto: últimos 30 días.',
        },
        toDate: {
          type: 'string',
          description: 'Fecha fin YYYY-MM-DD. Por defecto: hoy.',
        },
        limit: {
          type: 'number',
          description: 'Máximo de movimientos a devolver (default 50, max 200).',
        },
        onlyIncoming: {
          type: 'boolean',
          description: 'Si true, solo devuelve cobros (amount > 0).',
        },
        onlyOutgoing: {
          type: 'boolean',
          description: 'Si true, solo devuelve pagos (amount < 0).',
        },
      },
    },
  },
  {
    name: 'banking_get_cash_summary',
    description:
      'Devuelve un resumen de tesorería: saldo total disponible, entradas y salidas en un período. Úsalo cuando el usuario pregunte por flujo de caja, liquidez total o cuánto ha entrado y salido en un período.',
    input_schema: {
      type: 'object',
      properties: {
        fromDate: {
          type: 'string',
          description: 'Fecha inicio YYYY-MM-DD. Por defecto: 1 enero del año actual.',
        },
        toDate: {
          type: 'string',
          description: 'Fecha fin YYYY-MM-DD. Por defecto: hoy.',
        },
      },
    },
  },
] as const;

export type BankingToolName = (typeof BANKING_CHAT_TOOLS)[number]['name'];

const BANKING_TOOL_NAMES = new Set<string>(BANKING_CHAT_TOOLS.map((t) => t.name));
export function isBankingToolName(name: string): name is BankingToolName {
  return BANKING_TOOL_NAMES.has(name);
}

type ToolInput = Record<string, unknown>;

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

export async function executeBankingTool(
  tenantId: string,
  toolName: BankingToolName,
  input: ToolInput
): Promise<unknown> {
  try {
    switch (toolName) {
      case 'banking_check_connection': {
        const customer = await prisma.seCustomer
          .findUnique({
            where: { tenantId },
            include: {
              connections: { where: { status: 'active' }, select: { id: true, providerName: true, status: true } },
            },
          })
          .catch(() => null);

        if (!customer) {
          return {
            connected: false,
            message:
              'No hay cuentas bancarias conectadas. El usuario puede conectar su banco desde Workspace > Banca.',
          };
        }

        const accountCount = await prisma.seAccount
          .count({ where: { tenantId, status: 'active' } })
          .catch(() => 0);

        return {
          connected: accountCount > 0,
          activeConnections: customer.connections.length,
          activeAccounts: accountCount,
          providers: customer.connections.map((c) => c.providerName),
        };
      }

      case 'banking_list_accounts': {
        const accounts = await prisma.seAccount.findMany({
          where: { tenantId, status: 'active' },
          include: { connection: { select: { providerName: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        });

        if (accounts.length === 0) {
          return { connected: false, message: 'No hay cuentas bancarias activas.' };
        }

        const mapped = accounts.map((a) => ({
          id: a.id,
          name: a.name,
          nature: a.nature,
          balance: Number(a.balance),
          currency: a.currency,
          iban: a.iban,
          bank: a.connection.providerName,
        }));

        const includeSummary = input.includeSummary !== false;
        const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

        return {
          accounts: mapped,
          count: mapped.length,
          ...(includeSummary ? { totalBalance: Math.round(totalBalance * 100) / 100 } : {}),
        };
      }

      case 'banking_list_transactions': {
        const fromDate = input.fromDate ? String(input.fromDate) : thirtyDaysAgo();
        const toDate = input.toDate ? String(input.toDate) : today();
        const limit = typeof input.limit === 'number' ? Math.min(input.limit, 200) : 50;
        const accountId = input.accountId ? String(input.accountId) : undefined;

        const transactions = await prisma.seTransaction.findMany({
          where: {
            tenantId,
            madeOn: { gte: fromDate, lte: toDate },
            status: 'posted',
            duplicated: false,
            ...(accountId ? { accountId } : {}),
          },
          orderBy: { madeOn: 'desc' },
          take: limit,
          select: {
            id: true,
            madeOn: true,
            amount: true,
            currency: true,
            description: true,
            category: true,
            payee: true,
            payer: true,
            accountId: true,
          },
        });

        const mapped2 = transactions
          .map((tx) => ({ ...tx, amount: Number(tx.amount) }))
          .filter((tx) => {
            if (input.onlyIncoming === true) return tx.amount > 0;
            if (input.onlyOutgoing === true) return tx.amount < 0;
            return true;
          })
          .slice(0, limit);

        return {
          transactions: mapped2,
          count: mapped2.length,
          period: { from: fromDate, to: toDate },
        };
      }

      case 'banking_get_cash_summary': {
        const fromDate = input.fromDate ? String(input.fromDate) : startOfYear();
        const toDate = input.toDate ? String(input.toDate) : today();

        const [accounts, txStats] = await Promise.all([
          prisma.seAccount.findMany({
            where: { tenantId, status: 'active' },
            select: { balance: true, currency: true },
          }),
          prisma.seTransaction.findMany({
            where: {
              tenantId,
              madeOn: { gte: fromDate, lte: toDate },
              status: 'posted',
              duplicated: false,
            },
            select: { amount: true },
          }),
        ]);

        const totalBalance = Math.round(accounts.reduce((s, a) => s + Number(a.balance), 0) * 100) / 100;

        let totalIn = 0;
        let totalOut = 0;
        for (const tx of txStats) {
          const amt = Number(tx.amount);
          if (amt > 0) totalIn += amt;
          else totalOut += Math.abs(amt);
        }

        return {
          totalBalance,
          period: { from: fromDate, to: toDate },
          totalIn: Math.round(totalIn * 100) / 100,
          totalOut: Math.round(totalOut * 100) / 100,
          netCashFlow: Math.round((totalIn - totalOut) * 100) / 100,
          transactionsAnalyzed: txStats.length,
          accountCount: accounts.length,
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
