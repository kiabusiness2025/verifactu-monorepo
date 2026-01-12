import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Verificar que el usuario es admin
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "current_month";

    // Calcular fechas según periodo
    const now = new Date();
    let startDate: string;
    let endDate: string = now.toISOString().split("T")[0];

    switch (period) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        break;
      case "last_3_months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0];
        break;
      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        break;
      case "all_time":
        startDate = "2020-01-01";
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    }

    // Stats globales
    const [statsData] = await query<{
      total_invoices: number;
      total_revenue: number;
      total_expenses: number;
      total_costs: number;
    }>(
      `SELECT 
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.total), 0) as total_revenue,
        COUNT(DISTINCT e.id) as total_expenses,
        COALESCE(SUM(e.amount_gross), 0) as total_costs
       FROM tenants t
       LEFT JOIN invoices i ON i.tenant_id = t.id 
         AND i.issue_date >= $1 
         AND i.issue_date <= $2
         AND i.status IN ('sent', 'paid')
       LEFT JOIN expenses e ON e.tenant_id = t.id
         AND e.issue_date >= $1 
         AND e.issue_date <= $2`,
      [startDate, endDate]
    );

    const stats = {
      total_invoices: parseInt(String(statsData?.total_invoices || 0)),
      total_expenses: parseInt(String(statsData?.total_expenses || 0)),
      total_revenue: parseFloat(String(statsData?.total_revenue || 0)),
      total_costs: parseFloat(String(statsData?.total_costs || 0)),
      profit: parseFloat(String(statsData?.total_revenue || 0)) - parseFloat(String(statsData?.total_costs || 0)),
      margin: parseFloat(String(statsData?.total_revenue || 0)) > 0
        ? ((parseFloat(String(statsData?.total_revenue || 0)) - parseFloat(String(statsData?.total_costs || 0))) / parseFloat(String(statsData?.total_revenue || 0))) * 100
        : 0,
    };

    // Datos mensuales (últimos 6 meses)
    const monthlyData = await query<{
      month: string;
      revenue: number;
      expenses: number;
    }>(
      `SELECT 
        TO_CHAR(DATE_TRUNC('month', date_series), 'YYYY-MM') as month,
        COALESCE(SUM(i.total), 0) as revenue,
        COALESCE(SUM(e.amount_gross), 0) as expenses
       FROM (
         SELECT generate_series(
           DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
           DATE_TRUNC('month', CURRENT_DATE),
           '1 month'::interval
         ) as date_series
       ) months
       LEFT JOIN invoices i ON DATE_TRUNC('month', i.issue_date) = DATE_TRUNC('month', date_series)
         AND i.status IN ('sent', 'paid')
       LEFT JOIN expenses e ON DATE_TRUNC('month', e.issue_date) = DATE_TRUNC('month', date_series)
       GROUP BY DATE_TRUNC('month', date_series)
       ORDER BY month DESC`
    );

    const monthly = monthlyData.map((m) => ({
      month: m.month,
      revenue: parseFloat(String(m.revenue || 0)),
      expenses: parseFloat(String(m.expenses || 0)),
      profit: parseFloat(String(m.revenue || 0)) - parseFloat(String(m.expenses || 0)),
    }));

    return NextResponse.json({ ok: true, stats, monthly });
  } catch (error) {
    console.error("Error fetching accounting data:", error);
    
    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to fetch accounting data" },
      { status: 500 }
    );
  }
}
