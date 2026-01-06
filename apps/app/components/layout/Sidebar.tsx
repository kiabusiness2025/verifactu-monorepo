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
      {/* Mobile overlay */}
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
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 lg:hidden">
          <span className="text-sm font-semibold text-slate-900">Menú</span>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base">{item.icon ?? "•"}</span>
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
