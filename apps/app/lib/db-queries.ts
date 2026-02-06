import { prisma } from '@/lib/prisma';

// Calcular beneficio de un tenant en un periodo
export async function calculateTenantProfit(
  tenantId: string,
  startDate: string,
  endDate: string
) {
  const [salesData, expensesData] = await Promise.all([
    prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(amount_gross), 0) as total
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND issue_date >= ${startDate}
        AND issue_date <= ${endDate}
        AND status IN ('sent', 'paid')
    `,
    prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(amount * (1 + tax_rate)), 0) as total
      FROM expense_records
      WHERE tenant_id = ${tenantId}
        AND date >= ${startDate}
        AND date <= ${endDate}
    `,
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
  return prisma.$queryRaw<{
    id: string;
    number: string;
    issue_date: string;
    total: string;
    verifactu_status: string | null;
  }[]>`
    SELECT id, number, issue_date, amount_gross as total, verifactu_status
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND status IN ('sent', 'paid')
      AND (verifactu_status IS NULL OR verifactu_status = 'pending')
    ORDER BY issue_date DESC
    LIMIT 10
  `;
}

// Obtener categorías de gastos
export async function getExpenseCategories() {
  return prisma.$queryRaw<{
    id: number;
    code: string;
    name: string;
    is_deductible: boolean;
  }[]>`
    SELECT id, code, name, is_deductible
    FROM expense_categories
    ORDER BY name
  `;
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
  const categories = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name
    FROM expense_categories
    WHERE id = ${data.categoryId}
    LIMIT 1
  `;
  const category = categories[0]?.name || 'Otros gastos';
  const amountNet = Number.isFinite(data.amountNet) ? data.amountNet : data.amountGross;
  const taxRate = amountNet > 0 ? data.amountTax / amountNet : 0;
  const notesParts = [data.source ? `source:${data.source}` : '', data.supplierName ? `proveedor:${data.supplierName}` : '']
    .filter(Boolean)
    .join(' | ');

  const result = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO expense_records (
      tenant_id,
      date,
      description,
      category,
      amount,
      tax_rate,
      account_code,
      reference,
      notes,
      created_at,
      updated_at
    ) VALUES (
      ${data.tenantId},
      ${data.issueDate},
      ${data.description},
      ${category},
      ${amountNet},
      ${taxRate},
      NULL,
      NULL,
      ${notesParts || null},
      NOW(),
      NOW()
    )
    RETURNING id
  `;
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
