"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGet, type AccountingData } from "@/lib/adminApi";

type OverviewTotals = AccountingData["totals"];

export default function AdminDashboardPage() {
  const [totals, setTotals] = useState<OverviewTotals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await adminGet<AccountingData>("/api/admin/accounting?period=current_month");
        if (mounted) setTotals(data.totals);
      } catch (error) {
        console.error("Admin overview error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Admin overview</h1>
        <p className="text-sm text-slate-600">
          KPIs principales y accesos rapidos a usuarios, empresas y contabilidad.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando indicadores...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Ingresos (mes)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totals ? totals.revenue.toLocaleString() : "0"} EUR
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Facturas (mes)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totals ? totals.invoices.toLocaleString() : "0"}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Gastos (mes)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totals ? totals.expenses.toLocaleString() : "0"} EUR
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Beneficio (mes)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totals ? totals.profit.toLocaleString() : "0"} EUR
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/admin/users"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ir a usuarios
        </Link>
        <Link
          href="/dashboard/admin/tenants"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ir a empresas
        </Link>
        <Link
          href="/dashboard/admin/accounting"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ir a contabilidad
        </Link>
      </div>
    </main>
  );
}
