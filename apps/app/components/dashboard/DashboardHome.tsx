"use client";

import React from "react";
import { IsaakGreetingCard } from "@/components/isaak/IsaakGreetingCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { InsightTicker } from "@/components/dashboard/InsightTicker";
import { useDataMode } from "@/src/lib/data/useDataMode";
import { formatCurrency } from "@/src/lib/formatters";
import { BarChart3, LineChart, Plus, Settings2, Trash2 } from "lucide-react";

type MetricBlock = {
  sales: number;
  expenses: number;
  profit: number;
  tax: number;
};

type MetricsByPeriod = {
  currentMonth: MetricBlock;
  currentYear: MetricBlock;
  previousYear: MetricBlock;
};

type WidgetPeriod = "currentMonth" | "currentYear" | "previousYear";
type WidgetType = "profit" | "sales" | "expenses" | "tax";

type DashboardWidget = {
  id: string;
  label: string;
  type: WidgetType;
  period: WidgetPeriod;
};

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "w_profit_month", label: "Beneficio mes", type: "profit", period: "currentMonth" },
  { id: "w_sales_month", label: "Facturado mes", type: "sales", period: "currentMonth" },
  { id: "w_expenses_month", label: "Gastado mes", type: "expenses", period: "currentMonth" },
  { id: "w_profit_year", label: "Beneficio año", type: "profit", period: "currentYear" },
];

const PERIOD_LABEL: Record<WidgetPeriod, string> = {
  currentMonth: "Este mes",
  currentYear: "Este año",
  previousYear: "Ejercicio pasado",
};

const TYPE_LABEL: Record<WidgetType, string> = {
  sales: "Facturado",
  expenses: "Gasto",
  profit: "Beneficio",
  tax: "IVA estimado",
};

export function DashboardHome({
  metricsByPeriod,
}: {
  metricsByPeriod: MetricsByPeriod;
  demoMode?: boolean;
}) {
  const dataMode = useDataMode();
  const isDemo = dataMode === "demo";
  const [widgets, setWidgets] = React.useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [editingWidgets, setEditingWidgets] = React.useState(false);
  const [widgetDraft, setWidgetDraft] = React.useState<DashboardWidget>({
    id: "draft",
    label: "Nuevo panel",
    type: "profit",
    period: "currentMonth",
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("vf_dashboard_widgets");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DashboardWidget[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setWidgets(parsed);
      }
    } catch {
      // ignore malformed config
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("vf_dashboard_widgets", JSON.stringify(widgets));
  }, [widgets]);

  const widgetCards = widgets.map((widget) => {
    const periodMetrics = metricsByPeriod[widget.period];
    const value = periodMetrics[widget.type];
    return {
      ...widget,
      value,
    };
  });

  const currentYear = metricsByPeriod.currentYear;
  const previousYear = metricsByPeriod.previousYear;
  const compareDenominator = Math.abs(previousYear.profit) > 0 ? Math.abs(previousYear.profit) : 1;
  const yoyProfitPct = ((currentYear.profit - previousYear.profit) / compareDenominator) * 100;
  const yearScale = Math.max(
    currentYear.sales,
    currentYear.expenses,
    previousYear.sales,
    previousYear.expenses,
    1
  );

  function addWidget() {
    const id = `w_${Date.now()}`;
    setWidgets((prev) => [...prev, { ...widgetDraft, id }]);
  }

  function removeWidget(id: string) {
    setWidgets((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-8">
      <IsaakGreetingCard />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Acciones
            </h2>
            {isDemo && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Demo
              </span>
            )}
          </div>
          <span className="rounded-full bg-[#0b6cfb]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0b6cfb]">
            Hoy
          </span>
        </div>
        <QuickActions isDemo={isDemo} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Resumen configurable
          </h2>
          <button
            type="button"
            onClick={() => setEditingWidgets((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {editingWidgets ? "Cerrar edición" : "Editar paneles"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {widgetCards.map((widget) => (
            <div key={widget.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {widget.label}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {TYPE_LABEL[widget.type]} · {PERIOD_LABEL[widget.period]}
                  </div>
                </div>
                {editingWidgets ? (
                  <button
                    type="button"
                    onClick={() => removeWidget(widget.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="mt-3 text-2xl font-semibold text-[#0b214a]">{formatCurrency(widget.value)}</div>
            </div>
          ))}
        </div>

        {editingWidgets ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-2 md:grid-cols-3">
              <input
                value={widgetDraft.label}
                onChange={(e) => setWidgetDraft((prev) => ({ ...prev, label: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre del panel"
              />
              <select
                value={widgetDraft.type}
                onChange={(e) =>
                  setWidgetDraft((prev) => ({ ...prev, type: e.target.value as WidgetType }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="profit">Beneficio</option>
                <option value="sales">Facturado</option>
                <option value="expenses">Gasto</option>
                <option value="tax">IVA estimado</option>
              </select>
              <select
                value={widgetDraft.period}
                onChange={(e) =>
                  setWidgetDraft((prev) => ({ ...prev, period: e.target.value as WidgetPeriod }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="currentMonth">Este mes</option>
                <option value="currentYear">Este año</option>
                <option value="previousYear">Ejercicio pasado</option>
              </select>
            </div>
            <button
              type="button"
              onClick={addWidget}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0b6cfb] px-3 py-2 text-xs font-semibold text-white hover:bg-[#095edb]"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir panel
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <LineChart className="h-4 w-4 text-[#0b6cfb]" />
              Comparativa anual (facturado vs gastado)
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "Facturado año", value: currentYear.sales, color: "bg-[#0b6cfb]" },
                { label: "Gasto año", value: currentYear.expenses, color: "bg-[#ff8a3d]" },
                { label: "Facturado año pasado", value: previousYear.sales, color: "bg-[#8db5ff]" },
                { label: "Gasto año pasado", value: previousYear.expenses, color: "bg-[#ffc28f]" },
              ].map((bar) => {
                const width = Math.max(4, Math.round((bar.value / yearScale) * 100));
                return (
                  <div key={bar.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{bar.label}</span>
                      <span>{formatCurrency(bar.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${bar.color}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Beneficio: este año vs ejercicio pasado
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Este año</div>
                <div className="mt-1 text-xl font-semibold text-[#0b214a]">
                  {formatCurrency(currentYear.profit)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Ejercicio pasado</div>
                <div className="mt-1 text-xl font-semibold text-[#0b214a]">
                  {formatCurrency(previousYear.profit)}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <span className="text-slate-500">Variación anual:</span>{" "}
              <span className={`font-semibold ${yoyProfitPct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {yoyProfitPct >= 0 ? "+" : ""}
                {yoyProfitPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Estado
            </h2>
            {isDemo && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Demo
              </span>
            )}
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Metrics
          </span>
        </div>
        <DashboardStats />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Avisos
            </h2>
            {isDemo && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Demo
              </span>
            )}
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Prioridad
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-1">
          <InsightTicker />
        </div>
      </section>
    </div>
  );
}
