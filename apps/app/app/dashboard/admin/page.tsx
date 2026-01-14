"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGet, type AccountingData } from "@/lib/adminApi";

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
        const data = await adminGet<AccountingData>("/api/admin/accounting?period=current_month");
        if (mounted) {
          setTotals(data.totals);
          setStatus("ok");
          setLastCheckedAt(
            new Date().toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } catch (error) {
        console.error("Admin overview error:", error);
        if (mounted) setStatus("error");
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
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          status === "ok"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : status === "error"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        {status === "ok" && (
          <span>
            Datos conectados · Última lectura {lastCheckedAt}
          </span>
        )}
        {status === "error" && (
          <span>No pudimos cargar datos. Reintenta en unos segundos.</span>
        )}
        {status === "loading" && <span>Verificando datos...</span>}
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#002060]">Panel admin</h1>
        <p className="text-sm text-slate-600">
          KPIs principales y accesos rápidos a usuarios, empresas y contabilidad.
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
            <div className="mt-1 text-2xl font-semibold text-[#002060]">
              {totals ? totals.revenue.toLocaleString("es-ES") : "0"} €
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Facturas (mes)</div>
            <div className="mt-1 text-2xl font-semibold text-[#002060]">
              {totals ? totals.invoices.toLocaleString("es-ES") : "0"}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Gastos (mes)</div>
            <div className="mt-1 text-2xl font-semibold text-[#002060]">
              {totals ? totals.expenses.toLocaleString("es-ES") : "0"} €
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Beneficio (mes)</div>
            <div className="mt-1 text-2xl font-semibold text-[#002060]">
              {totals ? totals.profit.toLocaleString("es-ES") : "0"} €
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[#002060]">
              Acciones rápidas
            </div>
            <div className="text-xs text-slate-500">
              Gestión operativa para crear y revisar empresas al instante.
            </div>
          </div>
          <Link
            href="/dashboard/admin/companies"
            className="text-xs font-semibold text-[#0060F0] hover:text-[#0080F0]"
          >
            Ver empresas
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/admin/companies/new"
            className="rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-[#0056D6] hover:to-[#1AA3DB]"
          >
            Crear empresa
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="rounded-xl border border-[#0060F0] px-4 py-3 text-sm font-semibold text-[#0060F0] hover:bg-[#0060F0]/10"
          >
            Revisar usuarios
          </Link>
          <Link
            href="/dashboard/admin/accounting"
            className="rounded-xl border border-[#0060F0] px-4 py-3 text-sm font-semibold text-[#0060F0] hover:bg-[#0060F0]/10"
          >
            Ver contabilidad
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/admin/users"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ir a usuarios
        </Link>
        <Link
          href="/dashboard/admin/companies"
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
