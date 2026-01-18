"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGet, type AccountingData } from "@/lib/adminApi";
import { formatCurrency, formatNumber, formatTime } from "@/src/lib/formatters";
import { TrendingUp, TrendingDown, Users, Building, DollarSign } from "lucide-react";

type OverviewTotals = AccountingData["totals"];

export default function AdminDashboardPage() {
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
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Usuarios</p>
                <p className="text-2xl font-bold text-slate-900">1,234</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              <span className="text-green-600">+12% este mes</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Empresas</p>
                <p className="text-2xl font-bold text-slate-900">456</p>
              </div>
              <Building className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              <span className="text-green-600">+8% este mes</span>
            </div>
          </div>

          {totals && (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Ingresos</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.revenue || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Este periodo
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Beneficio</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.profit || 0)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Margen:{" "}
                  {totals.revenue
                    ? (
                        (((totals.revenue - totals.expenses) /
                          totals.revenue) *
                          100)
                      ).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Acciones Rápidas
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/admin/companies/new"
            className="rounded-xl bg-gradient-to-r from-[#0b6cfb] to-[#2bb2ff] px-4 py-4 text-sm font-semibold text-white shadow-sm hover:from-[#0a5be0] hover:to-[#1ca3ef] text-center"
          >
            + Crear empresa
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="rounded-xl border-2 border-[#0b6cfb] px-4 py-4 text-sm font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/10 text-center"
          >
            Ver todos los usuarios
          </Link>
          <Link
            href="/dashboard/admin/emails"
            className="rounded-xl border-2 border-purple-500 px-4 py-4 text-sm font-semibold text-purple-600 hover:bg-purple-50 text-center"
          >
            Revisar correos
          </Link>
        </div>
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

