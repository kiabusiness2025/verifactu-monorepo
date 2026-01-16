"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/config/nav";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() || "";

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 transform border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="safe-top px-4 pt-5">
          <div className="rounded-2xl bg-gradient-to-br from-[#0b6cfb] via-[#2bb2ff] to-[#20c997] px-4 py-5 text-white shadow-sm">
            <div className="text-xs uppercase tracking-[0.3em] text-white/80">
              Verifactu
            </div>
            <div className="mt-1 text-lg font-semibold">Business</div>
            <div className="mt-2 text-xs text-white/80">
              Panel de control rapido
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold text-slate-900">Menu</span>
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
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-[#0b6cfb]/10 text-[#0b6cfb]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold ${
                        active
                          ? "bg-[#0b6cfb] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {item.icon ?? "??"}
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
