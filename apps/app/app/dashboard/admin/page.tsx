"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGet, type AccountingData } from "@/lib/adminApi";
import { AdminChat } from "@/components/admin/AdminChat";
import { formatCurrency, formatNumber, formatTime } from "@/src/lib/formatters";

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
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Panel de Administración
        </h1>
        <div className="text-sm text-slate-500">
          {lastCheckedAt && (
            <span>Última actualización: {lastCheckedAt}</span>
          )}
        </div>
      </div>

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
