"use client";

import { formatCurrency, formatPercent } from "@/src/lib/formatters";
import { Calendar, DollarSign, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

export default function AdminContabilidadPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("current_month");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounting?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
        setMonthlyData(data.monthly || []);
      }
    } catch (error) {
      console.error("Error fetching accounting data:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contabilidad Global</h1>
          <p className="text-sm text-gray-600">Vista consolidada de todas las empresas</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Seleccionar periodo de contabilidad"
        >
          <option value="current_month">Mes actual</option>
          <option value="last_3_months">Últimos 3 meses</option>
          <option value="current_year">Año actual</option>
          <option value="all_time">Histórico completo</option>
        </select>
      </header>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando datos contables...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-500">No hay datos disponibles</div>
      ) : (
        <>
          {/* KPIs Principales */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ingresos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.total_revenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stats.total_invoices} facturas</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Gastos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats.total_costs)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stats.total_expenses} gastos</p>
                </div>
                <TrendingDown className="h-10 w-10 text-red-500" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Beneficio</p>
                  <p className={`text-2xl font-bold ${stats.profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(stats.profit)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Margen: {formatPercent(stats.margin)}%</p>
                </div>
                <DollarSign className="h-10 w-10 text-blue-500" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Documentos</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.total_invoices + stats.total_expenses}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total procesados</p>
                </div>
                <FileText className="h-10 w-10 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Evolución mensual */}
          {monthlyData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Evolución Mensual
              </h2>
              <div className="space-y-3">
                {monthlyData.map((month) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700 w-24">
                        {month.month}
                      </span>
                      <div className="flex gap-6 text-sm">
                        <span className="text-green-600">
                          +{formatCurrency(month.revenue)}
                        </span>
                        <span className="text-red-600">
                          -{formatCurrency(month.expenses)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${month.profit >= 0 ? "text-blue-600" : "text-red-600"}`}
                    >
                      {month.profit >= 0 ? "+" : ""}
                      {formatCurrency(month.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="grid gap-4 sm:grid-cols-3">
            <button className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-left hover:bg-blue-100 transition">
              <p className="font-semibold text-blue-900">Exportar Balance</p>
              <p className="text-sm text-blue-700 mt-1">Descargar PDF del periodo</p>
            </button>
            <button className="rounded-xl border border-green-200 bg-green-50 p-4 text-left hover:bg-green-100 transition">
              <p className="font-semibold text-green-900">Generar Modelos</p>
              <p className="text-sm text-green-700 mt-1">303, 390, declaraciones</p>
            </button>
            <button className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-left hover:bg-purple-100 transition">
              <p className="font-semibold text-purple-900">Enviar Informes</p>
              <p className="text-sm text-purple-700 mt-1">Clientes con informe mensual</p>
            </button>
          </div>
        </>
      )}
    </main>
  );
}

