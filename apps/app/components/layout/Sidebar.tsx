'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/config/nav';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  isDemo?: boolean;
};

export function Sidebar({ isOpen, onClose, isDemo = false }: SidebarProps) {
  const pathname = usePathname() || '';

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 transform border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="safe-top px-4 pt-5">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-soft">
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Verifactu</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Business</div>
            <div className="mt-2 text-xs text-slate-500">Panel de cliente</div>
          </div>
          <div className="mt-4 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold text-slate-900">Menú</span>
            <button
              onClick={onClose}
              className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>
        </div>

        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const targetHref = isDemo ? item.href.replace('/dashboard', '/demo') : item.href;
              const active = pathname === targetHref || pathname.startsWith(targetHref + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={targetHref}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                      active ? 'bg-[#2361d8]/10 text-[#2361d8]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                        active
                          ? 'bg-[#2361d8] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.icon ? (
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <span className="text-[10px] font-semibold">?</span>
                      )}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
