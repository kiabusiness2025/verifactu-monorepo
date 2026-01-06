"use client";

import React, { useState } from "react";
import { IsaakUIProvider } from "@/context/IsaakUIContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { IsaakDrawer } from "@/components/isaak/IsaakDrawer";

export default function AdminLayout({
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
        </div>
        <IsaakDrawer />
      </div>
    </IsaakUIProvider>
  );
}
