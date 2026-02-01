'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { IsaakUIProvider } from '@/context/IsaakUIContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { navItems } from '@/config/nav';

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <IsaakUIProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
          <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6">
            {children}
          </main>
          <footer className="mt-auto border-t border-slate-200 bg-white/80">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="font-semibold text-slate-800">Verifactu Business</span>
              <div className="flex flex-wrap gap-3 text-xs">
                <a className="hover:text-[#2361d8]" href="/">
                  Ir a Home
                </a>
                <a className="hover:text-[#2361d8]" href="/dashboard/settings">
                  Configuración
                </a>
              </div>
            </div>
          </footer>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-around px-4 py-2">
            {navItems.slice(0, 4).map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${
                    active ? 'text-[#2361d8]' : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
                      active ? 'bg-[#2361d8]/10' : 'bg-slate-100'
                    }`}
                  >
                    {item.icon ? (
                      <item.icon className="h-4 w-4" />
                    ) : (
                      <span className="text-[10px]">?</span>
                    )}
                  </span>
                  <span className="truncate max-w-[72px]">{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>
      </div>
    </IsaakUIProvider>
  );
}
