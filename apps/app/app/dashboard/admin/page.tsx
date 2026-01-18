"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGet, type AccountingData } from "@/lib/adminApi";
import { AdminChat } from "@/components/admin/AdminChat";

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
          <span>Datos conectados. Ultima lectura {lastCheckedAt}.</span>
        )}
        {status === "error" && (
          <span>No pudimos cargar datos. Reintenta en unos segundos.</span>
        )}
        {status === "loading" && <span>Verificando datos...</span>}
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0b214a]">Panel admin</h1>
        <p className="text-sm text-slate-600">
          Seguimiento operativo y accesos rapidos a usuarios, empresas y
          contabilidad.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando indicadores...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Ingresos (mes)",
              value: totals ? totals.revenue.toLocaleString("es-ES") : "0",
              unit: "EUR",
              accent: "from-[#0b6cfb] to-[#4cc3ff]",
            },
            {
              label: "Facturas (mes)",
              value: totals ? totals.invoices.toLocaleString("es-ES") : "0",
              unit: "Total",
              accent: "from-[#20c997] to-[#4fe3b3]",
            },
            {
              label: "Gastos (mes)",
              value: totals ? totals.expenses.toLocaleString("es-ES") : "0",
              unit: "EUR",
              accent: "from-[#ff8a3d] to-[#ffb570]",
            },
            {
              label: "Beneficio (mes)",
              value: totals ? totals.profit.toLocaleString("es-ES") : "0",
              unit: "EUR",
              accent: "from-[#ff6b6b] to-[#ffa45c]",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">{item.label}</div>
                <span
                  className={`inline-flex h-6 w-6 rounded-full bg-gradient-to-br ${item.accent}`}
                />
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#0b214a]">
                {item.value}
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                {item.unit}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[#0b214a]">
              Acciones rapidas
            </div>
            <div className="text-xs text-slate-500">
              Gestion operativa para crear y revisar empresas al instante.
            </div>
          </div>
          <Link
            href="/dashboard/admin/companies"
            className="text-xs font-semibold text-[#0b6cfb] hover:text-[#2bb2ff]"
          >
            Ver empresas
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/admin/companies/new"
            className="rounded-xl bg-gradient-to-r from-[#0b6cfb] to-[#2bb2ff] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-[#0a5be0] hover:to-[#1ca3ef]"
          >
            Crear empresa
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="rounded-xl border border-[#0b6cfb] px-4 py-3 text-sm font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/10"
          >
            Revisar usuarios
          </Link>
          <Link
            href="/dashboard/admin/accounting"
            className="rounded-xl border border-[#0b6cfb] px-4 py-3 text-sm font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/10"
          >
            Ver contabilidad
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/dashboard/admin/users", label: "Ir a usuarios" },
          { href: "/dashboard/admin/companies", label: "Ir a empresas" },
          { href: "/dashboard/admin/accounting", label: "Ir a contabilidad" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Chat de Administración */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Asistente de Administración
        </h2>
        <AdminChat />
      </div>
    </main>
  );
}
