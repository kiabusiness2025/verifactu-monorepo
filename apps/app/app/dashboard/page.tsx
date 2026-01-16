import React from "react";
import { IsaakGreetingCard } from "@/components/isaak/IsaakGreetingCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { InsightTicker } from "@/components/dashboard/InsightTicker";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <IsaakGreetingCard />

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Acciones
        </h2>
        <QuickActions />
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Estado
        </h2>
        <DashboardStats />
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Avisos
        </h2>
        <div className="grid gap-4 lg:grid-cols-1">
          <InsightTicker />
        </div>
      </section>
    </div>
  );
}
