"use client";

import React, { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAppUrl, getLandingUrl } from "@/lib/urls";
import { IsaakUIProvider } from "@/context/IsaakUIContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appUrl = getAppUrl();
  const landingUrl = getLandingUrl();
  const loginUrl = `${landingUrl}/auth/login?next=${encodeURIComponent(`${appUrl}/onboarding`)}`;

  return (
    <IsaakUIProvider>
      <div className="app-shell flex min-h-screen bg-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isDemo />
        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <Topbar
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            isDemo
            demoCompanyName="Empresa Demo SL"
          />
          <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 pb-20 sm:px-6 sm:py-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Modo demo
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                      Datos simulados
                    </span>
                  </div>
                  <div>Modo demo (datos simulados). Nada se envia a la AEAT.</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={landingUrl}
                    className="inline-flex items-center gap-2 font-semibold text-amber-900 hover:text-amber-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio
                  </a>
                  <a
                    href={loginUrl}
                    className="inline-flex items-center gap-2 font-semibold text-amber-900 hover:text-amber-700"
                  >
                    Probar con mis datos (1 mes gratis)
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
            {children}
          </main>

          <div className="fixed inset-x-0 bottom-4 z-30 px-4">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <div className="text-sm font-semibold text-[#0b214a]">
                Estas en demo. Listo para usar tu propia empresa?
              </div>
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-[#0056D6] hover:to-[#1AA3DB]"
              >
                Probar con mis datos (1 mes gratis)
              </a>
            </div>
          </div>
        </div>
      </div>
    </IsaakUIProvider>
  );
}
