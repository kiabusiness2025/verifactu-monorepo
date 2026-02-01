'use client';

import React from 'react';
import { IsaakGreetingCard } from '@/components/isaak/IsaakGreetingCard';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { InsightTicker } from '@/components/dashboard/InsightTicker';

export default function Dashboard() {
  // TODO: Obtener actividad real desde API
  const activity: { title: string; time: string }[] = [];

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
          {activity.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">Tu actividad aparecera aqui</p>
            </div>
          ) : (
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
          )}
        </section>
      </div>
    </div>
  );
}
