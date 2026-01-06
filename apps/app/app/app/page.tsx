import React from "react";
import { IsaakGreetingCard } from "@/components/isaak/IsaakGreetingCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { InsightTicker } from "@/components/dashboard/InsightTicker";

const activity = [
  { title: "Factura VF-2040 validada y enviada", time: "Hoy · 09:30" },
  { title: "2 tickets añadidos y ordenados", time: "Hoy · 08:15" },
  { title: "Recordatorio listo", time: "Ayer · 18:20" },
  { title: "Gasto marcado para revisar", time: "Ayer · 16:40" },
  { title: "Calendario actualizado", time: "Lun · 11:05" },
];

export default function AppDashboardPage() {
  return (
    <div className="space-y-6">
      <IsaakGreetingCard />

      <DashboardStats />

      <QuickActions />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <InsightTicker />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Actividad reciente
          </p>
          <div className="mt-3 space-y-2">
            {activity.map((item) => (
              <div
                key={`${item.title}-${item.time}`}
                className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.time}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">OK</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
