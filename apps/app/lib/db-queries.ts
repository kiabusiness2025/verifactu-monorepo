import { Pool } from 'pg';

// Singleton connection pool
let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Calcular beneficio de un tenant en un periodo
export async function calculateTenantProfit(
  tenantId: string,
  startDate: string,
  endDate: string
) {
  const [salesData, expensesData] = await Promise.all([
    query<{ total: string }>(
      `SELECT COALESCE(SUM(total), 0) as total 
       FROM invoices 
       WHERE tenant_id = $1 
         AND issue_date >= $2 
         AND issue_date <= $3 
         AND status IN ('sent', 'paid')`,
      [tenantId, startDate, endDate]
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(amount_gross), 0) as total 
       FROM expenses 
       WHERE tenant_id = $1 
         AND issue_date >= $2 
         AND issue_date <= $3`,
      [tenantId, startDate, endDate]
    ),
  ]);

  const sales = parseFloat(salesData[0]?.total || '0');
  const expenses = parseFloat(expensesData[0]?.total || '0');
  const profit = sales - expenses;
  const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : '0';

  return {
    sales,
    expenses,
    profit,
    margin: parseFloat(margin),
  };
}

// Obtener facturas pendientes de enviar a VeriFactu
export async function getPendingVeriFactuInvoices(tenantId: string) {
  return query<{
    id: string;
    number: string;
    issue_date: string;
    total: string;
    verifactu_status: string | null;
  }>(
    `SELECT id, number, issue_date, total, verifactu_status
     FROM invoices
     WHERE tenant_id = $1
       AND status IN ('sent', 'paid')
       AND (verifactu_status IS NULL OR verifactu_status = 'pending')
     ORDER BY issue_date DESC
     LIMIT 10`,
    [tenantId]
  );
}

// Obtener categorías de gastos
export async function getExpenseCategories() {
  return query<{
    id: number;
    code: string;
    name: string;
    is_deductible: boolean;
  }>(
    `SELECT id, code, name, is_deductible
     FROM expense_categories
     ORDER BY name`
  );
}

// Insertar gasto con categoría sugerida
export async function createExpense(data: {
  tenantId: string;
  categoryId: number;
  supplierName: string;
  amountGross: number;
  amountTax: number;
  amountNet: number;
  issueDate: string;
  description: string;
  source: string;
}) {
  const result = await query<{ id: string }>(
    `INSERT INTO expenses (
      tenant_id, category_id, supplier_name, 
      amount_gross, amount_tax, amount_net,
      issue_date, invoice_number, source
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      data.tenantId,
      data.categoryId,
      data.supplierName,
      data.amountGross,
      data.amountTax,
      data.amountNet,
      data.issueDate,
      data.description,
      data.source,
    ]
  );
  return result[0];
}

// Obtener resumen del mes actual
export async function getCurrentMonthSummary(tenantId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  return calculateTenantProfit(tenantId, startOfMonth, endOfMonth);
}
