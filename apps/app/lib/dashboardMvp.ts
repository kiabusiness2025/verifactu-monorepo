import { apiClient } from "./apiClient";

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
  // Si el backend está accesible, lo comprobamos sin mostrarlo en UI.
  // Si no lo está, seguimos con datos de ejemplo.
  try {
    await apiClient.getHealth();
  } catch {
    // noop
  }

  const kpis: DashboardKpis = {
    salesEur: 48230,
    expensesEur: 36900,
    profitEur: 11330,
  };

  return {
    kpis,
    activity: [
      { title: "Factura enviada", time: "Hoy · 09:30", tone: "ok" },
      { title: "Nuevos gastos añadidos", time: "Hoy · 08:10" },
      { title: "Recordatorio preparado", time: "Ayer · 18:05", tone: "ok" },
      { title: "Gasto marcado para revisar", time: "Ayer · 16:40", tone: "warn" },
    ],
    deadlines: [
      { name: "IVA trimestral", dateLabel: "22 ene" },
      { name: "Resumen anual", dateLabel: "30 ene" },
      { name: "Vencimiento de cobro", dateLabel: "05 feb" },
    ],
  };
}
