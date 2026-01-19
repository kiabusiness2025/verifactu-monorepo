"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGet, type AccountingData } from "@/lib/adminApi";
import { formatCurrency, formatNumber, formatTime } from "@/src/lib/formatters";
import { TrendingUp, TrendingDown, Users, Building, DollarSign } from "lucide-react";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

type OverviewTotals = AccountingData["totals"];

export default function AdminDashboardPageAlternative() {
  const [totals, setTotals] = useState<OverviewTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await adminGet<AccountingData>(
          "/api/admin/accounting?period=current_month"
        );
        if (mounted) {
          setTotals(data.totals);
          setStatus("ok");
          setLastCheckedAt(formatTime(new Date()));
        }
      } catch (error) {
        if (mounted) {
          setStatus("error");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Estadísticas Rápidas
        </h2>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : status === "error" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Error cargando estadísticas
          </div>
        ) : (
          totals && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Ingresos
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.revenue || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Gastos
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.expenses || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <Building className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Beneficio
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.profit || 0)}
                    </p>
                    {totals.revenue && (
                      <p className="text-xs text-slate-500 mt-1">
                        {(
                          (((totals.revenue - totals.expenses) /
                            totals.revenue) *
                            100) || 0
                        ).toFixed(1)}
                        %
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Facturas
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(totals.invoices || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Last Updated */}
      {lastCheckedAt && (
        <div className="text-right text-xs text-slate-500">
          Última actualización: {lastCheckedAt}
        </div>
      )}
    </div>
  );
}
