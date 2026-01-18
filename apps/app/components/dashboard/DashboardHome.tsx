"use client";

import React from "react";
import { IsaakGreetingCard } from "@/components/isaak/IsaakGreetingCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { InsightTicker } from "@/components/dashboard/InsightTicker";
import { useDataMode } from "@/src/lib/data/useDataMode";

export function DashboardHome() {
  const dataMode = useDataMode();
  const isDemo = dataMode === "demo";

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
