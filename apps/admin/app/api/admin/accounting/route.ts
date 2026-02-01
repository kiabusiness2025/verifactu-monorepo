import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "current_month";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    const now = new Date();
    let startDate: string;
    let endDate: string = now.toISOString().split("T")[0];

    switch (period) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        break;
      case "last_quarter":
      case "last_3_months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          .toISOString()
          .split("T")[0];
        break;
      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        break;
      case "all_time":
        startDate = "2020-01-01";
        break;
      case "custom":
        startDate =
          customFrom ||
          new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
        endDate = customTo || endDate;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
    }

    const [statsData] = await query<{
      total_invoices: number;
      total_revenue: number;
      total_expenses: number;
      total_costs: number;
    }>(
      `SELECT 
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.amount_gross), 0) as total_revenue,
        COUNT(DISTINCT e.id) as total_expenses,
        COALESCE(SUM(e.amount), 0) as total_costs
       FROM tenants t
       LEFT JOIN invoices i ON i.tenant_id = t.id 
         AND i.issue_date >= $1::date 
         AND i.issue_date <= $2::date
         AND i.status IN ('sent', 'paid')
       LEFT JOIN expense_records e ON e.tenant_id = t.id
         AND e.date >= $1::date 
         AND e.date <= $2::date`,
      [startDate, endDate]
    );

    const totals = {
      revenue: parseFloat(String(statsData?.total_revenue || 0)),
      invoices: parseInt(String(statsData?.total_invoices || 0), 10),
      expenses: parseInt(String(statsData?.total_expenses || 0), 10),
      profit:
        parseFloat(String(statsData?.total_revenue || 0)) -
        parseFloat(String(statsData?.total_costs || 0)),
    };

    const monthlyData = await query<{
      month: string;
      revenue: number;
      invoices: number;
    }>(
      `SELECT 
        TO_CHAR(DATE_TRUNC('month', date_series), 'YYYY-MM') as month,
        COALESCE(SUM(i.amount_gross), 0) as revenue,
        COUNT(DISTINCT i.id) as invoices
       FROM (
         SELECT generate_series(
           DATE_TRUNC('month', $1::date),
           DATE_TRUNC('month', $2::date),
           '1 month'::interval
         ) as date_series
       ) months
       LEFT JOIN invoices i ON DATE_TRUNC('month', i.issue_date) = DATE_TRUNC('month', date_series)
         AND i.status IN ('sent', 'paid')
       GROUP BY DATE_TRUNC('month', date_series)
       ORDER BY month DESC`,
      [startDate, endDate]
    );

    const monthly = monthlyData.map((m) => ({
      month: m.month,
      revenue: parseFloat(String(m.revenue || 0)),
      invoices: parseInt(String(m.invoices || 0), 10),
    }));

    const byTenant = await query<{
      tenant_id: string;
      legal_name: string;
      revenue: number;
      invoices: number;
    }>(
      `SELECT 
        t.id as tenant_id,
        COALESCE(t.legal_name, t.name) as legal_name,
        COALESCE(SUM(i.amount_gross), 0) as revenue,
        COUNT(DISTINCT i.id) as invoices
       FROM tenants t
       LEFT JOIN invoices i ON i.tenant_id = t.id
         AND i.issue_date >= $1::date
         AND i.issue_date <= $2::date
         AND i.status IN ('sent', 'paid')
       GROUP BY t.id, t.legal_name, t.name
       ORDER BY revenue DESC
       LIMIT 10`,
      [startDate, endDate]
    );

    return NextResponse.json({
      period: { from: startDate, to: endDate },
      totals,
      monthly,
      byTenant: byTenant.map((row) => ({
        tenantId: row.tenant_id,
        legalName: row.legal_name,
        revenue: parseFloat(String(row.revenue || 0)),
        invoices: parseInt(String(row.invoices || 0), 10),
      })),
    });
  } catch (error) {
    console.error("Error fetching accounting data:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to fetch accounting data" },
      { status: 500 }
    );
  }
}
