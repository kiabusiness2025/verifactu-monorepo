"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Download, FileText, Send, TrendingUp } from "lucide-react";

type GlobalStats = {
  total_invoices: number;
  total_expenses: number;
  total_revenue: number;
  total_costs: number;
  profit: number;
  margin: number;
};

type MonthlyData = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export default function AccountingPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("current_month");

  useEffect(() => {
    fetchData();
  }, [period]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounting?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setMonthly(data.monthly);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Contabilidad Global</h1>
        <p className="text-sm text-gray-600">Vista consolidada de todos los tenants</p>
      </div>

      {/* Selector de período */}
      <div className="flex gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        {[
          { value: "current_month", label: "Este mes" },
          { value: "last_3_months", label: "Últimos 3 meses" },
          { value: "current_year", label: "Este año" },
          { value: "all_time", label: "Todo el tiempo" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              period === opt.value
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ingresos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_revenue.toLocaleString()}€
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Gastos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_costs.toLocaleString()}€
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Beneficio</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.profit.toLocaleString()}€
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Margen: {stats.margin.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Documentos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_invoices + stats.total_expenses}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.total_invoices} inv, {stats.total_expenses} exp
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Evolución mensual */}
          {monthly.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Mensual</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600 font-medium">Mes</th>
                      <th className="px-4 py-2 text-right text-gray-600 font-medium">Ingresos</th>
                      <th className="px-4 py-2 text-right text-gray-600 font-medium">Gastos</th>
                      <th className="px-4 py-2 text-right text-gray-600 font-medium">Beneficio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.month} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900 font-medium">{m.month}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {m.revenue.toLocaleString()}€
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {m.expenses.toLocaleString()}€
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 font-medium">
                          {m.profit.toLocaleString()}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="grid gap-3 sm:grid-cols-3">
            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <FileText className="h-4 w-4" />
              Generar Modelos
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Send className="h-4 w-4" />
              Enviar Reportes
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}
