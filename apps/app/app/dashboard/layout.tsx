"use client";

import React, { useState, Suspense } from "react";
import { IsaakUIProvider } from "@/context/IsaakUIContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getLandingUrl } from "@/lib/urls";
import { IsaakDrawer } from "@/components/isaak/IsaakDrawer";
import { IsaakSmartFloating } from "@/components/isaak/IsaakSmartFloating";
import { IsaakProactiveBubbles } from "@/components/isaak/IsaakProactiveBubbles";
import { IsaakPreferencesModal } from "@/components/isaak/IsaakPreferencesModal";
import { IsaakDeadlineNotifications } from "@/components/isaak/IsaakDeadlineNotifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const landingUrl = getLandingUrl();

  return (
    <IsaakUIProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} onOpenPreferences={() => setPreferencesOpen(true)} />
          <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
            {children}
          </main>
          <footer className="mt-auto border-t border-slate-200 bg-white/80">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="font-semibold text-slate-800">Verifactu Business</span>
              <div className="flex flex-wrap gap-3 text-xs">
                <a className="hover:text-blue-700" href={landingUrl}>
                  Ir a Home
                </a>
                <a className="hover:text-blue-700" href="/dashboard/settings">
                  Configuración
                </a>
                <button 
                  onClick={() => setPreferencesOpen(true)}
                  className="hover:text-blue-700"
                >
                  Preferencias Isaak
                </button>
              </div>
            </div>
          </footer>
        </div>
        <IsaakDrawer />
        
        {/* Isaak V3: Analytics + History + Voice + Preferences + Deadlines */}
        <Suspense fallback={null}>
          <IsaakSmartFloating />
          <IsaakProactiveBubbles />
          <IsaakDeadlineNotifications />
        </Suspense>

        {/* Preferences Modal */}
        <IsaakPreferencesModal
          isOpen={preferencesOpen}
          onClose={() => setPreferencesOpen(false)}
        />
      </div>
    </IsaakUIProvider>
  );
}
