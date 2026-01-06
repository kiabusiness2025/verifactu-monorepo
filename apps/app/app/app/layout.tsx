"use client";

import React, { useState } from "react";
import { IsaakUIProvider } from "@/context/IsaakUIContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { IsaakDrawer } from "@/components/isaak/IsaakDrawer";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <IsaakUIProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
          <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
            {children}
          </main>
          <footer className="mt-auto border-t border-slate-200 bg-white/80">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="font-semibold text-slate-800">Verifactu Business</span>
              <div className="flex flex-wrap gap-3 text-xs">
                <a className="hover:text-blue-700" href="/">
                  Ir a Home
                </a>
                <a className="hover:text-blue-700" href="/app/settings">
                  Configuración
                </a>
              </div>
            </div>
          </footer>
        </div>
        <IsaakDrawer />
      </div>
    </IsaakUIProvider>
  );
}
