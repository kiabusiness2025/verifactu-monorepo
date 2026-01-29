"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet, type AccountingData } from "@/lib/adminApi";
import { formatCurrency, formatNumber } from "@/src/lib/formatters";

type PeriodOption = "current_month" | "last_quarter" | "custom";

export default function AdminAccountingPage() {
  const [period, setPeriod] = useState<PeriodOption>("current_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", period);
    if (period === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return params.toString();
  }, [period, from, to]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await adminGet<AccountingData>(`/api/admin/accounting?${query}`);
        if (mounted) setData(res);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Contabilidad global</h1>
        <p className="text-sm text-slate-600">
          KPIs y ranking por empresa para el periodo seleccionado.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {[
          { value: "current_month", label: "Este mes" },
          { value: "last_quarter", label: "Ultimo trimestre" },
          { value: "custom", label: "Rango personalizado" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value as PeriodOption)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              period === opt.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando contabilidad...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Ingresos</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {formatCurrency(data.totals.revenue)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Facturas</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {formatNumber(data.totals.invoices)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Gastos</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {formatCurrency(data.totals.expenses)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Beneficio</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {formatCurrency(data.totals.profit)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Ingresos mensuales
            </h2>
            <div className="mt-4 space-y-2">
              {data.monthly.map((row) => (
                <div key={row.month} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-slate-500">{row.month}</div>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{
                        width: `${Math.min(
                          100,
                          row.revenue === 0 ? 0 : (row.revenue / data.totals.revenue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="w-28 text-right text-xs text-slate-600">
                    {formatCurrency(row.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Top empresas por facturacion
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Empresa</th>
                    <th className="px-3 py-2 text-right">Ingresos</th>
                    <th className="px-3 py-2 text-right">Facturas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.byTenant?.map((row) => (
                    <tr key={row.tenantId}>
                      <td className="px-3 py-2 text-slate-700">{row.legalName}</td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {formatNumber(row.invoices)}
                      </td>
                    </tr>
                  ))}
                  {!data.byTenant?.length && (
                    <tr>
                      <td className="px-3 py-4 text-center text-slate-500" colSpan={3}>
                        Sin datos para el periodo seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
