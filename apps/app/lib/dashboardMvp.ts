import { apiClient, DashboardSummaryResponse } from "./apiClient";

export type DashboardKpis = {
  salesEur: number;
  expensesEur: number;
  profitEur: number;
};

export type DashboardActivityItem = {
  title: string;
  time: string;
  tone?: "ok" | "warn";
};

export type DashboardDeadlineItem = {
  name: string;
  dateLabel: string;
};

export type DashboardMvpData = {
  kpis: DashboardKpis;
  activity: DashboardActivityItem[];
  deadlines: DashboardDeadlineItem[];
};

export async function getDashboardMvpData(): Promise<DashboardMvpData> {
  const fallback: DashboardMvpData = {
    kpis: {
      salesEur: 0,
      expensesEur: 0,
      profitEur: 0,
    },
    activity: [],
    deadlines: [],
  };

  let response: DashboardSummaryResponse | null = null;
  try {
    response = await apiClient.getDashboardSummary("this_month");
  } catch {
    return fallback;
  }

  if (!response) {
    return fallback;
  }

  const totals = response.totals || null;
  const hasTotals =
    totals &&
    typeof totals.sales === "number" &&
    typeof totals.expenses === "number" &&
    typeof totals.profit === "number";

  const kpis: DashboardKpis = hasTotals
    ? {
        salesEur: totals.sales!,
        expensesEur: totals.expenses!,
        profitEur: totals.profit!,
      }
    : fallback.kpis;

  const activity = Array.isArray(response.activity) ? response.activity : fallback.activity;
  const deadlines = Array.isArray(response.deadlines) ? response.deadlines : fallback.deadlines;

  return { kpis, activity, deadlines };
}
